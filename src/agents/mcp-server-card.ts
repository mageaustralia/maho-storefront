/**
 * Maho Storefront — /.well-known/mcp/server-card.json
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Server card for the Model Context Protocol (MCP) server that exposes
 * this storefront's commerce capabilities to agents.
 *
 * Status: STUB. The card declares the future shape so discovery tools
 * (isitagentready.com, Cloudflare URL Scanner's Agent Readiness check,
 * and agents themselves) can find us. The /mcp endpoint currently
 * returns 503 with a "coming soon" payload; the real server lives in
 * a sibling Worker that's tracked separately (see
 * proposals/agent-readiness-next.md — MCP server work).
 *
 * Once the real server is up, this card stays the same except it'll
 * report `status: "active"` instead of `status: "planned"`.
 */

interface McpServerCardInput {
  origin: string;
  storeName: string;
}

export function generateMcpServerCard({ origin, storeName }: McpServerCardInput): object {
  return {
    // The "card" identity.
    name: `${storeName} MCP Server`,
    version: '0.1.0-stub',
    description:
      'Headless commerce MCP server for ' + storeName + '. ' +
      'Will expose tools to search the catalogue, fetch product details, ' +
      'manage a guest cart, and complete checkout. Currently a stub ' +
      'while the real server is built.',
    status: 'planned',

    // How to reach it.
    endpoint: `${origin}/mcp`,
    transport: 'streamable-http',

    // Auth posture.
    authentication: {
      type: 'none',
      required_for: ['place_order', 'get_customer_orders'],
      notes:
        'Guest browsing and cart operations are unauthenticated. ' +
        'Checkout and customer-history tools will accept an OAuth2 ' +
        'access token issued by the storefront. See ' +
        origin + '/.well-known/oauth-authorization-server',
    },

    // Tool inventory (advisory — the live server publishes the canonical
    // list when it boots). Keeps this card useful even while stubbed.
    planned_tools: [
      { name: 'search_products', auth: false },
      { name: 'get_product', auth: false },
      { name: 'list_categories', auth: false },
      { name: 'get_category', auth: false },
      { name: 'create_cart', auth: false },
      { name: 'add_to_cart', auth: false },
      { name: 'view_cart', auth: false },
      { name: 'apply_coupon', auth: false },
      { name: 'get_shipping_methods', auth: false },
      { name: 'place_order', auth: 'optional' },
    ],

    // Branding for clients that surface this to humans (Claude Desktop /
    // ChatGPT app store style).
    icon: `${origin}/favicon.ico`,

    // Useful pointers.
    documentation: `${origin}/api/docs`,
    privacy_policy: `${origin}/privacy-policy`,
  };
}

/**
 * Stub /mcp body for now. Returns 503 + a structured "coming soon" so
 * tooling can detect we're a known-planned MCP server (not a 404).
 */
export function mcpStubBody({ origin }: { origin: string }): object {
  return {
    error: 'not_yet_available',
    message:
      'This storefront publishes an MCP server card at ' +
      origin +
      '/.well-known/mcp/server-card.json but the server itself is still ' +
      'being built. See the card for the planned tool inventory.',
    server_card: `${origin}/.well-known/mcp/server-card.json`,
  };
}
