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

function mockKV() {
  const m = new Map<string, string>();
  return {
    get: async (_k: string, _t?: string) => null,
    put: async (k: string, v: string) => void m.set(k, v),
    delete: async (k: string) => void m.delete(k),
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
  };
}

function testEnv(overrides: Record<string, unknown> = {}) {
  return {
    CONTENT: mockKV(),
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
});
