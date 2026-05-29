/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Route-level integration tests — exercise the real Worker app via
 * app.request(). These cover the self-contained security/infra routes that
 * don't require seeding KV or the backend, and act as the regression safety net
 * before the larger Phase 3 refactors (route extraction, sync dedup).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from './index';

// Minimal Workers-global stubs so middleware that touches the edge cache /
// fetch doesn't crash under node. The routes under test don't depend on their
// behaviour — they just must exist.
const mockCaches = {
  default: {
    match: async () => undefined,
    put: async () => {},
    delete: async () => false,
  },
};

/** In-memory KV with optional seed. Values are stored as text (as real KV does). */
function mockKV(seed: Record<string, unknown> = {}) {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(seed)) {
    m.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  return {
    _map: m,
    get: async (k: string, typeOrOpts?: unknown) => {
      const raw = m.get(k);
      if (raw == null) return null;
      const type = typeof typeOrOpts === 'string' ? typeOrOpts : (typeOrOpts as { type?: string })?.type;
      return type === 'json' ? JSON.parse(raw) : raw;
    },
    put: async (k: string, v: string) => void m.set(k, typeof v === 'string' ? v : JSON.stringify(v)),
    delete: async (k: string) => void m.delete(k),
    list: async () => ({ keys: [...m.keys()].map((name) => ({ name })), list_complete: true, cacheStatus: null }),
  };
}

function testEnv(overrides: Record<string, unknown> = {}, seed: Record<string, unknown> = {}) {
  return {
    CONTENT: mockKV(seed),
    MAHO_API_URL: 'https://backend.test',
    SYNC_SECRET: 'changeme',
    STORES: JSON.stringify([{ code: 'en', name: 'Test', url: 'https://shop.test' }]),
    ...overrides,
  };
}

const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };

function request(path: string, init?: RequestInit, env = testEnv()) {
  // Use an https origin so the app behaves as it does in production (e.g. HSTS).
  const url = path.startsWith('http') ? path : `https://shop.test${path}`;
  return app.request(url, init, env as never, ctx as never);
}

describe('Worker routes (integration)', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', mockCaches);
    // Fail loudly if a route under test unexpectedly calls the backend.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('unexpected backend fetch'); }));
  });
  afterEach(() => vi.unstubAllGlobals());

  describe('security headers (Phase 1.1)', () => {
    it('sets the always-on headers on responses', async () => {
      const res = await request('/favicon.svg');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=');
    });
  });

  describe('favicon', () => {
    it('serves an SVG favicon', async () => {
      const res = await request('/favicon.svg');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('image/svg+xml');
      expect(await res.text()).toContain('<svg');
    });

    it('returns 204 for /favicon.ico (silences the default probe)', async () => {
      const res = await request('/favicon.ico');
      expect(res.status).toBe(204);
    });
  });

  describe('sync auth fails closed (Phase 0.3)', () => {
    it('rejects /sync with no Authorization', async () => {
      expect((await request('/sync', { method: 'POST' })).status).toBe(401);
    });

    it('rejects /cache/purge with no Authorization', async () => {
      expect((await request('/cache/purge', { method: 'POST' })).status).toBe(401);
    });

    it('rejects a Bearer that matches the placeholder secret (fail-closed)', async () => {
      // SYNC_SECRET="changeme" must never authenticate, even with a matching token.
      const res = await request('/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer changeme' },
      });
      expect(res.status).toBe(401);
    });

    it('rejects a wrong Bearer when a real secret is configured', async () => {
      const res = await request('/sync', { method: 'POST', headers: { Authorization: 'Bearer nope' } },
        testEnv({ SYNC_SECRET: 'a-real-strong-secret' }));
      expect(res.status).toBe(401);
    });
  });

  describe('search suggest', () => {
    it('returns empty results for short queries without hitting the backend', async () => {
      const res = await request('/api/search/suggest?q=a');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ products: [], categories: [], blogPosts: [], cmsPages: [] });
    });
  });

  describe('not found', () => {
    it('returns a 404 for an unmatched non-GET path', async () => {
      const res = await request('/definitely-not-a-route-xyz', { method: 'POST' });
      expect(res.status).toBe(404);
    });
  });

  describe('page rendering (KV-miss fallbacks)', () => {
    it('renders the home page as a complete HTML document', async () => {
      const res = await request('/');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/html');
      const html = await res.text();
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('</head>');
      // Security headers also apply to the rendered page.
      expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    });
  });

  describe('page rendering from seeded KV (catch-all PHASE 1, no backend)', () => {
    it('renders a CMS page from KV', async () => {
      const env = testEnv({}, {
        'en:cms:about': {
          id: 1, identifier: 'about', title: 'About Us', contentHeading: null,
          content: '<p>About content here</p>', metaKeywords: null, metaDescription: null,
          pageLayout: 'one_column', status: '1', createdAt: null, updatedAt: null,
        },
      });
      const res = await request('/about', undefined, env);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('About content here');
      expect(html).toContain('<title>About Us'); // metaTitle falls back to title
    });

    it('renders a category page from KV (empty product set seeded)', async () => {
      const env = testEnv({}, {
        'en:category:women': {
          id: 5, parentId: 2, name: 'Women', menuTitle: null, categoryHeading: null,
          description: null, urlKey: 'women', urlPath: 'women', image: null, level: 2,
          position: 1, isActive: true, includeInMenu: true, productCount: 0, children: [],
          childrenIds: [], path: null, displayMode: null, cmsBlock: null,
          megaMenuDescription: null, metaTitle: null, metaKeywords: null,
          metaDescription: null, pageLayout: null, createdAt: null, updatedAt: null,
        },
        'en:products:category:5:page:1': { products: [], totalItems: 0 },
      });
      const res = await request('/women', undefined, env);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Women');
      expect(html).toContain('</html>');
    });
  });

  describe('agent / discovery routes (src/routes/agents.ts)', () => {
    it('serves /robots.txt', async () => {
      const res = await request('/robots.txt');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/plain');
      expect(await res.text()).toMatch(/User-agent|Sitemap/i);
    });

    it('serves /llms.txt (KV-miss fallback)', async () => {
      const res = await request('/llms.txt');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/plain');
    });

    it('serves /.well-known/api-catalog as JSON', async () => {
      const res = await request('/.well-known/api-catalog');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/json');
    });

    it('/mcp returns a 503 stub', async () => {
      const res = await request('/mcp');
      expect(res.status).toBe(503);
      expect(res.headers.get('Retry-After')).toBeTruthy();
    });
  });

  describe('partial /sync/categories writes + stamps _lastChecked (Phase 3.3)', () => {
    it('stamps _lastChecked on the synced category (no perpetual-stale)', async () => {
      const env = testEnv({ SYNC_SECRET: 'real-secret' });
      // URL-aware backend mock: the categories collection endpoint.
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (String(url).includes('/api/rest/v2/categories')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              member: [{ id: 1, urlKey: 'women', name: 'Women', childrenIds: [], children: [] }],
              totalItems: 1,
            }),
          } as Response;
        }
        throw new Error(`unexpected fetch: ${url}`);
      }));

      const res = await request('/sync/categories?store=en', {
        method: 'POST',
        headers: { Authorization: 'Bearer real-secret' },
      }, env);

      expect(res.status).toBe(200);
      const stored = JSON.parse((env.CONTENT as ReturnType<typeof mockKV>)._map.get('en:category:women')!);
      expect(stored._lastChecked).toBeTypeOf('number');
      expect(stored._lastChecked).toBeGreaterThan(0);
    });
  });
});
