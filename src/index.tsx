/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import { Hono } from 'hono';
import type { Env, Category, Product, StoreConfig, PulseData, CmsPage, Country, BlogPost, BlogCategory, StorefrontStore } from './types';
import { CloudflareKVStore, TrackedKVStore, type ContentStore } from './content-store';
import { ASSET_HASH } from './asset-version';
import { MahoApiClient } from './api-client';
import { setRenderStore, setRenderApiUrl, setRenderPageConfigOverride, getAvailablePageConfigs } from './page-config';
import { Home } from './templates/Home';
import { CategoryPage } from './templates/Category';
import { ProductPage } from './templates/Product';
import { CartPage } from './templates/Cart';
import { SearchResultsPage } from './templates/SearchResults';
import { BlogPage, type BlogPostSummary } from './templates/Blog';
import { BlogPostPage } from './templates/BlogPost';
import { CmsPageTemplate } from './templates/CmsPage';
import { CheckoutPage } from './templates/Checkout';
import { OrderSuccessPage } from './templates/OrderSuccess';
import { LoginPage } from './templates/Login';
import { RegisterPage } from './templates/Register';
import { ForgotPasswordPage } from './templates/ForgotPassword';
import { ResetPasswordPage } from './templates/ResetPassword';
import { AccountPage } from './templates/Account';
import { ContactPage } from './templates/Contact';
import { Layout } from './templates/Layout';
import { Seo } from './templates/components/Seo';
import {
  DEV_COOKIE,
  SESSION_TTL,
  hashToken,
  getSessionFromRequest,
  isPasswordGateActive,
  validatePassword,
  validateDevToken,
  encodeSession,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  createDevTimer,
  type DevSession,
  type DevData,
} from './dev-auth';
import { rewriteContentUrls } from './content-rewriter';

// In-memory cache for store registry from KV
let _storeCache: { stores: StorefrontStore[]; ts: number } | null = null;

// In-memory cache for pulse hash (data version) — refreshed every 30s
let _pulseCache: { hash: string; ts: number } | null = null;
const PULSE_CACHE_TTL = 30_000; // 30 seconds

async function getPulseHash(env: Env): Promise<string> {
  const now = Date.now();
  if (_pulseCache && (now - _pulseCache.ts) < PULSE_CACHE_TTL) {
    return _pulseCache.hash;
  }
  try {
    const store = new CloudflareKVStore(env.CONTENT);
    const pulse = await store.get<PulseData>('pulse');
    const hash = pulse?.hash ?? '';
    _pulseCache = { hash, ts: now };
    return hash;
  } catch {
    return _pulseCache?.hash ?? '';
  }
}

// Reads store registry from KV _stores key, with 60s in-memory cache and env var fallback
async function getStoreRegistry(env: Env): Promise<StorefrontStore[]> {
  if (_storeCache && Date.now() - _storeCache.ts < 60_000) return _storeCache.stores;
  try {
    const raw = await env.CONTENT.get("_stores", "json");
    if (Array.isArray(raw) && raw.length > 0) {
      _storeCache = { stores: raw as StorefrontStore[], ts: Date.now() };
      return raw as StorefrontStore[];
    }
  } catch {}
  // Fallback to env var
  if (env.STORES) {
    try {
      const parsed = JSON.parse(env.STORES);
      _storeCache = { stores: parsed, ts: Date.now() };
      return parsed;
    } catch {}
  }
  return [];
}

// Helper to get current store code from hostname
function getCurrentStoreCode(hostname: string, stores: StorefrontStore[]): string | undefined {
  const store = stores.find(s => {
    try {
      const storeHost = new URL(s.url).hostname;
      return storeHost === hostname;
    } catch {
      return false;
    }
  });
  return store?.code;
}

// Helper to get store context from request
async function getStoreContext(c: any): Promise<{ stores: StorefrontStore[]; currentStoreCode: string | undefined }> {
  const stores = await getStoreRegistry(c.env);
  const hostname = new URL(c.req.url).hostname;
  const currentStoreCode = getCurrentStoreCode(hostname, stores);
  // Set render-time store context BEFORE any JSX evaluation
  setRenderStore(currentStoreCode);
  setRenderApiUrl(getApiUrl(c.env, stores, currentStoreCode));
  // Apply page config override from dev session (preview mode)
  const devSession = c.get('devSession') as DevSession | undefined;
  setRenderPageConfigOverride(devSession?.pageconfig ?? null);
  return { stores, currentStoreCode };
}

// Resolve the API URL for the current store (per-store override or global default)
function getApiUrl(env: Env, stores: StorefrontStore[], storeCode?: string): string {
  if (storeCode) {
    const store = stores.find(s => s.code === storeCode);
    if (store?.apiUrl) return store.apiUrl.replace(/\/+$/, '');
  }
  return env.MAHO_API_URL;
}

function createApiClient(env: Env, stores: StorefrontStore[], storeCode?: string): MahoApiClient {
  return new MahoApiClient(getApiUrl(env, stores, storeCode), storeCode, env.MAHO_API_BASIC_AUTH);
}


// @ts-expect-error — static asset imports handled by wrangler
import styles from '../public/styles.css';
// @ts-expect-error — static asset imports handled by wrangler
import controllers from '../public/controllers.js.txt';

type AppEnv = { Bindings: Env; Variables: { devSession?: DevSession } };
const app = new Hono<AppEnv>();

// Prepend <!DOCTYPE html> to all HTML responses
app.use('*', async (c, next) => {
  await next();
  if (c.res && c.res.headers.get('Content-Type')?.includes('text/html')) {
    const body = await c.res.text();
    c.res = new Response('<!DOCTYPE html>' + body, c.res);
  }
});

// ====== DEV LOGIN / PASSWORD GATE ======

// Routes excluded from the password gate
const GATE_EXCLUDED = new Set([
  '/styles.css', '/controllers.js', '/robots.txt', '/favicon.ico',
  '/sync', '/cache/delete', '/cache/keys', '/cache/purge',
  '/dev/login', '/dev/logout', '/dev/preview',
  '/dev/config', '/dev/tokens',
]);

function isGateExcluded(path: string): boolean {
  return GATE_EXCLUDED.has(path) || path.startsWith('/public/') || path.startsWith('/dev/tokens/') || path.startsWith('/api/') || path.startsWith('/media/') || path.startsWith('/sync/') || path.startsWith('/sitemap');
}

// Password gate page HTML (standalone, no Layout dependency)
function passwordPageHtml(error?: string, returnTo?: string): string {
  // Sanitize returnTo to prevent XSS via attribute injection
  const safeReturnTo = returnTo ? returnTo.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch] || ch)) : '/';

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Store Access</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif}
    .card{background:#16213e;border-radius:12px;padding:2.5rem;width:100%;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,0.3)}
    h1{font-size:1.25rem;margin-bottom:0.25rem}
    p{font-size:0.875rem;color:#999;margin-bottom:1.5rem}
    label{display:block;font-size:0.8rem;font-weight:500;margin-bottom:0.4rem;color:#bbb}
    input{width:100%;padding:0.65rem 0.8rem;border:1px solid #2a2a4a;border-radius:6px;background:#0f3460;color:#e0e0e0;font-size:0.9rem;outline:none;transition:border-color 0.2s}
    input:focus{border-color:#e94560}
    button{width:100%;padding:0.65rem;background:#e94560;color:#fff;border:none;border-radius:6px;font-size:0.9rem;font-weight:600;cursor:pointer;margin-top:1rem;transition:background 0.2s}
    button:hover{background:#c73e54}
    .error{color:#e94560;font-size:0.8rem;margin-top:0.5rem}
  </style>
</head>
<body>
  <div class="card">
    <h1>This store is protected</h1>
    <p>Enter the password to continue.</p>
    <form method="POST" action="/dev/login">
      <input type="hidden" name="return_to" value="${safeReturnTo}" />
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Enter store password" required autofocus />
      ${error ? `<div class="error">${error}</div>` : ''}
      <button type="submit">Enter</button>
    </form>
  </div>
</body>
</html>`;
}

// Middleware: password gate + dev token check
app.use('*', async (c, next) => {
  const env: Env = c.env;

  // Dev login disabled when DEV_SECRET is not set
  if (!env.DEV_SECRET) { await next(); return; }

  const path = new URL(c.req.url).pathname;

  // Skip excluded routes — but still extract session if present (for toolbar auth on /sync etc.)
  if (isGateExcluded(path)) {
    const session = await getSessionFromRequest(c);
    if (session) c.set('devSession', session);
    await next();
    return;
  }

  // Check for ?devtoken= param (token bypass)
  const url = new URL(c.req.url);
  const devtoken = url.searchParams.get('devtoken');
  if (devtoken) {
    const result = await validateDevToken(devtoken, env);
    if (result.valid) {
      const now = Date.now();
      const session: DevSession = {
        tokenHash: result.tokenHash,
        preview: result.permissions.includes('preview'),
        pageconfig: null,
        issued: now,
        expires: now + SESSION_TTL * 1000,
      };
      const cookie = await encodeSession(session, env.DEV_SECRET);
      // Redirect to same URL without devtoken param
      url.searchParams.delete('devtoken');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': url.pathname + url.search,
          'Set-Cookie': setSessionCookie(cookie, url.hostname),
        },
      });
    }
    // Invalid token — fall through to gate check
  }

  // Check existing session cookie
  const session = await getSessionFromRequest(c);
  if (session) {
    // Valid session — store on context for later use (toolbar, preview)
    c.set('devSession', session);
    await next();
    return;
  }

  // Check if password gate is active
  const gateActive = await isPasswordGateActive(env);
  if (!gateActive) {
    // Gate not active — public access allowed
    await next();
    return;
  }

  // No valid session + gate active → show password page
  return c.html(passwordPageHtml(undefined, path));
});

// POST /dev/login — validate password and set session
app.post('/dev/login', async (c) => {
  const env: Env = c.env;
  if (!env.DEV_SECRET) return c.text('Dev login not configured', 500);

  const formData = await c.req.parseBody();
  const password = formData['password'] as string;
  let returnTo = (formData['return_to'] as string) || '/';

  // Sanitize returnTo — must be a relative path to prevent open redirects
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
    returnTo = '/';
  }

  const valid = await validatePassword(password, env);
  if (!valid) {
    return c.html(passwordPageHtml('Incorrect password', returnTo));
  }

  // Create a session (password-based sessions get gate access, not preview by default)
  const now = Date.now();
  const session: DevSession = {
    tokenHash: 'password',
    preview: false,
    pageconfig: null,
    issued: now,
    expires: now + SESSION_TTL * 1000,
  };
  const cookie = await encodeSession(session, env.DEV_SECRET);
  const hostname = new URL(c.req.url).hostname;

  return new Response(null, {
    status: 302,
    headers: {
      'Location': returnTo,
      'Set-Cookie': setSessionCookie(cookie, hostname),
    },
  });
});

// GET /dev/logout — clear session
app.get('/dev/logout', (c) => {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': clearSessionCookie(),
    },
  });
});

// POST /dev/preview — toggle preview mode or switch page config
app.post('/dev/preview', async (c) => {
  const env: Env = c.env;
  if (!env.DEV_SECRET) return c.json({ error: 'Dev login not configured' }, 500);

  const session = await getSessionFromRequest(c);
  if (!session) return c.json({ error: 'Not authenticated' }, 401);

  const body = await c.req.json<{
    preview?: boolean;
    pageconfig?: string | null;
  }>();

  // Update session with new preview state
  const updatedSession: DevSession = {
    ...session,
    preview: body.preview !== undefined ? body.preview : session.preview,
    pageconfig: body.pageconfig !== undefined ? body.pageconfig : session.pageconfig,
  };

  const cookie = await encodeSession(updatedSession, env.DEV_SECRET);
  const hostname = new URL(c.req.url).hostname;

  return new Response(JSON.stringify({ ok: true, preview: updatedSession.preview, pageconfig: updatedSession.pageconfig }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setSessionCookie(cookie, hostname),
    },
  });
});

/** Build DevData for the toolbar — returns null for non-dev visitors (zero overhead). */
function buildDevData(
  c: any,
  timer: ReturnType<typeof createDevTimer>,
  storeCode: string | undefined,
  pageConfig: string | null,
  themeName: string,
): DevData | null {
  const session = c.get('devSession') as DevSession | undefined;
  if (!session) return null;
  // If the route handler is running, edge cache didn't serve it.
  // It's either a MISS (normal) or PREVIEW-BYPASS (dev preview mode).
  const edgeCache = session.preview ? 'PREVIEW-BYPASS' : 'MISS';
  return {
    storeCode,
    pageConfig,
    themeName,
    preview: session.preview,
    edgeCache,
    kvReads: timer.kvReads,
    apiCalls: timer.apiCalls,
    renderMs: timer.getRenderMs(),
    availablePageConfigs: getAvailablePageConfigs(),
    currentPath: new URL(c.req.url).pathname,
  };
}

// ====== CF EDGE CACHE LAYER ======
// Three-tier caching for catalog pages: CF Edge Cache → KV → Origin API
// Only applied to read-only catalog/content pages, NOT cart/checkout/account

function withEdgeCache(ttlSeconds: number) {
  return async (c: any, next: () => Promise<void>) => {
    if (c.req.method !== 'GET') { await next(); return; }

    // Allow cache bypass with ?nocache param (for debugging/testing)
    const url = new URL(c.req.url);
    if (url.searchParams.has('nocache')) {
      await next();
      if (c.res) c.res.headers.set('X-Edge-Cache', 'BYPASS');
      return;
    }

    // Bypass cache for dev preview sessions
    const devSession = c.get('devSession') as DevSession | undefined;
    if (devSession?.preview) {
      await next();
      if (c.res) c.res.headers.set('X-Edge-Cache', 'PREVIEW-BYPASS');
      return;
    }

    // Version tag: ASSET_HASH (code changes) + pulse hash (data changes via sync)
    const pulseHash = await getPulseHash(c.env);
    const versionTag = `${ASSET_HASH}.${pulseHash.slice(0, 8)}`;

    // Browser conditional request: if ETag matches current version, return 304
    const ifNoneMatch = c.req.header('If-None-Match');
    if (ifNoneMatch === `"${versionTag}"`) {
      return new Response(null, {
        status: 304,
        headers: { 'ETag': `"${versionTag}"`, 'X-Edge-Cache': 'NOT-MODIFIED' },
      });
    }

    const cache = caches.default;
    // Include version tag in cache key so deploys AND syncs auto-bust cached HTML
    const cacheUrl = new URL(c.req.url);
    cacheUrl.searchParams.set('_v', versionTag);
    const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

    // Browser cache headers for HTML: cache but always revalidate via ETag
    const browserHeaders = {
      'Cache-Control': 'no-cache',
      'ETag': `"${versionTag}"`,
    };

    // 1. Check CF edge cache (fastest: ~1ms, stays hot at edge PoP)
    const cached = await cache.match(cacheKey);
    if (cached) {
      const response = new Response(cached.body, cached);
      response.headers.set('X-Edge-Cache', 'HIT');
      response.headers.set('Cache-Control', browserHeaders['Cache-Control']);
      response.headers.set('ETag', browserHeaders['ETag']);
      return response;
    }

    // 2. Cache miss → run handler (reads from KV or origin)
    await next();

    // 3. Store successful responses in CF edge cache
    if (c.res && c.res.status === 200) {
      const cloned = c.res.clone();
      const cacheResponse = new Response(cloned.body, {
        status: 200,
        headers: new Headers(cloned.headers),
      });
      // s-maxage for CF edge cache (Cache API), no-cache for browsers
      cacheResponse.headers.set('Cache-Control', `public, s-maxage=${ttlSeconds}`);
      cacheResponse.headers.set('X-Edge-Cache', 'STORED');
      c.executionCtx.waitUntil(cache.put(cacheKey, cacheResponse));
    }

    // Set browser cache headers on the live response
    if (c.res) {
      c.res.headers.set('X-Edge-Cache', 'MISS');
      c.res.headers.set('Cache-Control', browserHeaders['Cache-Control']);
      c.res.headers.set('ETag', browserHeaders['ETag']);
    }
  };
}

// Edge cache TTLs (seconds)
const CACHE_HOME     = 604800;  // 7 days — freshness controller handles staleness
const CACHE_CATEGORY = 604800;  // 7 days
const CACHE_PRODUCT  = 604800;  // 7 days
const CACHE_CMS      = 604800;  // 7 days
const CACHE_BLOG     = 604800;  // 7 days

// ====== RATE LIMITING FOR 404s ======
// Block IPs that repeatedly hit non-existent URLs (bot protection)
const RATE_LIMIT_404_MAX = 30;      // Max 404s per window
const RATE_LIMIT_404_WINDOW = 300;  // 5 minute window (seconds)
const RATE_LIMIT_BLOCK_TTL = 900;   // Block for 15 minutes

async function check404RateLimit(ip: string): Promise<boolean> {
  const cache = caches.default;
  const blockKey = new Request(`https://rate-limit/blocked/${ip}`);

  // Check if IP is currently blocked
  const blocked = await cache.match(blockKey);
  if (blocked) return true; // IP is blocked

  return false;
}

async function increment404Count(ip: string, ctx: ExecutionContext): Promise<void> {
  const cache = caches.default;
  const countKey = new Request(`https://rate-limit/404-count/${ip}`);
  const blockKey = new Request(`https://rate-limit/blocked/${ip}`);

  // Get current count
  const existing = await cache.match(countKey);
  let count = 1;
  if (existing) {
    const data = await existing.json() as { count: number };
    count = data.count + 1;
  }

  // Check if threshold exceeded
  if (count >= RATE_LIMIT_404_MAX) {
    // Block this IP
    const blockResponse = new Response(JSON.stringify({ blocked: true, until: Date.now() + RATE_LIMIT_BLOCK_TTL * 1000 }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${RATE_LIMIT_BLOCK_TTL}` },
    });
    ctx.waitUntil(cache.put(blockKey, blockResponse));
    // Reset count
    ctx.waitUntil(cache.delete(countKey));
    return;
  }

  // Store updated count
  const countResponse = new Response(JSON.stringify({ count }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${RATE_LIMIT_404_WINDOW}` },
  });
  ctx.waitUntil(cache.put(countKey, countResponse));
}

function getClientIP(c: any): string {
  return c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ?? '0.0.0.0';
}

// Static assets — serve inline since CF Workers don't have a filesystem
// Long cache (1 year) since URLs have content-hash cache busting (?v=...)
app.get('/styles.css', (c) => {
  return c.body(styles, 200, { 'Content-Type': 'text/css', 'Cache-Control': 'public, max-age=31536000, immutable' });
});
app.get('/controllers.js', (c) => {
  return c.body(controllers, 200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=31536000, immutable' });
});

// Admin redirect — sends users to the Maho backend admin
app.get('/admin', async (c) => {
  const { stores, currentStoreCode } = await getStoreContext(c);
  const apiUrl = getApiUrl(c.env, stores, currentStoreCode);
  return c.redirect(`${apiUrl}/index.php/admin`, 302);
});

// Backend pass-through routes
// These paths are proxied directly to the Maho backend instead of being
// handled by the storefront. Backend URLs in the response body are rewritten
// to the storefront domain. Add any paths your backend serves that should
// be accessible on the storefront domain (supports Hono wildcard patterns).
const BACKEND_PASSTHROUGH = [
  '/robots.txt',
  '/sitemap.xml',
  '/sitemap/*',        // sitemap index files (sitemap-categories.xml, etc.)
  '/media/feeds/*',    // product/data feeds (JSON, XML, CSV)
];

for (const path of BACKEND_PASSTHROUGH) {
  app.get(path, async (c) => {
    const { stores, currentStoreCode } = await getStoreContext(c);
    const backendUrl = `${getApiUrl(c.env, stores, currentStoreCode)}${c.req.path}`;
    try {
      const headers: Record<string, string> = { 'Accept': c.req.header('Accept') || '*/*' };
      if (c.env.MAHO_API_BASIC_AUTH) {
        headers['Authorization'] = `Basic ${btoa(c.env.MAHO_API_BASIC_AUTH)}`;
      }
      const res = await fetch(backendUrl, { headers });
      if (!res.ok) return c.text('Not found', 404);
      const contentType = res.headers.get('Content-Type') || 'text/plain';
      // Rewrite backend URLs to the storefront's own domain
      const apiUrl = getApiUrl(c.env, stores, currentStoreCode);
      const storefrontUrl = new URL(c.req.url).origin;
      let body = await res.text();
      if (apiUrl !== storefrontUrl) {
        body = body.replaceAll(apiUrl, storefrontUrl);
      }
      return c.body(body, 200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      });
    } catch {
      return c.text('Not found', 404);
    }
  });
}

// Proxy /media/* requests to Maho backend (for CMS images, wysiwyg, etc.)
app.get('/media/*', async (c) => {
  const { stores, currentStoreCode } = await getStoreContext(c);
  const backendUrl = `${getApiUrl(c.env, stores, currentStoreCode)}${c.req.path}`;
  try {
    const headers: Record<string, string> = {};
    if (c.env.MAHO_API_BASIC_AUTH) {
      headers['Authorization'] = `Basic ${btoa(c.env.MAHO_API_BASIC_AUTH)}`;
    }
    const res = await fetch(backendUrl, { headers });
    if (!res.ok) return c.text('Not found', 404);
    const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
    const body = await res.arrayBuffer();
    return c.body(body, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  } catch {
    return c.text('Not found', 404);
  }
});

// Helper to get store essentials from KV
interface FooterPage { identifier: string; title: string; }

async function getStoreData(store: ContentStore, storeCode?: string): Promise<{ config: StoreConfig; categories: Category[]; footerPages: FooterPage[] }> {
  // Use store-prefixed keys if a store code is provided
  const prefix = storeCode ? `${storeCode}:` : '';
  const [config, categories, footerPages] = await Promise.all([
    store.get<StoreConfig>(`${prefix}config`),
    store.get<Category[]>(`${prefix}categories`),
    store.get<FooterPage[]>(`${prefix}footer-pages`),
  ]);
  return {
    config: config ?? {
      id: 'default', storeCode: storeCode || 'default', storeName: 'Maho Store',
      baseCurrencyCode: 'USD', defaultDisplayCurrencyCode: 'USD', locale: 'en_US',
      timezone: 'UTC', weightUnit: 'kgs', baseUrl: '', baseMediaUrl: '',
      allowedCountries: ['US', 'AU', 'GB'], isGuestCheckoutAllowed: true, newsletterEnabled: false,
      wishlistEnabled: false, reviewsEnabled: true, logoUrl: null, logoAlt: null,
      defaultTitle: 'Maho Store', defaultDescription: null, cmsHomePage: 'home',
    },
    categories: categories ?? [],
    footerPages: footerPages ?? [],
  };
}

// Helper to fetch sidebar CMS blocks from KV for layout templates.
// Convention: sidebar-left-{pageType} and sidebar-right-{pageType}
interface SidebarBlocks { left: string | null; right: string | null; }

async function getSidebarBlocks(store: ContentStore, pageType: string, storeCode?: string): Promise<SidebarBlocks> {
  const prefix = storeCode ? `${storeCode}:` : '';
  const [leftBlock, rightBlock] = await Promise.all([
    store.get<{ content: string }>(`${prefix}block:sidebar-left-${pageType}`),
    store.get<{ content: string }>(`${prefix}block:sidebar-right-${pageType}`),
  ]);
  return {
    left: leftBlock?.content ?? null,
    right: rightBlock?.content ?? null,
  };
}

/** Create a KV store, optionally wrapped with dev timer tracking */
function createStore(env: Env, timer: ReturnType<typeof createDevTimer> | null): ContentStore {
  const store = new CloudflareKVStore(env.CONTENT);
  return timer ? new TrackedKVStore(store, timer) : store;
}

// ====== PAGE ROUTES ======

// Home (edge cached 30 min)
app.get('/', withEdgeCache(CACHE_HOME), async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const cmsPrefix = currentStoreCode ? `${currentStoreCode}:` : '';
  // Fetch store data and the default CMS home page in parallel.
  // We can't know the real homePageId until config resolves, so we speculatively fetch 'home'.
  // If cmsHomePage differs we re-fetch below (rare). Sidebars are gated on pageLayout.
  const [{ config, categories }, defaultCmsPage] = await Promise.all([
    getStoreData(store, currentStoreCode),
    store.get<CmsPage>(`${cmsPrefix}cms:home`),
  ]);
  const homePageId = config.cmsHomePage || 'home';
  const cmsPage = homePageId !== 'home' ? await store.get<CmsPage>(`${cmsPrefix}cms:${homePageId}`) : defaultCmsPage;
  const needsSidebars = cmsPage?.pageLayout && !['one_column', 'empty', 'minimal'].includes(cmsPage.pageLayout);
  const sidebars = needsSidebars ? await getSidebarBlocks(store, 'home', currentStoreCode) : { left: null, right: null };
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<Home config={config} categories={categories} cmsPage={cmsPage} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={sidebars.left} sidebarRight={sidebars.right} devData={devData} />);
});

// Cart
app.get('/cart', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<CartPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});


// Cart cross-sell recommendations (fetches from KV based on cart item URL keys)
app.get('/api/cart-recommendations', async (c) => {
  const store = new CloudflareKVStore(c.env.CONTENT);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const apiClient = createApiClient(c.env, stores, currentStoreCode);

  // Accept product IDs from cart items
  const productIds = (c.req.query('ids') ?? '').split(',').filter(Boolean).map(Number).filter(n => n > 0).slice(0, 20);

  if (productIds.length === 0) return c.json({ products: [] });

  // Fetch each product by ID to get its cross-sells
  const seen = new Set<string>();
  const cartSkus = new Set<string>();
  const recommendations: any[] = [];

  // First pass: collect products and their SKUs
  const products: Product[] = [];
  for (const id of productIds) {
    try {
      // Try KV first via sku-index, fall back to API
      const product = await apiClient.fetchProductById(id);
      if (product) {
        products.push(product);
        cartSkus.add(product.sku);
      }
    } catch {}
  }

  // Second pass: gather cross-sell products
  for (const product of products) {
    if (!product.crosssellProducts) continue;
    for (const cs of product.crosssellProducts) {
      if (cs.sku && !seen.has(cs.sku) && !cartSkus.has(cs.sku)) {
        seen.add(cs.sku);
        recommendations.push({
          id: cs.id, sku: cs.sku, name: cs.name, urlKey: cs.urlKey,
          price: cs.price, finalPrice: cs.finalPrice, specialPrice: cs.specialPrice,
          thumbnailUrl: cs.thumbnailUrl, stockStatus: cs.stockStatus,
        });
      }
    }
    if (recommendations.length >= 12) break;
  }

  return c.json({ products: recommendations.slice(0, 12) });
});


// API proxy — forwards client-side API calls to the backend
// This is essential when the backend requires basic auth (e.g. dev sites)
// or when CORS prevents direct browser→backend requests.
// When MAHO_API_URL is set to '' on the client, all /api/* calls route here.
app.all('/api/*', async (c) => {
  const { stores, currentStoreCode } = await getStoreContext(c);
  const apiUrl = getApiUrl(c.env, stores, currentStoreCode);
  const path = c.req.path;

  // Build the target URL preserving path and query string
  const url = new URL(c.req.url);
  const targetUrl = `${apiUrl}${path}${url.search}`;

  // Forward headers, add auth
  const headers = new Headers();
  headers.set('Accept', c.req.header('Accept') || 'application/ld+json');
  const contentType = c.req.header('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);
  const authHeader = c.req.header('Authorization');
  if (authHeader) headers.set('Authorization', authHeader);

  // Add store code header
  if (currentStoreCode) headers.set('X-Store-Code', currentStoreCode);

  // Add basic auth if configured (for dev/staging backends)
  if (c.env.MAHO_API_BASIC_AUTH && !authHeader) {
    headers.set('Authorization', `Basic ${btoa(c.env.MAHO_API_BASIC_AUTH)}`);
  }

  // Forward the request body for non-GET methods
  const method = c.req.method;
  const body = method !== 'GET' && method !== 'HEAD' ? await c.req.raw.clone().arrayBuffer() : undefined;

  const response = await fetch(targetUrl, { method, headers, body });

  // Return the response with CORS headers for the browser
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
});


// Search
app.get('/search', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const query = c.req.query('q') ?? '';
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const itemsPerPage = 24;
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;

  if (!query) {
    return c.html(
      <SearchResultsPage config={config} categories={categories} query="" products={[]} totalItems={0} currentPage={1} totalPages={0} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />
    );
  }

  // Live search against Maho API
  const searchApiClient = createApiClient(c.env, stores, currentStoreCode);
  try {
    const data = await searchApiClient.searchProducts(query, page, itemsPerPage);
    const totalPages = Math.ceil(data.totalItems / itemsPerPage);
    return c.html(
      <SearchResultsPage config={config} categories={categories} query={query} products={data.products} totalItems={data.totalItems} currentPage={page} totalPages={totalPages} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />
    );
  } catch {
    return c.html(
      <SearchResultsPage config={config} categories={categories} query={query} products={[]} totalItems={0} currentPage={1} totalPages={0} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />
    );
  }
});

// Blog listing (edge cached 4 hours)
app.get('/blog', withEdgeCache(CACHE_BLOG), async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const blogPrefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const [{ config, categories }, postsRaw, blogCategories] = await Promise.all([
    getStoreData(store, currentStoreCode),
    store.get<any>(`${blogPrefix}blog-posts`),
    store.get<BlogCategory[]>(`${blogPrefix}blog-categories`),
  ]);
  const posts: BlogPostSummary[] = Array.isArray(postsRaw) ? postsRaw : [];
  const lastChecked = (postsRaw as any)?._lastChecked ?? 0;
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<BlogPage config={config} categories={categories} posts={posts} blogCategories={blogCategories ?? []} stores={stores} currentStoreCode={currentStoreCode} lastChecked={lastChecked} sidebarLeft={null} sidebarRight={null} devData={devData} />);
});

app.get('/blog/category/:slug', withEdgeCache(CACHE_BLOG), async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const slug = c.req.param('slug');
  const blogPrefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const [{ config, categories }, postsRaw, blogCategories] = await Promise.all([
    getStoreData(store, currentStoreCode),
    store.get<any>(`${blogPrefix}blog-posts`),
    store.get<BlogCategory[]>(`${blogPrefix}blog-categories`),
  ]);
  const allPosts: BlogPostSummary[] = Array.isArray(postsRaw) ? postsRaw : [];
  const lastChecked = (postsRaw as any)?._lastChecked ?? 0;
  const cats = blogCategories ?? [];
  const activeCategory = cats.find(cat => cat.urlKey === slug) ?? null;
  const posts = activeCategory
    ? allPosts.filter(p => (p.categoryIds ?? []).includes(activeCategory.id))
    : allPosts;
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<BlogPage config={config} categories={categories} posts={posts} blogCategories={cats} activeCategory={activeCategory} stores={stores} currentStoreCode={currentStoreCode} lastChecked={lastChecked} sidebarLeft={null} sidebarRight={null} devData={devData} />);
});

// Blog post detail (edge cached 4 hours)
app.get('/blog/:slug', withEdgeCache(CACHE_BLOG), async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const slug = c.req.param('slug');
  const blogPrefix = currentStoreCode ? `${currentStoreCode}:` : '';

  const [{ config, categories }, blogCategories] = await Promise.all([
    getStoreData(store, currentStoreCode),
    store.get<BlogCategory[]>(`${blogPrefix}blog-categories`),
  ]);

  // Try KV cache first
  let post = await store.get<CmsPage>(`${blogPrefix}blog:${slug}`);

  // Fallback to API if KV cache miss
  if (!post) {
    const apiClient = createApiClient(c.env, stores, currentStoreCode || 'en');
    const fetchedPost = await apiClient.fetchBlogPost(slug);
    if (fetchedPost) {
      // Cache the post in KV for future requests
      c.executionCtx.waitUntil(store.put(`${blogPrefix}blog:${slug}`, fetchedPost as unknown as CmsPage, 86400));
      post = fetchedPost as unknown as CmsPage;
    }
  }

  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;

  if (!post) {
    return c.html(
      <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
        <Seo title={`Not Found | ${config.storeName}`} />
        <div class="not-found"><h1>Post Not Found</h1><p>This blog post doesn't exist.</p><a href="/blog">Back to Blog</a></div>
      </Layout>,
      404
    );
  }

  const postCategories = (blogCategories ?? []).filter(c => (post.categoryIds ?? []).includes(c.id));
  return c.html(<BlogPostPage config={config} categories={categories} post={post} postCategories={postCategories} blogCategories={blogCategories ?? []} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={null} sidebarRight={null} devData={devData} />);
});

// Auth pages
app.get('/login', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<LoginPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

app.get('/register', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<RegisterPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

app.get('/forgot-password', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<ForgotPasswordPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

app.get('/reset-password', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<ResetPasswordPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

// Account
app.get('/account', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const countries = await store.get<Country[]>('countries') ?? [];
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<AccountPage config={config} categories={categories} countries={countries} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

// Contact Us
app.get('/contacts', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<ContactPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

// Checkout
app.get('/checkout', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const countries = await store.get<Country[]>('countries') ?? [];
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<CheckoutPage config={config} categories={categories} countries={countries} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

// Order success
app.get('/order/success', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<OrderSuccessPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

// CMS page route (edge cached 2 hours)
app.get('/page/:identifier', withEdgeCache(CACHE_CMS), async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const identifier = c.req.param('identifier');
  const cmsPrefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const [{ config, categories }, page] = await Promise.all([
    getStoreData(store, currentStoreCode),
    store.get<CmsPage>(`${cmsPrefix}cms:${identifier}`),
  ]);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;

  if (!page) {
    // Try fetching from API on cache miss
    const cmsApiClient = createApiClient(c.env, stores, currentStoreCode);
    try {
      const livePage = await cmsApiClient.fetchCmsPage(identifier);
      if (livePage) {
        await store.put(`${cmsPrefix}cms:${identifier}`, livePage, 86400); // 24h KV TTL
        const needsSidebars = livePage.pageLayout && !['one_column', 'empty', 'minimal'].includes(livePage.pageLayout);
        const sidebars = needsSidebars ? await getSidebarBlocks(store, 'cms', currentStoreCode) : { left: null, right: null };
        return c.html(<CmsPageTemplate config={config} categories={categories} page={livePage} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={sidebars.left} sidebarRight={sidebars.right} devData={devData} />);
      }
    } catch {}

    return c.html(
      <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
        <Seo title={`Not Found | ${config.storeName}`} />
        <div class="not-found"><h1>Page Not Found</h1><p>The page you're looking for doesn't exist.</p><a href="/">Go Home</a></div>
      </Layout>,
      404
    );
  }

  const needsSidebars = page.pageLayout && !['one_column', 'empty', 'minimal'].includes(page.pageLayout);
  const sidebars = needsSidebars ? await getSidebarBlocks(store, 'cms', currentStoreCode) : { left: null, right: null };
  return c.html(<CmsPageTemplate config={config} categories={categories} page={page} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={sidebars.left} sidebarRight={sidebars.right} devData={devData} />);
});

// ====== PULSE ======
app.get('/pulse', async (c) => {
  const store = new CloudflareKVStore(c.env.CONTENT);
  const pulse = await store.get<PulseData>('pulse');
  return c.json(pulse ?? { hash: '', updatedAt: '' });
});

// ====== FRESHNESS: SHOULD-CHECK (edge cache throttle) ======
// Returns { check: true } if no client has checked this key in the last 60s.
// Sets a 60s edge cache entry so subsequent clients skip the API call.
const FRESHNESS_INTERVAL = 60; // seconds

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
const FRESHNESS_ALLOWED_TYPES = ['product:', 'category:', 'cms:', 'blog:', 'blog-posts'];
// Keys may be store-prefixed (e.g. "sv_2:category:audio") — strip prefix before checking
function isFreshnessKeyAllowed(key: string): boolean {
  // Strip store prefix if present (anything before the first known type prefix)
  const stripped = key.includes(':') ? key.replace(/^[^:]+:/, '') : key;
  return FRESHNESS_ALLOWED_TYPES.some(p => key.startsWith(p) || stripped.startsWith(p));
}

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

    // Purge edge cache so the reload gets fresh HTML
    const baseUrl = new URL(c.req.url).origin;
    // blog-posts key maps to /blog page URL
    const strippedKey = body.kvKey.replace(/^[^:]+:/, '');
    if (strippedKey === 'blog-posts' || body.kvKey === 'blog-posts') {
      await caches.default.delete(new Request(`${baseUrl}/blog`));
    } else {
      // Strip store prefix + type prefix to get the URL slug (e.g. "sv_2:category:audio" → "audio")
      const slug = body.kvKey.replace(/^(?:[^:]+:)?(product|category|cms|blog):/, '');
      // Homepage special case: cms:home maps to / not /home
      const urlPath = slug === 'home' ? '/' : `/${slug}`;
      await caches.default.delete(new Request(`${baseUrl}${urlPath}`));
    }

    return c.json({ status: 'updated' });
  } catch (e) {
    return c.json({ status: 'error', message: String(e) }, 500);
  }
});


// ====== CACHE UPDATE (browser-initiated KV refresh) ======
const ALLOWED_CACHE_TYPES = ['product:', 'products:', 'category:', 'cms:', 'blog:', 'blog-posts'];

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
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${c.env.SYNC_SECRET}`) return c.json({ error: 'Unauthorized' }, 401);

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

// List KV keys by prefix (auth-protected)
app.get('/cache/keys', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const prefix = c.req.query('prefix') ?? '';
  const store = new CloudflareKVStore(c.env.CONTENT);
  const keys = await store.list(prefix);
  return c.json({ keys, count: keys.length });
});

// ====== AUTH HELPER ======

function checkSyncAuth(c: any): boolean {
  const auth = c.req.header('Authorization');
  if (auth === `Bearer ${c.env.SYNC_SECRET}`) return true;
  // Dev toolbar: authenticated dev session can also sync/purge
  const session = c.get('devSession') as DevSession | undefined;
  return !!session;
}

// ====== DEV CONFIG & TOKEN MANAGEMENT ======

// POST /dev/config — set password gate and storefront password (auth-protected via SYNC_SECRET)
app.post('/dev/config', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{
    passwordGate?: boolean;
    storefrontPassword?: string;
  }>();

  const store = new CloudflareKVStore(c.env.CONTENT);

  if (body.passwordGate !== undefined) {
    await store.put('config:password_gate', body.passwordGate);
  }
  if (body.storefrontPassword !== undefined) {
    await store.put('config:storefront_password', body.storefrontPassword);
  }

  return c.json({ ok: true });
});

// POST /dev/tokens — create a dev token (auth-protected via SYNC_SECRET)
app.post('/dev/tokens', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);
  const env: Env = c.env;
  if (!env.DEV_SECRET) return c.json({ error: 'DEV_SECRET not configured' }, 500);

  const body = await c.req.json<{
    label: string;
    permissions?: string[];
    expiresInDays?: number;
  }>();

  // Generate a random token
  const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const tokenHash = await hashToken(rawToken, env.DEV_SECRET);

  const store = new CloudflareKVStore(c.env.CONTENT);
  const now = new Date();
  const expires = new Date(now.getTime() + (body.expiresInDays || 30) * 24 * 60 * 60 * 1000);

  await store.put(`dev:token:${tokenHash}`, {
    label: body.label,
    created: now.toISOString(),
    expires: expires.toISOString(),
    permissions: body.permissions || ['gate', 'preview'],
  });

  return c.json({
    token: rawToken,
    hash: tokenHash,
    label: body.label,
    expires: expires.toISOString(),
  });
});

// DELETE /dev/tokens/:hash — revoke a dev token (auth-protected via SYNC_SECRET)
app.delete('/dev/tokens/:hash', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const hash = c.req.param('hash');
  const store = new CloudflareKVStore(c.env.CONTENT);
  await store.delete(`dev:token:${hash}`);

  return c.json({ ok: true, deleted: hash });
});

// GET /dev/tokens — list all dev tokens (auth-protected via SYNC_SECRET)
app.get('/dev/tokens', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const store = new CloudflareKVStore(c.env.CONTENT);
  const keys = await store.list('dev:token:');
  const tokens = [];

  for (const key of keys) {
    const data = await store.get(key) as Record<string, unknown> | null;
    if (data) tokens.push({ hash: key.replace('dev:token:', ''), ...data });
  }

  return c.json({ tokens });
});

// ====== SYNC ROUTES ======

// Full sync - syncs all stores if STORES is configured
app.post('/sync', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const store = new CloudflareKVStore(c.env.CONTENT);
  const results: Record<string, string> = {};
  const allSyncedCategories: Array<{ urlKey?: string; urlPath?: string }> = [];

  // Get stores to sync
  const stores = await getStoreRegistry(c.env);
  // If single store specified via query param, only sync that one
  const requestedStore = c.req.query('store');
  const storesToSync = requestedStore
    ? stores.filter(s => s.code === requestedStore).map(s => s.code)
    : (stores.length > 0 ? stores.map(s => s.code) : [undefined as unknown as string]);

  for (const storeCode of storesToSync) {
    const prefix = storeCode ? `${storeCode}:` : '';
    const storeApiClient = createApiClient(c.env, stores, storeCode);

    try {
      // 1. Sync store config
      const config = await storeApiClient.fetchStoreConfig();
      await store.put(`${prefix}config`, config);
      results[`${storeCode || 'default'}:config`] = 'ok';

      // 2. Sync categories (collection endpoint returns children:[], so fetch individually for those with childrenIds)
      const categories = await storeApiClient.fetchCategories();
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        if (cat.id && cat.childrenIds && cat.childrenIds.length > 0) {
          try {
            const fullCat = await storeApiClient.fetchCategoryById(cat.id);
            categories[i] = fullCat;
          } catch {}
        }
      }
      await store.put(`${prefix}categories`, categories);

      const catTimestamp = Math.floor(Date.now() / 1000);
      for (const cat of categories) {
        (cat as any)._lastChecked = catTimestamp;
        if (cat.urlKey) {
          await store.put(`${prefix}category:${cat.urlKey}`, cat);
        }
        if (cat.children) {
          for (const child of cat.children) {
            (child as any)._lastChecked = catTimestamp;
            if (child.urlKey) {
              await store.put(`${prefix}category:${child.urlKey}`, child);
            }
            if (child.urlPath) {
              await store.put(`${prefix}category:${child.urlPath}`, child);
            }
          }
        }
      }
      results[`${storeCode || 'default'}:categories`] = `${categories.length} synced`;

      // Footer pages placeholder (populated below after products)

      // 3. Sync category product listings (per store - products vary by website)
      let storeProductCount = 0;
      const allCategories = [...categories];
      for (const cat of categories) {
        if (cat.children) {
          allCategories.push(...cat.children);
        }
      }
      allSyncedCategories.push(...allCategories);

      for (const cat of allCategories) {
        if (!cat.id) continue;
        try {
          const data = await storeApiClient.fetchCategoryProducts(cat.id, 1, 24);
          await store.put(`${prefix}products:category:${cat.id}:page:1`, data);
          storeProductCount += data.products.length;

          const totalPages = Math.ceil(data.totalItems / 24);
          for (let pg = 2; pg <= Math.min(totalPages, 3); pg++) {
            const pageData = await storeApiClient.fetchCategoryProducts(cat.id, pg, 24);
            await store.put(`${prefix}products:category:${cat.id}:page:${pg}`, pageData);
            storeProductCount += pageData.products.length;
          }
        } catch (e) {
          results[`${storeCode || 'default'}:category:${cat.id}`] = `error: ${(e as Error).message}`;
        }
      }
      results[`${storeCode || 'default'}:products`] = `${storeProductCount} in category listings`;

      // 4. Sync blog categories + posts (per store)
      try {
        const blogCategories = await storeApiClient.fetchBlogCategories();
        await store.put(`${prefix}blog-categories`, blogCategories);
        results[`${storeCode || 'default'}:blogCategories`] = `${blogCategories.length} synced`;
      } catch (e) {
        results[`${storeCode || 'default'}:blogCategories`] = `error: ${(e as Error).message}`;
      }

      try {
        const blogTimestamp = Math.floor(Date.now() / 1000);
        const blogPosts = await storeApiClient.fetchBlogPosts();
        const summaries = blogPosts.map(p => ({
          identifier: p.urlKey,
          title: p.title,
          shortContent: p.excerpt,
          imageUrl: p.imageUrl,
          createdAt: p.publishDate ?? p.createdAt,
          categoryIds: p.categoryIds ?? [],
        }));
        await store.put(`${prefix}blog-posts`, summaries);
        for (const post of blogPosts) {
          const detail: CmsPage = {
            id: post.id,
            identifier: post.urlKey,
            title: post.title,
            contentHeading: post.title,
            content: post.content,
            imageUrl: post.imageUrl,
            metaKeywords: post.metaKeywords,
            metaDescription: post.metaDescription,
            status: post.status,
            createdAt: post.publishDate ?? post.createdAt,
            updatedAt: post.updatedAt,
            categoryIds: post.categoryIds ?? [],
          };
          (detail as any)._lastChecked = blogTimestamp;
          await store.put(`${prefix}blog:${post.urlKey}`, detail);
        }
        results[`${storeCode || 'default'}:blogPosts`] = `${blogPosts.length} synced`;
      } catch (e) {
        results[`${storeCode || 'default'}:blogPosts`] = `error: ${(e as Error).message}`;
      }

      // 5. Sync CMS pages (per store - pages are assigned to specific stores)
      try {
        const cmsTimestamp = Math.floor(Date.now() / 1000);
        const cmsPages = await storeApiClient.fetchAllCmsPages();
        for (const page of cmsPages) {
          (page as any)._lastChecked = cmsTimestamp;
          await store.put(`${prefix}cms:${page.identifier}`, page);
        }
        const pageList = cmsPages
          .filter(p => p.status === 'enabled' && !['no-route', 'service-unavailable', 'enable-cookies', 'home'].includes(p.identifier))
          .map(p => ({ identifier: p.identifier, title: p.title }));
        await store.put(`${prefix}footer-pages`, pageList);
        results[`${storeCode || 'default'}:cmsPages`] = `${cmsPages.length} synced`;
      } catch (e) {
        results[`${storeCode || 'default'}:cmsPages`] = `error: ${(e as Error).message}`;
      }

      // 5b. Sync sidebar CMS blocks (convention: sidebar-left-{pageType}, sidebar-right-{pageType})
      try {
        const sidebarBlockIds = ['sidebar-left-home', 'sidebar-right-home', 'sidebar-left-cms', 'sidebar-right-cms', 'sidebar-left-blog', 'sidebar-right-blog', 'sidebar-left-category', 'sidebar-right-category'];
        let sidebarCount = 0;
        for (const blockId of sidebarBlockIds) {
          try {
            const block = await storeApiClient.fetchCmsBlock(blockId);
            if (block && block.content) {
              await store.put(`${prefix}block:${blockId}`, { content: block.content });
              sidebarCount++;
            }
          } catch {
            // Block doesn't exist — that's fine, not all page types need sidebars
          }
        }
        results[`${storeCode || 'default'}:sidebarBlocks`] = `${sidebarCount} synced`;
      } catch (e) {
        results[`${storeCode || 'default'}:sidebarBlocks`] = `error: ${(e as Error).message}`;
      }

      // 5c. Sync category featured CMS blocks (convention: {category-urlKey}-featured)
      try {
        const catTree = await store.get<Category[]>(`${prefix}categories`);
        let featuredCount = 0;
        if (catTree) {
          const allCats: Category[] = [];
          const flatten = (cats: Category[]) => { for (const c of cats) { allCats.push(c); if (c.children) flatten(c.children); } };
          flatten(catTree);
          for (const cat of allCats) {
            if (!cat.urlKey || cat.level < 2) continue;
            const blockId = `${cat.urlKey}-featured`;
            try {
              const block = await storeApiClient.fetchCmsBlock(blockId);
              if (block && block.content) {
                await store.put(`${prefix}block:${blockId}`, { content: block.content });
                featuredCount++;
              }
            } catch {
              // Block doesn't exist for this category — expected
            }
          }
        }
        results[`${storeCode || 'default'}:featuredBlocks`] = `${featuredCount} synced`;
      } catch (e) {
        results[`${storeCode || 'default'}:featuredBlocks`] = `error: ${(e as Error).message}`;
      }

    } catch (e) {
      results[`${storeCode || 'default'}:error`] = (e as Error).message;
    }
  }

  // Sync shared data that doesn't vary by store view
  const defaultApiClient = new MahoApiClient(c.env.MAHO_API_URL, undefined, c.env.MAHO_API_BASIC_AUTH);

  try {

    // 6. Sync countries
    try {
      const countries = await defaultApiClient.fetchCountries();
      await store.put('countries', countries);
      results.countries = `${countries.length} synced`;
    } catch (e) {
      results.countries = `error: ${(e as Error).message}`;
    }

    // 7. Update pulse hash
    const data = new TextEncoder().encode(JSON.stringify({ ts: Date.now() }));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
    await store.put('pulse', { hash, updatedAt: new Date().toISOString() });
    results.pulse = hash;

    // 8. Purge CF edge cache for this PoP (content just changed)
    try {
      const cache = caches.default;
      const baseUrl = new URL(c.req.url).origin;
      // Purge home page (most important to refresh quickly)
      await cache.delete(new Request(`${baseUrl}/`));
      // Purge category/blog listing pages
      await cache.delete(new Request(`${baseUrl}/blog`));
      for (const cat of allSyncedCategories) {
        if (cat.urlKey) await cache.delete(new Request(`${baseUrl}/${cat.urlKey}`));
        if (cat.urlPath) await cache.delete(new Request(`${baseUrl}/${cat.urlPath}`));
      }
      results.edgeCachePurge = 'ok';
    } catch (e) {
      results.edgeCachePurge = `error: ${(e as Error).message}`;
    }

    return c.json({ status: 'ok', results });
  } catch (e) {
    return c.json({ status: 'error', message: (e as Error).message, results }, 500);
  }
});

// Partial sync
app.post('/sync/:type', async (c) => {
  if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const type = c.req.param('type');
  const store = new CloudflareKVStore(c.env.CONTENT);
  const requestedStore = c.req.query('store');
  const prefix = requestedStore ? `${requestedStore}:` : '';
  const registeredStores = await getStoreRegistry(c.env);
  const partialApiClient = createApiClient(c.env, registeredStores, requestedStore || undefined);

  try {
    switch (type) {
      case 'config': {
        const config = await partialApiClient.fetchStoreConfig();
        await store.put(`${prefix}config`, config);
        return c.json({ status: 'ok', type: 'config' });
      }
      case 'categories': {
        const categories = await partialApiClient.fetchCategories();
        for (let i = 0; i < categories.length; i++) {
          const cat = categories[i];
          if (cat.id && cat.childrenIds && cat.childrenIds.length > 0) {
            try {
              const fullCat = await partialApiClient.fetchCategoryById(cat.id);
              categories[i] = fullCat;
            } catch {}
          }
        }
        await store.put(`${prefix}categories`, categories);
        for (const cat of categories) {
          if (cat.urlKey) await store.put(`${prefix}category:${cat.urlKey}`, cat);
          if (cat.children) {
            for (const child of cat.children) {
              if (child.urlKey) await store.put(`${prefix}category:${child.urlKey}`, child);
              if (child.urlPath) await store.put(`${prefix}category:${child.urlPath}`, child);
            }
          }
        }
        return c.json({ status: 'ok', type: 'categories', count: categories.length });
      }
      case 'product-details': {
        // Accepts pre-fetched full product data from the origin server
        const body = await c.req.json<{ products: Product[] }>();
        const products = body.products ?? [];
        let count = 0;
        for (const product of products) {
          if (product.urlKey) {
            await store.put(`${prefix}product:${product.urlKey}`, product);
            count++;
          }
        }
        return c.json({ status: 'ok', type: 'product-details', count });
      }
      case 'cms': {
        const cmsTimestamp = Math.floor(Date.now() / 1000);
        const cmsPages = await partialApiClient.fetchAllCmsPages();
        for (const page of cmsPages) {
          (page as any)._lastChecked = cmsTimestamp;
          await store.put(`${prefix}cms:${page.identifier}`, page);
        }
        const pageList = cmsPages
          .filter(p => p.status === 'enabled' && !['no-route', 'service-unavailable', 'enable-cookies', 'home'].includes(p.identifier))
          .map(p => ({ identifier: p.identifier, title: p.title }));
        await store.put(`${prefix}footer-pages`, pageList);
        const baseUrl = new URL(c.req.url).origin;
        await caches.default.delete(new Request(`${baseUrl}/`));
        return c.json({ status: 'ok', type: 'cms', count: cmsPages.length });
      }
      case 'products': {
        // Sync category product listings (same logic as full sync)
        const categories = await partialApiClient.fetchCategories();
        for (let i = 0; i < categories.length; i++) {
          const cat = categories[i];
          if (cat.id && cat.childrenIds && cat.childrenIds.length > 0) {
            try { categories[i] = await partialApiClient.fetchCategoryById(cat.id); } catch {}
          }
        }
        const allCats = [...categories];
        for (const cat of categories) {
          if (cat.children) allCats.push(...cat.children);
        }
        let productCount = 0;
        for (const cat of allCats) {
          if (!cat.id) continue;
          try {
            const data = await partialApiClient.fetchCategoryProducts(cat.id, 1, 24);
            await store.put(`${prefix}products:category:${cat.id}:page:1`, data);
            productCount += data.products.length;
            const totalPages = Math.ceil(data.totalItems / 24);
            for (let pg = 2; pg <= Math.min(totalPages, 3); pg++) {
              const pageData = await partialApiClient.fetchCategoryProducts(cat.id, pg, 24);
              await store.put(`${prefix}products:category:${cat.id}:page:${pg}`, pageData);
              productCount += pageData.products.length;
            }
          } catch {}
        }
        return c.json({ status: 'ok', type: 'products', count: productCount });
      }
      case 'blog': {
        const blogTimestamp = Math.floor(Date.now() / 1000);
        const blogPosts = await partialApiClient.fetchBlogPosts();
        const summaries = blogPosts.map((p: any) => ({
          identifier: p.urlKey, title: p.title, shortContent: p.excerpt,
          imageUrl: p.imageUrl, createdAt: p.publishDate ?? p.createdAt,
          categoryIds: p.categoryIds ?? [],
        }));
        await store.put(`${prefix}blog-posts`, summaries);
        for (const post of blogPosts) {
          const detail = {
            id: post.id, identifier: post.urlKey, title: post.title,
            contentHeading: post.title, content: post.content,
            imageUrl: post.imageUrl, metaKeywords: post.metaKeywords,
            metaDescription: post.metaDescription, status: post.status,
            createdAt: post.publishDate ?? post.createdAt, updatedAt: post.updatedAt,
            categoryIds: post.categoryIds ?? [],
            _lastChecked: blogTimestamp,
          };
          await store.put(`${prefix}blog:${post.urlKey}`, detail);
        }
        return c.json({ status: 'ok', type: 'blog', count: blogPosts.length });
      }
      case 'countries': {
        const defaultSyncClient = new MahoApiClient(c.env.MAHO_API_URL, undefined, c.env.MAHO_API_BASIC_AUTH);
        const countries = await defaultSyncClient.fetchCountries();
        await store.put('countries', countries);
        return c.json({ status: 'ok', type: 'countries', count: countries.length });
      }
      case 'products-by-id': {
        const body = await c.req.json<{ ids: number[] }>();
        const ids = body.ids ?? [];
        let count = 0;
        const skuIndex = await store.get<Record<string, string>>(`${prefix}sku-index`) ?? {};
        for (const id of ids) {
          try {
            const product = await partialApiClient.fetchProductById(id);
            if (product.urlKey) {
              await store.put(`${prefix}product:${product.urlKey}`, product);
              skuIndex[product.sku] = product.urlKey;
              // Also index variant/child SKUs so cart lookups work
              if (product.variants) {
                for (const v of product.variants as any[]) {
                  if (v.sku) skuIndex[v.sku] = product.urlKey;
                }
              }
              count++;
            }
          } catch {}
        }
        await store.put(`${prefix}sku-index`, skuIndex);
        return c.json({ status: 'ok', type: 'products-by-id', count });
      }
      case 'categories-by-id': {
        const catBody = await c.req.json<{ ids: number[] }>();
        const catIds = catBody.ids ?? [];
        let catCount = 0;
        for (const id of catIds) {
          try {
            const cat = await partialApiClient.fetchCategoryById(id);
            if (cat.urlKey) {
              await store.put(`${prefix}category:${cat.urlKey}`, cat);
              catCount++;
            }
            if ((cat as any).urlPath) {
              await store.put(`${prefix}category:${(cat as any).urlPath}`, cat);
            }
          } catch {}
        }
        // Also refresh the full categories list
        const allCats = await partialApiClient.fetchCategories();
        for (let i = 0; i < allCats.length; i++) {
          const ac = allCats[i];
          if (ac.id && ac.childrenIds && ac.childrenIds.length > 0) {
            try { allCats[i] = await partialApiClient.fetchCategoryById(ac.id); } catch {}
          }
        }
        await store.put(`${prefix}categories`, allCats);
        for (const ac of allCats) {
          if (ac.urlKey) await store.put(`${prefix}category:${ac.urlKey}`, ac);
          if (ac.children) {
            for (const child of ac.children) {
              if (child.urlKey) await store.put(`${prefix}category:${child.urlKey}`, child);
              if (child.urlPath) await store.put(`${prefix}category:${child.urlPath}`, child);
            }
          }
        }
        return c.json({ status: 'ok', type: 'categories-by-id', count: catCount });
      }
      default:
        return c.json({ error: `Unknown sync type: ${type}` }, 400);
    }
  } catch (e) {
    return c.json({ status: 'error', message: (e as Error).message }, 500);
  }
});

// ====== URL RESOLVER (must be last) ======

// Subcategory URLs: /men/new-arrivals, /women/shirts etc. (edge cached 2 hours)
app.get('/:parent/:child', withEdgeCache(CACHE_CATEGORY), async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const parentSlug = c.req.param('parent');
  const childSlug = c.req.param('child');
  const urlPath = `${parentSlug}/${childSlug}`;

  const category = await store.get<Category>(`${prefix}category:${urlPath}`) ?? await store.get<Category>(`${prefix}category:${childSlug}`);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  if (!category) {
    return c.html(
      <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
        <Seo title={`Not Found | ${config.storeName}`} />
        <div class="not-found"><h1>Page Not Found</h1><p>The page you're looking for doesn't exist.</p><a href="/">Go Home</a></div>
      </Layout>,
      404
    );
  }

  const page = parseInt(c.req.query('page') ?? '1', 10);
  const itemsPerPage = 12;
  const productsData = await store.get<{ products: Product[]; totalItems: number }>(`${prefix}products:category:${category.id}:page:${page}`);
  const products = productsData?.products?.slice(0, itemsPerPage) ?? [];
  const totalItems = productsData?.totalItems ?? 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Find parent category for breadcrumbs
  const parentCategory = categories.find(c => c.urlKey === parentSlug) ?? null;

  // Convention-based CMS block: {category-urlKey}-featured
  const featuredBlockId = `${category.urlKey}-featured`;
  const featuredBlock = await store.get<{ content: string }>(`${prefix}block:${featuredBlockId}`);

  return c.html(
    <CategoryPage
      config={config}
      categories={categories}
      category={category}
      products={products}
      currentPage={page}
      totalPages={totalPages}
      totalItems={totalItems}
      parentCategory={parentCategory}
      stores={stores}
      currentStoreCode={currentStoreCode}
      featuredBlockHtml={featuredBlock?.content ?? null}
      devData={devData}
    />
  );
});

// Clean URLs: /women → category, /geometric-candle-holders → product, /about → CMS page
// Edge cached 4 hours (product TTL — most common hit; categories/CMS also benefit)
// Uses URL resolver API as fallback when KV is empty
app.get('/:slug', withEdgeCache(CACHE_PRODUCT), async (c) => {
  const clientIP = getClientIP(c);

  // Check rate limit - block IPs that repeatedly hit 404s
  if (await check404RateLimit(clientIP)) {
    return c.text('Too Many Requests', 429);
  }

  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const { config, categories } = await getStoreData(store, currentStoreCode);
  const slug = c.req.param('slug');
  const apiClient = createApiClient(c.env, stores, currentStoreCode);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;

  // Helper to render category page
  const renderCategory = async (category: Category) => {
    const page = parseInt(c.req.query('page') ?? '1', 10);
    const itemsPerPage = 12;
    let productsData = await store.get<{ products: Product[]; totalItems: number }>(`${prefix}products:category:${category.id}:page:${page}`);

    // If no products in KV, fetch from API
    if (!productsData) {
      productsData = await apiClient.fetchCategoryProducts(category.id, page, itemsPerPage);
      if (productsData.products.length > 0) {
        c.executionCtx.waitUntil(store.put(`${prefix}products:category:${category.id}:page:${page}`, productsData, 86400));
      }
    }

    const products = productsData?.products?.slice(0, itemsPerPage) ?? [];
    const totalItems = productsData?.totalItems ?? 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    let parentCategory: Category | null = null;
    if (category.level > 2) {
      parentCategory = categories.find(c => c.children?.some(ch => ch.id === category.id)) ?? null;
    }

    // Convention-based CMS block: {category-urlKey}-featured
    const featuredBlockId = `${category.urlKey}-featured`;
    const featuredBlock = await store.get<{ content: string }>(`${prefix}block:${featuredBlockId}`);

    return c.html(
      <CategoryPage
        config={config} categories={categories} category={category} products={products}
        currentPage={page} totalPages={totalPages} totalItems={totalItems}
        parentCategory={parentCategory} stores={stores} currentStoreCode={currentStoreCode}
        featuredBlockHtml={featuredBlock?.content ?? null}
        devData={devData}
      />
    );
  };

  // Helper to render product page
  const renderProduct = (product: Product) => {
    let productCategory: Category | null = null;
    const productCatId = product.categoryIds?.[0];
    if (productCatId) {
      for (const cat of categories) {
        if (cat.id === productCatId) { productCategory = cat; break; }
        const child = cat.children?.find(ch => ch.id === productCatId);
        if (child) { productCategory = child; break; }
      }
    }
    // Sanitize descriptions — strip unprocessed Magento directives ({{widget ...}}, etc.)
    if (product.description) product.description = rewriteContentUrls(product.description);
    if (product.shortDescription) product.shortDescription = rewriteContentUrls(product.shortDescription);
    return c.html(<ProductPage config={config} categories={categories} product={product} productCategory={productCategory} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
  };

  // ---- PHASE 1: Try KV cache first (fast path) ----

  // Try category from KV
  const category = await store.get<Category>(`${prefix}category:${slug}`);
  if (category) return renderCategory(category);

  // Try product from KV
  const product = await store.get<Product>(`${prefix}product:${slug}`);
  if (product && product.urlKey === slug) return renderProduct(product);

  // Try CMS page from KV
  const cmsPage = await store.get<CmsPage>(`${prefix}cms:${slug}`) ?? await store.get<CmsPage>(`cms:${slug}`);
  if (cmsPage) {
    const needsSidebars = cmsPage.pageLayout && !['one_column', 'empty', 'minimal'].includes(cmsPage.pageLayout);
    const cmsSidebars = needsSidebars ? await getSidebarBlocks(store, 'cms', currentStoreCode) : { left: null, right: null };
    return c.html(<CmsPageTemplate config={config} categories={categories} page={cmsPage} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={cmsSidebars.left} sidebarRight={cmsSidebars.right} devData={devData} />);
  }

  // Try blog post from KV
  const blogPost = await store.get<CmsPage>(`${prefix}blog:${slug}`);
  if (blogPost) {
    return c.html(<BlogPostPage config={config} categories={categories} post={blogPost} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={null} sidebarRight={null} devData={devData} />);
  }

  // ---- PHASE 2: KV miss — use URL resolver API to determine type ----

  const resolved = await apiClient.resolveUrl(slug);

  if (resolved) {
    // Fetch full entity based on type and cache in KV
    if (resolved.type === 'category') {
      const fullCategory = await apiClient.fetchCategoryById(resolved.id);
      if (fullCategory) {
        c.executionCtx.waitUntil(store.put(`${prefix}category:${slug}`, fullCategory, 86400));
        return renderCategory(fullCategory);
      }
    }

    if (resolved.type === 'product') {
      const fullProduct = await apiClient.fetchProductById(resolved.id);
      if (fullProduct) {
        c.executionCtx.waitUntil(store.put(`${prefix}product:${slug}`, fullProduct, 86400));
        return renderProduct(fullProduct);
      }
    }

    if (resolved.type === 'cms_page') {
      const fullCms = await apiClient.fetchCmsPage(resolved.identifier);
      if (fullCms) {
        c.executionCtx.waitUntil(store.put(`${prefix}cms:${slug}`, fullCms, 86400));
        const needsSidebars = fullCms.pageLayout && !['one_column', 'empty', 'minimal'].includes(fullCms.pageLayout);
        const cmsSidebars = needsSidebars ? await getSidebarBlocks(store, 'cms', currentStoreCode) : { left: null, right: null };
        return c.html(<CmsPageTemplate config={config} categories={categories} page={fullCms} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={cmsSidebars.left} sidebarRight={cmsSidebars.right} devData={devData} />);
      }
    }

    if (resolved.type === 'blog_post') {
      const fullBlog = await apiClient.fetchBlogPost(resolved.identifier);
      if (fullBlog) {
        c.executionCtx.waitUntil(store.put(`${prefix}blog:${slug}`, fullBlog as unknown as CmsPage, 86400));
        return c.html(<BlogPostPage config={config} categories={categories} post={fullBlog as unknown as CmsPage} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={null} sidebarRight={null} devData={devData} />);
      }
    }

    if (resolved.type === 'redirect' && resolved.redirectUrl) {
      return c.redirect(resolved.redirectUrl, 301);
    }
  }

  // ---- PHASE 3: 404 — track for rate limiting ----

  increment404Count(clientIP, c.executionCtx);

  return c.html(
    <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
      <Seo title={`Not Found | ${config.storeName}`} />
      <div class="not-found"><h1>Page Not Found</h1><p>The page you're looking for doesn't exist.</p><a href="/">Go Home</a></div>
    </Layout>,
    404
  );
});

export default app;