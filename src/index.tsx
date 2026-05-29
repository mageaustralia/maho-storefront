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
import { securityHeaders } from './middleware/security-headers';
import { MahoApiClient } from './api-client';
import { setRenderStore, setRenderApiUrl, setRenderPageConfigOverride, setRenderImageResize, getAvailablePageConfigs } from './page-config';
import { Home } from './templates/Home';
import { CartPage } from './templates/Cart';
import { SearchResultsPage } from './templates/SearchResults';
import { BlogPage, type BlogPostSummary } from './templates/Blog';
import { BlogPostPage } from './templates/BlogPost';
import { CmsPageTemplate } from './templates/CmsPage';
import { Layout } from './templates/Layout';
import { Seo } from './templates/components/Seo';
import { MarketplacePage } from './templates/Marketplace';
import { MarketplaceExtensionPage } from './templates/MarketplaceExtension';
import {
  mapProductToExtension,
  mapProductToDetail,
} from './marketplace-api';
import { MARKETPLACE_CATEGORY_ID, MARKETPLACE_API_BASE } from './marketplace-helpers';
import {
  DEV_COOKIE,
  SESSION_TTL,
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
import {
  registerFilterablePagesRoutes,
  type MenuData,
} from './plugins/filterable-pages';
import { registerStripeRoutes } from './plugins/stripe';

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
  setRenderImageResize(c.env.USE_CF_IMAGE_RESIZE === '1' || c.env.USE_CF_IMAGE_RESIZE === 'true');
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
  return new MahoApiClient(getApiUrl(env, stores, storeCode), storeCode, env.MAHO_API_BASIC_AUTH, env.WORKER_AUTH);
}


import { registerStaticAssetRoutes } from './routes/static-assets';
import { registerEmbedRoutes } from './routes/embed';
import { registerAgentRoutes } from './routes/agents';
import { registerAccountPageRoutes } from './routes/account-pages';
import { registerUrlResolverRoutes } from './routes/url-resolver';
import { registerCacheOpsRoutes } from './routes/cache-ops';
import { registerDevAdminRoutes } from './routes/dev-admin';
import { registerSyncRoutes } from './sync/routes';

type AppEnv = { Bindings: Env; Variables: { devSession?: DevSession } };
const app = new Hono<AppEnv>();

// Security response headers (clickjacking, nosniff, Referrer-Policy, HSTS, and a
// report-only CSP). Registered first so it wraps every response — including
// cached, proxied, and short-circuited (blocked) ones. See middleware/security-headers.ts.
app.use('*', securityHeaders);

// ====== ATTACK MITIGATION — early reject malicious/Magento-pattern requests ======
// Blocks requests before they touch KV, API proxy, or URL resolver.
// These patterns are never valid storefront URLs.

// File extensions that are never served by the storefront
const BLOCKED_EXTENSIONS = /\.(php|jsp|asp|aspx|cgi|env|git|sql|bak|old|orig|swp|log|ini|yml|yaml|toml|xml|json\.bak)(\?|$|\.js$)/i;

// Magento/OpenMage frontend paths that the headless storefront doesn't serve
const BLOCKED_PATH_PREFIXES = [
  '/checkout/cart/',
  '/checkout/onepage/',
  '/catalogsearch/',
  '/catalog/product_compare/',
  '/catalog/product/view/',
  '/catalog/category/view/',
  '/newsletter/subscriber/',
  '/currency/switch/',
  '/customer/account/',
  '/sendfriend/',
  '/review/product/',
  '/wishlist/',
  '/contacts/index/post',
  '/downloadable/',
  '/paypal/',
  '/persistent/',
  '/reports/',
  '/tag/',
  '/poll/',
  '/rss/',
  '/oauth/',
  '/admin',
  '/js/',
  '/skin/',
  '/get.php',
  '/install.php',
  '/cron.php',
  '/wp-',
  '/xmlrpc',
  '/.env',
  '/.git',
  '/.well-known/security.txt',
];

// Patterns in path or query that indicate injection attempts
const INJECTION_PATTERNS = /(\x22|\x27|\\x22|\\x27|%22|%27|%252527|%2527|select\s*[\(\*]|union\s+select|sleep\s*\(|benchmark\s*\(|concat\s*\(|char\s*\(|0x[0-9a-f]{6,}|\.\.\/)|(\\x22|\\x27)/i;

// Legacy index.php/... URLs — strip index.php and redirect to clean path
// Allows index.php/api/* to work for legacy integrations
app.use('/index.php/*', async (c, next) => {
  const cleanPath = c.req.path.replace(/^\/index\.php/, '') || '/';
  const url = new URL(c.req.url);
  return c.redirect(`${url.origin}${cleanPath}${url.search}`, 301);
});

// Agent-readiness: markdown content negotiation. Detects `Accept: text/markdown`
// or `/index.md` / `*.md` path suffixes, sets c.var.wantsMarkdown for routes
// to branch on, and rewrites the path so the entity router still matches.
import { markdownNegotiation } from './agents/markdown';
app.use('*', markdownNegotiation);

// Agent-readiness: advertise the API catalog via Link header on every response.
// Browsers ignore it; agents that look for `Link: rel="api-catalog"` (RFC 8288 +
// RFC 9727) will find the discovery doc. Catalog itself ships in a follow-up.
app.use('*', async (c, next) => {
  await next();
  c.header('Link', '</.well-known/api-catalog>; rel="api-catalog"', { append: true });
});

// Paths the storefront serves that legitimately end in a blocked
// extension (e.g. /sitemap.xml). Exempt from BLOCKED_EXTENSIONS so we
// don't 404 our own routes.
const BLOCKED_EXTENSIONS_ALLOWLIST = new Set<string>([
  '/sitemap.xml',
]);

app.use('*', async (c, next) => {
  const path = c.req.path;
  const rawUrl = c.req.url;

  // Block suspicious file extensions, with an allowlist for legit
  // storefront-served files (sitemap.xml etc.).
  if (BLOCKED_EXTENSIONS.test(path) && !BLOCKED_EXTENSIONS_ALLOWLIST.has(path)) {
    return c.text('Not Found', 404);
  }

  // Block Magento frontend paths
  const pathLower = path.toLowerCase();
  for (const prefix of BLOCKED_PATH_PREFIXES) {
    if (pathLower.startsWith(prefix)) {
      return c.text('Not Found', 404);
    }
  }

  // Block injection attempts in path or query string
  if (INJECTION_PATTERNS.test(decodeURIComponent(rawUrl).replace(/\+/g, ' '))) {
    return c.text('Bad Request', 400);
  }

  await next();
});

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
  '/styles.css', '/controllers.js', '/embed.js', '/robots.txt', '/favicon.ico',
  '/sync', '/cache/delete', '/cache/keys', '/cache/purge', '/cache/warm-urls',
  '/dev/login', '/dev/logout', '/dev/preview',
  '/dev/config', '/dev/tokens',
  '/pulse',
]);

function isGateExcluded(path: string): boolean {
  return GATE_EXCLUDED.has(path) || path.startsWith('/public/') || path.startsWith('/dev/tokens/') || path.startsWith('/api/') || path.startsWith('/media/') || path.startsWith('/core/index/resize/') || path.startsWith('/skin/') || path.startsWith('/sync/') || path.startsWith('/sitemap') || path.startsWith('/plugins/') || path.startsWith('/embed') || path.startsWith('/.well-known/') || path === '/llms.txt' || path === '/mcp';
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

    // Bypass cache for markdown requests — same URL serves two representations
    // (HTML for humans, markdown for agents) and the cache key is URL-only, so
    // a cached HTML response would clobber the markdown branch. Agent traffic
    // is low-volume and re-renders cheaply from KV anyway.
    if (c.get('wantsMarkdown') as boolean | undefined) {
      await next();
      if (c.res) c.res.headers.set('X-Edge-Cache', 'MD-BYPASS');
      return;
    }

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

    // Browser cache: serve cached page instantly, revalidate in background via ETag.
    // max-age=60: browser uses cached copy for 60s without any network request.
    // stale-while-revalidate=86400: after max-age expires, browser shows stale page
    // instantly while fetching fresh version in the background for next navigation.
    // Combined with the freshness controller (which patches stale DOM in-place),
    // this means revisits are always instant and content self-corrects.
    const browserHeaders = {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=86400',
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
const CACHE_MARKETPLACE = 300;  // 5 minutes — matches the upstream API's public, max-age=300

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

// Generic fixed-window rate limiter backed by the edge cache. Returns true when
// the caller has exceeded `max` requests within `windowSec`. Same mechanism as
// the 404 limiter above; `bucket` namespaces independent limits.
async function rateLimitExceeded(
  bucket: string,
  id: string,
  max: number,
  windowSec: number,
  ctx: ExecutionContext,
): Promise<boolean> {
  const cache = caches.default;
  const key = new Request(`https://rate-limit/${bucket}/${encodeURIComponent(id)}`);
  const existing = await cache.match(key);
  let count = 1;
  if (existing) {
    const data = (await existing.json()) as { count: number };
    count = data.count + 1;
  }
  const res = new Response(JSON.stringify({ count }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${windowSec}` },
  });
  ctx.waitUntil(cache.put(key, res));
  return count > max;
}

// Static assets (CSS/JS bundles, favicon, payment-plugin scripts) — see
// src/routes/static-assets.ts. Served inline since CF Workers have no filesystem.
registerStaticAssetRoutes(app);

// Embed widget routes (/embed-demo, /embed.js, /embed/products) — extracted to src/routes/embed.ts.
registerEmbedRoutes(app, { getStoreContext, createApiClient });

// Admin redirect — sends users to the Maho backend admin
app.get('/admin', async (c) => {
  const { stores, currentStoreCode } = await getStoreContext(c);
  const apiUrl = getApiUrl(c.env, stores, currentStoreCode);
  return c.redirect(`${apiUrl}/index.php/admin`, 302);
});

// Agent-readiness + SEO discovery routes (/llms.txt, /robots.txt, /sitemap.xml,
// /.well-known/*, /mcp) — see src/routes/agents.ts. Store helpers are injected
// since those functions live here in the worker entry.
registerAgentRoutes(app, { getStoreContext, createStore, getStoreData });

// Backend pass-through routes
// These paths are proxied directly to the Maho backend instead of being
// handled by the storefront. Backend URLs in the response body are rewritten
// to the storefront domain. Add any paths your backend serves that should
// be accessible on the storefront domain (supports Hono wildcard patterns).
const BACKEND_PASSTHROUGH = [
  '/sitemap/*',        // sub-sitemaps (sitemap-categories.xml, etc.) — only used by
                        // backends that emit a sitemap-index. Storefront-owned
                        // /sitemap.xml above is preferred.
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
    // Stream the upstream body straight through instead of buffering the whole
    // image into Worker memory with arrayBuffer(). Cloudflare still edge-caches
    // the response per the immutable Cache-Control header.
    return c.body(res.body, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  } catch {
    return c.text('Not found', 404);
  }
});

// Proxy /core/index/resize/* and /skin/* to Maho backend (dynamic image resizing, theme assets)
for (const proxyPath of ['/core/index/resize/*', '/skin/*']) {
  app.get(proxyPath, async (c) => {
    const { stores, currentStoreCode } = await getStoreContext(c);
    const backendUrl = `${getApiUrl(c.env, stores, currentStoreCode)}${c.req.path}${c.req.url.includes('?') ? '?' + c.req.url.split('?')[1] : ''}`;
    try {
      const headers: Record<string, string> = {};
      if (c.env.MAHO_API_BASIC_AUTH) {
        headers['Authorization'] = `Basic ${btoa(c.env.MAHO_API_BASIC_AUTH)}`;
      }
      const res = await fetch(backendUrl, { headers });
      if (!res.ok) return c.text('Not found', 404);
      const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
      // Stream through (see /media/* above) rather than buffering in memory.
      return c.body(res.body, 200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
    } catch {
      return c.text('Not found', 404);
    }
  });
}

// Helper to get store essentials from KV — with in-memory cache (30s TTL)
// Avoids cold-PoP KV latency (~300ms) on every request.
interface FooterPage { identifier: string; title: string; }
type StoreDataCache = { config: StoreConfig; categories: Category[]; footerPages: FooterPage[]; ts: number };
const _storeDataCache: Record<string, StoreDataCache> = {};
const STORE_DATA_TTL = 30_000; // 30 seconds

async function getStoreData(store: ContentStore, storeCode?: string, siteOrigin?: string): Promise<{ config: StoreConfig; categories: Category[]; footerPages: FooterPage[] }> {
  const cacheKey = storeCode || '_default';
  const cached = _storeDataCache[cacheKey];
  if (cached && Date.now() - cached.ts < STORE_DATA_TTL) {
    return { config: cached.config, categories: cached.categories, footerPages: cached.footerPages };
  }

  // Use store-prefixed keys if a store code is provided
  const prefix = storeCode ? `${storeCode}:` : '';
  const [config, categories, footerPages] = await Promise.all([
    store.get<StoreConfig>(`${prefix}config`),
    store.get<Category[]>(`${prefix}categories`),
    store.get<FooterPage[]>(`${prefix}footer-pages`),
  ]);
  const resolved = config ?? {
    id: 'default', storeCode: storeCode || 'default', storeName: 'Maho Store',
    baseCurrencyCode: 'USD', defaultDisplayCurrencyCode: 'USD', defaultCountry: 'US', locale: 'en_US',
    timezone: 'UTC', weightUnit: 'kgs', baseUrl: '', baseMediaUrl: '',
    allowedCountries: ['US', 'AU', 'GB'], isGuestCheckoutAllowed: true, newsletterEnabled: false,
    wishlistEnabled: false, reviewsEnabled: true, logoUrl: null, logoAlt: null,
    defaultTitle: 'Maho Store', defaultDescription: null, cmsHomePage: 'home',
  };
  // Override baseUrl with the storefront's own origin for canonical URLs / OG tags
  if (siteOrigin) {
    resolved.baseUrl = siteOrigin.replace(/\/$/, '');
  }
  // Enrich categories with menu data (brand columns for megamenu dropdowns)
  const resolvedCategories = categories ?? [];
  if (resolvedCategories.length > 0) {
    const menuDataPromises = resolvedCategories
      .filter(cat => cat.id)
      .map(cat => store.get<MenuData>(`${prefix}menu:${cat.id}`).then(md => [cat.id!, md] as const));
    const menuResults = await Promise.all(menuDataPromises);
    for (const [catId, menuData] of menuResults) {
      if (menuData) {
        const cat = resolvedCategories.find(c => c.id === catId);
        if (cat) cat.menuData = menuData;
      }
    }
  }
  const result = {
    config: resolved,
    categories: resolvedCategories,
    footerPages: footerPages ?? [],
  };
  _storeDataCache[cacheKey] = { ...result, ts: Date.now() };
  return result;
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
    getStoreData(store, currentStoreCode, new URL(c.req.url).origin),
    store.get<CmsPage>(`${cmsPrefix}cms:home`),
  ]);
  const homePageId = config.cmsHomePage || 'home';
  const cmsPage = homePageId !== 'home' ? await store.get<CmsPage>(`${cmsPrefix}cms:${homePageId}`) : defaultCmsPage;
  const needsSidebars = cmsPage?.pageLayout && !['one_column', 'empty', 'minimal'].includes(cmsPage.pageLayout);
  const sidebars = needsSidebars ? await getSidebarBlocks(store, 'home', currentStoreCode) : { left: null, right: null };
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;

  if (c.get('wantsMarkdown') as boolean | undefined) {
    const { homeToMarkdown, markdownResponse } = await import('./agents/markdown');
    return markdownResponse(c, homeToMarkdown(config, categories, new URL(c.req.url).origin));
  }

  return c.html(<Home config={config} categories={categories} cmsPage={cmsPage} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={sidebars.left} sidebarRight={sidebars.right} devData={devData} />);
});

// Cart
app.get('/cart', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
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
          typeId: cs.type, hasRequiredOptions: cs.hasRequiredOptions,
        });
      }
    }
    if (recommendations.length >= 12) break;
  }

  return c.json({ products: recommendations.slice(0, 12) });
});


// Stripe PaymentIntent routes — extracted to the Stripe plugin (src/plugins/stripe/).
// Stripe is NOT core; this is the only server-route wiring it needs.
registerStripeRoutes(app, { getStoreContext, getApiUrl, getClientIP, rateLimitExceeded });

// Search suggest — products (via Maho API / Meilisearch) + categories + blog + CMS (from KV)
app.get('/api/search/suggest', async (c) => {
  const query = (c.req.query('q') || '').trim().toLowerCase();
  if (query.length < 2) return c.json({ products: [], categories: [], blogPosts: [], cmsPages: [] });

  const store = createStore(c.env);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const apiClient = createApiClient(c.env, stores, currentStoreCode);

  const [productsRes, categories, blogPosts, cmsPages] = await Promise.all([
    apiClient.searchProducts(query, 1, 6).catch(() => ({ products: [], totalItems: 0 })),
    store.get<Category[]>(`${prefix}categories`),
    store.get<any>(`${prefix}blog-posts`),
    store.get<FooterPage[]>(`${prefix}footer-pages`),
  ]);

  const allCats: Category[] = [];
  for (const cat of (categories || [])) {
    allCats.push(cat);
    if (cat.children) allCats.push(...cat.children);
  }
  const matchedCategories = allCats
    .filter(cat => cat.isActive && cat.includeInMenu && cat.name.toLowerCase().includes(query))
    .slice(0, 5)
    .map(cat => ({ name: cat.name, urlKey: cat.urlPath || cat.urlKey }));

  const posts = Array.isArray(blogPosts) ? blogPosts : [];
  const matchedBlog = posts
    .filter((p: any) => (p.title || '').toLowerCase().includes(query))
    .slice(0, 3)
    .map((p: any) => ({ title: p.title, urlKey: p.urlKey || p.identifier, excerpt: p.excerpt || p.shortContent || null, imageUrl: p.imageUrl || null }));

  const pages = Array.isArray(cmsPages) ? cmsPages : [];
  const matchedCms = pages
    .filter((p: FooterPage) => (p.title || '').toLowerCase().includes(query) && p.identifier !== 'home' && p.identifier !== 'no-route')
    .slice(0, 3)
    .map((p: FooterPage) => ({ title: p.title, identifier: p.identifier }));

  return c.json({
    // searchProducts() already unwraps the Hydra envelope to { products, totalItems },
    // so read it directly — no `.member` fallback / `as any` needed.
    products: productsRes.products,
    totalItems: productsRes.totalItems,
    categories: matchedCategories,
    blogPosts: matchedBlog,
    cmsPages: matchedCms,
  }, 200, { 'Access-Control-Allow-Origin': '*' });
});

// ====== FILTERABLE PAGES PLUGIN ======
// Must be before /api/* proxy so KV-served routes take priority
registerFilterablePagesRoutes(app, {
  getStoreRegistry,
  getStoreContext,
  getApiUrl,
  checkSyncAuth,
});

// API proxy — forwards client-side API calls to the backend
// This is essential when the backend requires basic auth (e.g. dev sites)
// or when CORS prevents direct browser→backend requests.
// When MAHO_API_URL is set to '' on the client, all /api/* calls route here.
app.all('/api/*', async (c) => {
  const { stores, currentStoreCode } = await getStoreContext(c);
  const apiUrl = getApiUrl(c.env, stores, currentStoreCode);
  const path = c.req.path;

  // Build the target URL preserving path and query string.
  // Maho's API Platform endpoints are namespaced under /api/rest/v2 (see
  // mageaustralia/maho commit fd6206b5). The browser still hits the
  // friendlier /api/* path on the Worker; the Worker rewrites to
  // /api/rest/v2/* when proxying to the backend. Skip the rewrite for
  // paths that already include the v2 prefix (so server-side calls that
  // pass through this proxy aren't double-prefixed).
  const url = new URL(c.req.url);
  const backendPath = path.startsWith('/api/rest/v2/')
    ? path
    : '/api/rest/v2/' + path.slice('/api/'.length);
  const targetUrl = `${apiUrl}${backendPath}${url.search}`;

  // Forward headers, add auth
  const headers = new Headers();
  headers.set('Accept', c.req.header('Accept') || 'application/ld+json');
  const contentType = c.req.header('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);
  const authHeader = c.req.header('Authorization');
  if (authHeader) headers.set('Authorization', authHeader);

  // Add store code header
  if (currentStoreCode) headers.set('X-Store-Code', currentStoreCode);

  // Forward client-set custom headers that aren't standard auth.
  // X-Order-Token: one-time per-order access token for the guest order
  // confirmation read at GET /orders/{incrementId}/details.
  const orderToken = c.req.header('X-Order-Token');
  if (orderToken) headers.set('X-Order-Token', orderToken);

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

  // Order verify: strip accountToken from body, set as HttpOnly cookie
  if (path.match(/^\/api\/orders\/[^/]+\/verify$/) && response.status === 200) {
    try {
      const json = await response.json() as Record<string, unknown>;
      const accountToken = json.accountToken as string | undefined;
      delete json.accountToken;
      if (accountToken) {
        responseHeaders.append('Set-Cookie',
          `order_auth_token=${accountToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=600; Path=/api/customers/create-from-order`);
        json.canCreateAccount = true;
      }
      return new Response(JSON.stringify(json), {
        status: response.status,
        headers: responseHeaders,
      });
    } catch {
      // Fall through to default response
    }
  }

  // Create account from order: read cookie, inject token into request body for backend
  if (path === '/api/customers/create-from-order' && method === 'POST') {
    const cookie = c.req.header('Cookie') || '';
    const match = cookie.match(/order_auth_token=([^;]+)/);
    if (match) {
      try {
        const clientBody = await c.req.json() as Record<string, unknown>;
        clientBody.accountToken = decodeURIComponent(match[1]);
        const retryHeaders = new Headers(headers);
        retryHeaders.set('Content-Type', 'application/json');
        const retryResponse = await fetch(targetUrl, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify(clientBody),
        });
        const retryResponseHeaders = new Headers(retryResponse.headers);
        retryResponseHeaders.set('Access-Control-Allow-Origin', '*');
        // Clear the cookie after use
        retryResponseHeaders.append('Set-Cookie',
          'order_auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/api/customers/create-from-order');
        return new Response(retryResponse.body, {
          status: retryResponse.status,
          headers: retryResponseHeaders,
        });
      } catch {
        // Fall through to default response
      }
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
});


// Marketplace — public catalog of Mageaustralia extensions
// Uses a dedicated client always pointed at admin.mageaustralia.com.au — the marketplace
// catalog lives there regardless of which storefront env (demo/staging/prod) is running.
const marketplaceApiClient = new MahoApiClient(MARKETPLACE_API_BASE);

app.get('/marketplace', withEdgeCache(CACHE_MARKETPLACE), async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const [{ config, categories }, { products }] = await Promise.all([
    getStoreData(store, currentStoreCode, new URL(c.req.url).origin),
    marketplaceApiClient.fetchCategoryProducts(MARKETPLACE_CATEGORY_ID, 1, 48),
  ]);
  const extensions = products.map(mapProductToExtension);
  const devData = timer
    ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '')
    : null;
  return c.html(
    <MarketplacePage
      config={config}
      categories={categories}
      extensions={extensions}
      stores={stores}
      currentStoreCode={currentStoreCode}
      devData={devData}
    />
  );
});

app.get('/marketplace/:slug', withEdgeCache(CACHE_MARKETPLACE), async (c) => {
  const slug = c.req.param('slug');
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(
    store,
    currentStoreCode,
    new URL(c.req.url).origin
  );

  // Fetch full product detail by url_key.
  // The marketplace backend (admin.mageaustralia.com.au) returns 503 for ?urlKey= filter,
  // so we use a two-step approach: search → exact match → fetch by ID.
  // For marketplace products SKU equals urlKey, so search by slug finds the right product.
  const { products: searchResults } = await marketplaceApiClient.searchProducts(slug, 1, 10).catch(() => ({ products: [] as Product[] }));
  const listItem = searchResults.find((pr) => pr.urlKey === slug);
  if (!listItem || listItem.id === null) {
    return c.notFound();
  }
  const p = await marketplaceApiClient.fetchProductById(listItem.id).catch(() => null);
  if (!p) {
    return c.notFound();
  }
  const extension = mapProductToDetail(p);

  // Fetch FAQs if the extension has a faqCategory — gracefully returns [] when endpoint is unavailable
  const faqItems = extension.faqCategory
    ? await marketplaceApiClient.fetchFaqs(extension.faqCategory).catch(() => [])
    : [];

  const devData = timer
    ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '')
    : null;
  return c.html(
    <MarketplaceExtensionPage
      config={config}
      categories={categories}
      extension={extension}
      faqItems={faqItems}
      stores={stores}
      currentStoreCode={currentStoreCode}
      devData={devData}
    />
  );
});

app.get('/search', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
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
    getStoreData(store, currentStoreCode, new URL(c.req.url).origin),
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
    getStoreData(store, currentStoreCode, new URL(c.req.url).origin),
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
    getStoreData(store, currentStoreCode, new URL(c.req.url).origin),
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

// Auth / account / contact / checkout / order-success page renders
// (extracted to src/routes/account-pages.tsx — Phase 3.4).
registerAccountPageRoutes(app, { createStore, getStoreContext, getStoreData, buildDevData });

// CMS page route (edge cached 2 hours)
app.get('/page/:identifier', withEdgeCache(CACHE_CMS), async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const identifier = c.req.param('identifier');
  const cmsPrefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const [{ config, categories }, page] = await Promise.all([
    getStoreData(store, currentStoreCode, new URL(c.req.url).origin),
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

// ====== CACHE / FRESHNESS OPS ======
// Extracted to src/routes/cache-ops.ts (Phase 3.4). The shared auth helpers
// (hasValidSyncBearer/checkSyncAuth) and the _pulseCache state stay here.
registerCacheOpsRoutes(app, {
  getStoreRegistry,
  hasValidSyncBearer,
  checkSyncAuth,
  invalidatePulseCache: () => { _pulseCache = null; },
});

// ====== AUTH HELPER ======

/** Constant-time string comparison — avoids leaking the secret via response timing. */
function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Fold the length difference into the accumulator so unequal lengths still fail
  // without an early return (which would itself be a timing signal).
  let diff = ab.length ^ bb.length;
  const max = Math.max(ab.length, bb.length);
  for (let i = 0; i < max; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/**
 * True only when SYNC_SECRET is properly configured AND the request's Bearer
 * token matches it (constant-time). Fails closed: an unset or placeholder
 * secret can never authenticate, so a misconfigured deploy is locked, not open.
 */
function hasValidSyncBearer(c: any): boolean {
  const secret = c.env.SYNC_SECRET as string | undefined;
  if (!secret || secret === 'REPLACE_ME' || secret === 'changeme') return false;
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return constantTimeEqual(auth.slice(7), secret);
}

function checkSyncAuth(c: any): boolean {
  if (hasValidSyncBearer(c)) return true;
  // Dev toolbar: authenticated dev session can also sync/purge
  const session = c.get('devSession') as DevSession | undefined;
  return !!session;
}

// ====== DEV CONFIG & TOKEN MANAGEMENT ======
// Extracted to src/routes/dev-admin.ts (Phase 3.4). The dev *session* routes
// (/dev/login,/logout,/preview) stay above with the password-gate middleware.
registerDevAdminRoutes(app, { checkSyncAuth });

// ====== SYNC ROUTES ======

// Full sync - syncs all stores if STORES is configured
// ====== SYNC ROUTES ======
// Full /sync + partial /sync/:type extracted to src/sync/routes.ts (Phase 3.4).
registerSyncRoutes(app, { checkSyncAuth, getStoreRegistry, createApiClient, getApiUrl });

// ====== URL RESOLVER (must be last) ======
// Catch-all clean-URL resolver — extracted to src/routes/url-resolver.tsx (Phase 3.4).
// MUST stay registered here (last, before the global fallbacks below).
registerUrlResolverRoutes(app, {
  createStore, getStoreContext, getStoreData, buildDevData, createApiClient,
  getSidebarBlocks, check404RateLimit, increment404Count, getClientIP,
  withEdgeCache, cacheCategory: CACHE_CATEGORY, cacheProduct: CACHE_PRODUCT,
});

// ====== GLOBAL ERROR / NOT-FOUND FALLBACKS ======
// Dependency-free: these must render even when the backend or KV is unavailable
// (i.e. when the normal store-data-driven Layout cannot be built). Inline styles
// only — no reliance on public/styles.css or any API call.
function fallbackPageHtml(status: number, heading: string, message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<meta name="robots" content="noindex">` +
    `<title>${heading}</title>` +
    `<style>:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;` +
    `font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7f8;color:#1a1a1a}` +
    `@media(prefers-color-scheme:dark){body{background:#16181d;color:#e7e7e7}}` +
    `.box{text-align:center;padding:2rem;max-width:32rem}.code{font-size:3rem;font-weight:700;opacity:.5;margin:0}` +
    `h1{font-size:1.5rem;margin:.5rem 0}p{opacity:.8;line-height:1.5}a{color:inherit;font-weight:600}</style></head>` +
    `<body><div class="box"><p class="code">${status}</p><h1>${heading}</h1><p>${message}</p>` +
    `<p><a href="/">Return home</a></p></div></body></html>`;
}

app.notFound((c) =>
  c.html(fallbackPageHtml(404, 'Page not found', "The page you're looking for doesn't exist or has moved."), 404),
);

app.onError((err, c) => {
  // Structured-ish log line so Workers logs / logpush can surface the failing route.
  console.error(
    `[worker:error] ${c.req.method} ${new URL(c.req.url).pathname} — ` +
    (err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)),
  );
  return c.html(
    fallbackPageHtml(500, 'Something went wrong', 'We hit a temporary error rendering this page. Please try again shortly.'),
    500,
  );
});

export default app;