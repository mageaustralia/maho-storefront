/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Agent-readiness + SEO discovery routes: /llms.txt, /robots.txt, /sitemap.xml,
 * /.well-known/* (api-catalog, oauth, mcp server-card) and the /mcp stub.
 * Extracted from index.tsx (Phase 3.4) via registerAgentRoutes. The shared
 * store helpers are injected as deps so this module stays decoupled from the
 * worker entry. See src/agents/ for the generators.
 */

import type { Hono } from 'hono';
import type { ContentStore } from '../content-store';
import type { Env, StoreConfig, Category } from '../types';

interface FooterPage {
  identifier: string;
  title: string;
}

export interface AgentRouteDeps {
  getStoreContext: (c: any) => Promise<{ stores: unknown[]; currentStoreCode: string | undefined }>;
  createStore: (env: Env) => ContentStore;
  getStoreData: (
    store: ContentStore,
    storeCode?: string,
    origin?: string,
  ) => Promise<{ config: StoreConfig; categories: Category[]; footerPages: FooterPage[] }>;
}

export function registerAgentRoutes(app: Hono<any>, deps: AgentRouteDeps): void {
  const { getStoreContext, createStore, getStoreData } = deps;

  // /llms.txt — content signals + AI-bot reading list for this store.
  app.get('/llms.txt', async (c) => {
    const { currentStoreCode } = await getStoreContext(c);
    const store = createStore(c.env);
    const origin = new URL(c.req.url).origin;
    const { config, categories, footerPages } = await getStoreData(store, currentStoreCode, origin);
    const { generateLlmsTxt } = await import('../agents/llms-txt');
    const body = generateLlmsTxt({ config, categories, footerPages, origin });
    return c.body(body, 200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
  });

  // /robots.txt — storefront-owned AI-bot rules.
  app.get('/robots.txt', async (c) => {
    const origin = new URL(c.req.url).origin;
    const { generateRobotsTxt } = await import('../agents/robots-txt');
    return c.body(generateRobotsTxt({ origin }), 200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    });
  });

  // /sitemap.xml — generated from KV with <lastmod> per entry.
  app.get('/sitemap.xml', async (c) => {
    const { currentStoreCode } = await getStoreContext(c);
    const store = createStore(c.env);
    const origin = new URL(c.req.url).origin;
    const { generateSitemap } = await import('../agents/sitemap');
    const body = await generateSitemap({ store, origin, storeCode: currentStoreCode });
    return c.body(body, 200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
  });

  // /.well-known/api-catalog (RFC 9727).
  app.get('/.well-known/api-catalog', async (c) => {
    const origin = new URL(c.req.url).origin;
    const { generateApiCatalog } = await import('../agents/api-catalog');
    return c.json(generateApiCatalog({ origin }), 200, { 'Cache-Control': 'public, max-age=3600' });
  });

  // /.well-known/oauth-authorization-server (RFC 8414).
  app.get('/.well-known/oauth-authorization-server', async (c) => {
    const origin = new URL(c.req.url).origin;
    const { generateOAuthDiscovery } = await import('../agents/oauth-discovery');
    return c.json(generateOAuthDiscovery({ origin }), 200, { 'Cache-Control': 'public, max-age=3600' });
  });

  // /.well-known/mcp/server-card.json — MCP server descriptor.
  app.get('/.well-known/mcp/server-card.json', async (c) => {
    const { currentStoreCode } = await getStoreContext(c);
    const store = createStore(c.env);
    const origin = new URL(c.req.url).origin;
    const { config } = await getStoreData(store, currentStoreCode, origin);
    const { generateMcpServerCard } = await import('../agents/mcp-server-card');
    return c.json(generateMcpServerCard({ origin, storeName: config.storeName }), 200, {
      'Cache-Control': 'public, max-age=3600',
    });
  });

  // /mcp — stub (503 + structured "coming soon") until the real MCP Worker ships.
  app.all('/mcp', async (c) => {
    const origin = new URL(c.req.url).origin;
    const { mcpStubBody } = await import('../agents/mcp-server-card');
    return c.json(mcpStubBody({ origin }), 503, { 'Retry-After': '604800', 'Cache-Control': 'public, max-age=300' });
  });
}
