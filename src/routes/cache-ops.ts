/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Cache / freshness operational routes — /pulse, /freshness*, /cache/*.
 * Extracted from index.tsx (Phase 3.4) via registerCacheOpsRoutes. These drive
 * the client-side freshness controller (stale-content detection + in-place KV
 * patching) and the deploy.sh prewarm/purge tooling. The auth-protected ones
 * fail closed via the injected checkSyncAuth/hasValidSyncBearer helpers (those
 * stay in index.tsx since /sync shares them).
 */

import type { Hono } from 'hono';
import { CloudflareKVStore } from '../content-store';
import type { Env, PulseData, StorefrontStore } from '../types';

// Returns { check: true } only if no client has checked this key in the last
// FRESHNESS_INTERVAL seconds (edge-cache throttle), so clients don't stampede.
const FRESHNESS_INTERVAL = 60; // seconds

const FRESHNESS_ALLOWED_TYPES = ['product:', 'category:', 'cms:', 'blog:', 'blog-posts'];
// Keys may be store-prefixed (e.g. "sv_2:category:audio") — strip prefix before checking
function isFreshnessKeyAllowed(key: string): boolean {
  // Strip store prefix if present (anything before the first known type prefix)
  const stripped = key.includes(':') ? key.replace(/^[^:]+:/, '') : key;
  return FRESHNESS_ALLOWED_TYPES.some(p => key.startsWith(p) || stripped.startsWith(p));
}

const ALLOWED_CACHE_TYPES = ['product:', 'products:', 'category:', 'categories', 'cms:', 'blog:', 'blog-posts'];

export interface CacheOpsDeps {
  getStoreRegistry: (env: Env) => Promise<StorefrontStore[]>;
  /** True for a valid SYNC_SECRET Bearer (fail-closed). */
  hasValidSyncBearer: (c: any) => boolean;
  /** Valid sync bearer OR an authenticated dev session. */
  checkSyncAuth: (c: any) => boolean;
  /** Invalidate the in-isolate pulse-hash cache held in index.tsx. */
  invalidatePulseCache: () => void;
}

export function registerCacheOpsRoutes(app: Hono<any>, deps: CacheOpsDeps): void {
  const { getStoreRegistry, hasValidSyncBearer, checkSyncAuth, invalidatePulseCache } = deps;

  // ====== PULSE ======
  app.get('/pulse', async (c) => {
    const store = new CloudflareKVStore(c.env.CONTENT);
    const pulse = await store.get<PulseData>('pulse');
    return c.json(pulse ?? { hash: '', updatedAt: '' });
  });

  // ====== FRESHNESS: SHOULD-CHECK (edge cache throttle) ======
  // Sets a 60s edge cache entry so subsequent clients skip the API call.
  app.get('/freshness/should-check', async (c) => {
    const key = c.req.query('key');
    if (!key) return c.json({ check: false });

    const baseUrl = new URL(c.req.url).origin;
    const cache = caches.default;
    const throttleKey = new Request(`${baseUrl}/_freshness/${key}`);

    const throttled = await cache.match(throttleKey);
    if (throttled) {
      return c.json({ check: false });
    }

    // Set throttle — expires after FRESHNESS_INTERVAL seconds
    c.executionCtx.waitUntil(cache.put(throttleKey, new Response('1', {
      headers: { 'Cache-Control': `public, max-age=${FRESHNESS_INTERVAL}` },
    })));

    return c.json({ check: true });
  });

  // ====== FRESHNESS: CLIENT REPORTS STALE DATA ======
  // Client fetched fresh data from the API proxy, compared it with the rendered
  // page, and found a difference. It sends the fresh data here so we can update
  // KV and purge edge cache, then the client reloads to get the fresh page.
  app.post('/freshness', async (c) => {
    try {
      const body = await c.req.json<{ kvKey: string; data: any }>();
      if (!body.kvKey || !body.data) {
        return c.json({ status: 'error', message: 'Missing kvKey or data' }, 400);
      }
      if (!isFreshnessKeyAllowed(body.kvKey)) {
        return c.json({ status: 'error', message: 'Invalid key prefix' }, 400);
      }

      // Stamp _lastChecked so the next render knows when this was verified
      body.data._lastChecked = Math.floor(Date.now() / 1000);

      const store = new CloudflareKVStore(c.env.CONTENT);
      await store.put(body.kvKey, body.data, 86400);

      // Bust edge cache by updating the pulse hash — this changes versionTag so old cached
      // pages (keyed as ?_v=oldTag) are orphaned and next requests get fresh KV data.
      // caches.default.delete() can't target versioned keys without knowing the tag.
      const pulseData = new TextEncoder().encode(JSON.stringify({ ts: Date.now() }));
      const hashBuffer = await crypto.subtle.digest('SHA-256', pulseData);
      const newHash = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
      await store.put('pulse', { hash: newHash, updatedAt: new Date().toISOString() });
      invalidatePulseCache(); // Invalidate in-memory cache for this isolate

      return c.json({ status: 'updated' });
    } catch (e) {
      return c.json({ status: 'error', message: String(e) }, 500);
    }
  });

  // ====== CACHE UPDATE (browser-initiated KV refresh) ======
  app.post('/cache/update', async (c) => {
    try {
      const body = await c.req.json<{ key: string; data: any }>();
      if (!body.key || !body.data) return c.json({ error: 'Missing key or data' }, 400);

      // Validate key format — only allow known content prefixes
      // Keys may be store-prefixed (e.g. "sv_2:products:category:78:page:1")
      const keyType = body.key.includes(':') ? body.key.replace(/^[^:]+:/, '') : body.key;
      if (!ALLOWED_CACHE_TYPES.some(p => body.key.startsWith(p) || keyType.startsWith(p))) {
        return c.json({ error: 'Invalid key prefix' }, 400);
      }

      const store = new CloudflareKVStore(c.env.CONTENT);

      // Guard the category TREE (`${prefix}categories`): the client freshness
      // controller refreshes it from the flat /api/categories collection, which
      // returns `childrenIds` but `children: []`. Writing that verbatim wipes the
      // header submenu. Merge children back from the existing tree for any parent
      // that has childrenIds but arrived childless — so a freshness refresh can
      // pick up structural changes (renames/moves) without ever losing children.
      if ((body.key === 'categories' || /(^|:)categories$/.test(body.key)) && Array.isArray(body.data)) {
        const existing = await store.get<any[]>(body.key);
        if (Array.isArray(existing) && existing.length) {
          const prevById = new Map(existing.filter(c => c && c.id != null).map(c => [c.id, c]));
          for (const cat of body.data) {
            const hasKids = Array.isArray(cat?.children) && cat.children.length > 0;
            const expectsKids = Array.isArray(cat?.childrenIds) && cat.childrenIds.length > 0;
            if (expectsKids && !hasKids) {
              const prev = prevById.get(cat.id);
              if (prev?.children?.length) cat.children = prev.children;
            }
          }
        }
      }

      await store.put(body.key, body.data, 86400); // 24 hours KV TTL

      // Also purge edge cache for the corresponding page URL
      const baseUrl = new URL(c.req.url).origin;
      const slug = body.key.replace(/^(?:[^:]+:)?(products?|category|cms|blog):/, '');
      c.executionCtx.waitUntil(caches.default.delete(new Request(`${baseUrl}/${slug}`)));

      return c.json({ ok: true, key: body.key });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500);
    }
  });

  // Purge edge cache for specific URLs (auth-protected)
  app.post('/cache/purge', async (c) => {
    if (!hasValidSyncBearer(c)) return c.json({ error: 'Unauthorized' }, 401);

    try {
      const body = await c.req.json<{ urls?: string[]; all?: boolean }>();
      const cache = caches.default;
      const baseUrl = new URL(c.req.url).origin;
      const purged: string[] = [];

      if (body.all) {
        // Can't purge all from Cache API, but we can delete known patterns
        return c.json({ error: 'Use /sync to refresh all data' }, 400);
      }

      if (body.urls?.length) {
        for (const url of body.urls) {
          const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
          await cache.delete(new Request(fullUrl));
          purged.push(fullUrl);
        }
      }

      return c.json({ ok: true, purged });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500);
    }
  });

  // Delete specific KV keys (auth-protected)
  app.post('/cache/delete', async (c) => {
    if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

    try {
      const body = await c.req.json<{ keys: string[] }>();
      if (!body.keys?.length) return c.json({ error: 'Missing keys array' }, 400);

      const store = new CloudflareKVStore(c.env.CONTENT);
      const deleted: string[] = [];

      for (const key of body.keys) {
        await store.delete(key);
        deleted.push(key);
      }

      return c.json({ ok: true, deleted });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500);
    }
  });

  // List all warmable URLs from KV (auth-protected) — used by deploy.sh to prewarm externally
  app.get('/cache/warm-urls', async (c) => {
    if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

    const store = new CloudflareKVStore(c.env.CONTENT);
    const stores = await getStoreRegistry(c.env);
    const urls: string[] = ['/'];

    const storeCodes = stores.length > 0 ? stores.map(s => s.code) : [undefined];
    for (const storeCode of storeCodes) {
      const prefix = storeCode ? `${storeCode}:` : '';

      const [categoryKeys, productKeys, cmsKeys, blogKeys] = await Promise.all([
        store.list(`${prefix}category:`),
        store.list(`${prefix}product:`),
        store.list(`${prefix}cms:`),
        store.list(`${prefix}blog:`),
      ]);

      for (const key of categoryKeys) {
        const slug = key.replace(`${prefix}category:`, '');
        if (slug && !slug.includes(':')) urls.push(`/${slug}`);  // handles both "women" and "women/shirts"
      }
      for (const key of productKeys) {
        const slug = key.replace(`${prefix}product:`, '');
        if (slug && !slug.includes(':')) urls.push(`/${slug}`);
      }
      for (const key of cmsKeys) {
        const slug = key.replace(`${prefix}cms:`, '');
        if (slug && slug !== 'home' && !slug.includes(':')) urls.push(`/page/${slug}`);
      }
      for (const key of blogKeys) {
        const slug = key.replace(`${prefix}blog:`, '');
        if (slug && !slug.includes(':')) urls.push(`/blog/${slug}`);
      }
    }

    urls.push('/blog');
    return c.json({ urls: [...new Set(urls)] });
  });

  // List KV keys by prefix (auth-protected)
  app.get('/cache/keys', async (c) => {
    if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

    const prefix = c.req.query('prefix') ?? '';
    const store = new CloudflareKVStore(c.env.CONTENT);
    const keys = await store.list(prefix);
    return c.json({ keys, count: keys.length });
  });
}
