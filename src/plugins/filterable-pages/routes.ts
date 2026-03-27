/**
 * Maho Storefront — Filterable Pages Plugin
 * Partial sync endpoints + client-side API reads from KV
 *
 * Usage in index.tsx (before the catch-all /:parent/:child routes):
 *   import { registerFilterablePagesRoutes } from './plugins/filterable-pages/routes';
 *   registerFilterablePagesRoutes(app);
 */

import type { Hono } from 'hono';
import type { Env, StorefrontStore } from '../../types';
import type { MenuData, EnrichedFilter, FilterablePage } from './types';
import { CloudflareKVStore, type ContentStore } from '../../content-store';
import { FilterablePagesApi } from './api';
import { syncFilterablePages, syncMenuDataOnly } from './sync';

interface RouteHelpers {
  getStoreRegistry: (env: Env) => Promise<StorefrontStore[]>;
  getStoreContext: (c: any) => Promise<{ stores: StorefrontStore[]; currentStoreCode: string | undefined }>;
  getApiUrl: (env: Env, stores: StorefrontStore[], storeCode?: string) => string;
  checkSyncAuth: (c: any) => boolean;
}

export function registerFilterablePagesRoutes(
  app: Hono<{ Bindings: Env; Variables: any }>,
  helpers: RouteHelpers,
) {
  // ── Partial sync: menu data only ──────────────────────────────────

  app.post('/sync/menu-data', async (c) => {
    if (!helpers.checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

    const store = new CloudflareKVStore(c.env.CONTENT);
    const stores = await helpers.getStoreRegistry(c.env);
    const requestedStore = c.req.query('store');
    const storeCode = requestedStore || undefined;
    const prefix = storeCode ? `${storeCode}:` : '';
    const api = new FilterablePagesApi(
      helpers.getApiUrl(c.env, stores, storeCode),
      storeCode,
      c.env.MAHO_API_BASIC_AUTH,
    );

    const result = await syncMenuDataOnly(api, store, prefix);
    return c.json({ status: 'ok', type: 'menu-data', ...result });
  });

  // ── Client API: menu data from KV ─────────────────────────────────

  app.get('/api/menu-data/:categoryId', async (c) => {
    const store = new CloudflareKVStore(c.env.CONTENT);
    const { currentStoreCode } = await helpers.getStoreContext(c);
    const prefix = currentStoreCode ? `${currentStoreCode}:` : '';

    const menuData = await store.get<MenuData>(`${prefix}menu:${c.req.param('categoryId')}`);
    if (!menuData) return c.json({ error: 'Not found' }, 404);
    return c.json(menuData);
  });

  // ── Client API: enriched filters from KV ──────────────────────────

  app.get('/api/enriched-filters/:categoryId', async (c) => {
    const store = new CloudflareKVStore(c.env.CONTENT);
    const { currentStoreCode } = await helpers.getStoreContext(c);
    const prefix = currentStoreCode ? `${currentStoreCode}:` : '';

    const filters = await store.get<EnrichedFilter[]>(`${prefix}enriched-filters:${c.req.param('categoryId')}`);
    if (!filters) return c.json({ error: 'Not found' }, 404);
    return c.json(filters);
  });

  // ── Client API: filter page content from KV ───────────────────────

  app.get('/api/filter-page/:category/:option', async (c) => {
    const store = new CloudflareKVStore(c.env.CONTENT);
    const { currentStoreCode } = await helpers.getStoreContext(c);
    const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
    const path = `${c.req.param('category')}/${c.req.param('option')}`;

    const page = await store.get<FilterablePage>(`${prefix}filter-page:${path}`);
    if (!page) return c.json({ error: 'Not found' }, 404);
    return c.json(page);
  });
}
