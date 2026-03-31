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
import {
  registerFilterablePagesRoutes,
  FilterablePagesApi,
  syncFilterablePages,
  resolveFilterPage,
  getMenuData,
  FilterPage,
  type MenuData,
} from './plugins/filterable-pages';

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
// @ts-expect-error — static asset imports handled by wrangler
import stripePlugin from '../public/plugins/stripe-payment.js.txt';
// @ts-expect-error — static asset imports handled by wrangler
import embedScript from '../public/embed.js.txt';

type AppEnv = { Bindings: Env; Variables: { devSession?: DevSession } };
const app = new Hono<AppEnv>();

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

app.use('*', async (c, next) => {
  const path = c.req.path;
  const rawUrl = c.req.url;

  // Block suspicious file extensions
  if (BLOCKED_EXTENSIONS.test(path)) {
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
]);

function isGateExcluded(path: string): boolean {
  return GATE_EXCLUDED.has(path) || path.startsWith('/public/') || path.startsWith('/dev/tokens/') || path.startsWith('/api/') || path.startsWith('/media/') || path.startsWith('/core/index/resize/') || path.startsWith('/skin/') || path.startsWith('/sync/') || path.startsWith('/sitemap') || path.startsWith('/plugins/') || path.startsWith('/embed');
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

// Payment plugin static assets
const plugins: Record<string, string> = {
  'stripe-payment.js': stripePlugin,
};
app.get('/plugins/:name', (c) => {
  const name = c.req.param('name');
  const content = plugins[name];
  if (!content) return c.notFound();
  return c.body(content, 200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' });
});

// Embed script — standalone IIFE for external sites
// Public embed demo page
app.get('/embed-demo', (c) => {
  const origin = new URL(c.req.url).origin;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maho Storefront — Embeddable Widget Demo</title>
  <meta name="description" content="Drop-in product cards with full inline checkout. One script tag, any website.">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; margin: 0; background: #fafafa; color: #1a1a1a; -webkit-font-smoothing: antialiased; }
    .hero { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 60px 20px; text-align: center; }
    .hero h1 { font-size: 36px; font-weight: 700; margin: 0 0 12px; letter-spacing: -0.5px; }
    .hero p { font-size: 18px; color: #94a3b8; margin: 0 0 8px; max-width: 600px; margin-left: auto; margin-right: auto; }
    .hero .badge { display: inline-block; background: rgba(99,102,241,0.15); color: #818cf8; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; }
    .container { max-width: 1000px; margin: 0 auto; padding: 0 20px; }
    .products { padding: 48px 20px; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; max-width: 1000px; margin: 0 auto; }
    .section-title { text-align: center; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 24px; }
    .code-section { background: #fff; border-top: 1px solid #e2e8f0; padding: 48px 20px; }
    .code-block { max-width: 700px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; padding: 24px; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 13px; line-height: 1.7; overflow-x: auto; }
    .code-block .tag { color: #7dd3fc; } .code-block .attr { color: #c4b5fd; } .code-block .val { color: #86efac; } .code-block .comment { color: #475569; }
    .features { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; max-width: 700px; margin: 32px auto 0; text-align: center; }
    .feature { font-size: 14px; color: #64748b; } .feature strong { display: block; color: #1a1a1a; margin-bottom: 4px; }
    footer { text-align: center; padding: 32px 20px; color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; }
    footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="hero">
    <div class="badge">Open Source</div>
    <h1>Maho Storefront Embed</h1>
    <p>Drop-in product cards with full inline checkout.<br>One script tag. Any website.</p>
  </div>

  <div class="products">
    <div class="section-title">Live Demo — Click a product</div>
    <div class="product-grid">
      <div data-maho-product="hde004"></div>
      <div data-maho-product="hde005"></div>
      <div data-maho-product="hdb000"></div>
    </div>
  </div>

  <div class="code-section">
    <div class="section-title">Integration</div>
    <div class="code-block">
<span class="comment">&lt;!-- Place product placeholders anywhere --&gt;</span>
<span class="tag">&lt;div</span> <span class="attr">data-maho-product</span>=<span class="val">"YOUR-SKU"</span><span class="tag">&gt;&lt;/div&gt;</span>

<span class="comment">&lt;!-- Load the embed script (one line) --&gt;</span>
<span class="tag">&lt;script</span>
  <span class="attr">src</span>=<span class="val">"${origin}/embed.js"</span>
  <span class="attr">data-store</span>=<span class="val">"${origin}"</span>
  <span class="attr">data-currency</span>=<span class="val">"USD"</span><span class="tag">&gt;&lt;/script&gt;</span>
    </div>
    <div class="features">
      <div class="feature"><strong>Shadow DOM</strong>CSS-isolated cards</div>
      <div class="feature"><strong>Inline Checkout</strong>Cart, shipping, payment</div>
      <div class="feature"><strong>Stripe Elements</strong>Cards, Apple Pay, Google Pay</div>
      <div class="feature"><strong>~13KB gzipped</strong>No dependencies</div>
    </div>
  </div>

  <footer>
    <a href="https://github.com/mageaustralia/maho-storefront">mageaustralia/maho-storefront</a> — AGPL-3.0
  </footer>

  <script src="${origin}/embed.js" data-store="${origin}" data-currency="USD" data-accent="#6366f1"></script>
</body>
</html>`;
  return c.html(html);
});

app.get('/embed.js', (c) => {
  return c.body(embedScript, 200, {
    'Content-Type': 'application/javascript',
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
  });
});

// Embed product data API — returns product data for embed widgets
app.options('/embed/products', (c) => {
  return c.body(null, 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  });
});

app.get('/embed/products', async (c) => {
  const { stores, currentStoreCode } = await getStoreContext(c);
  const apiClient = createApiClient(c.env, stores, currentStoreCode);

  // Accept SKUs as query params: ?skus[]=SKU1&skus[]=SKU2
  const url = new URL(c.req.url);
  const skus = url.searchParams.getAll('skus[]').filter(Boolean).slice(0, 20);

  if (!skus.length) {
    return c.json({ products: [] }, 200, { 'Access-Control-Allow-Origin': '*' });
  }

  // Fetch products from API (KV stores by urlKey, not SKU)
  const products: any[] = [];
  for (const sku of skus) {
    try {
      const product = await apiClient.fetchProductBySku(sku);
      if (product) {
        products.push({
          id: product.id,
          sku: product.sku,
          name: product.name,
          type: product.type,
          price: product.price,
          specialPrice: product.specialPrice,
          finalPrice: product.finalPrice,
          imageUrl: product.imageUrl,
          smallImageUrl: product.smallImageUrl,
          thumbnailUrl: product.thumbnailUrl,
          mediaGallery: product.mediaGallery ?? [],
          urlKey: product.urlKey,
          stockStatus: product.stockStatus,
          shortDescription: product.shortDescription,
          configurableOptions: product.configurableOptions ?? [],
          variants: product.variants ?? [],
          hasRequiredOptions: product.hasRequiredOptions ?? false,
        });
      }
    } catch {}
  }

  // Include Stripe publishable key from KV config (synced during data sync)
  const store = new CloudflareKVStore(c.env.CONTENT);
  const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const config = await store.get<StoreConfig>(`${prefix}config`);
  const stripePlugin = config?.extensions?.paymentPlugins?.find((p: any) => p.code === 'stripe');
  const stripeKey = stripePlugin?.config?.STRIPE_PUBLISHABLE_KEY ?? null;

  const detectedCountry = (c.req.raw.cf as any)?.country as string || '';
  const googleMapsKey = await store.get<string>(`${prefix}google:mapsKey`) || c.env.GOOGLE_MAPS_KEY || null;
  return c.json({ products, config: { stripePublishableKey: stripeKey, googleMapsKey, detectedCountry, currency: config?.defaultDisplayCurrencyCode || 'USD', defaultCountry: config?.defaultCountry || 'US' } }, 200, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
  });
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
      const body = await res.arrayBuffer();
      return c.body(body, 200, {
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


// CORS preflight for Stripe PaymentIntent (embed widget sends cross-origin POST)
app.options('/api/payments/stripe/payment-intents', (c) => {
  return c.body(null, 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  });
});

// Stripe PaymentIntent creation — handles both storefront and embed widget checkout.
// Creates PaymentIntents directly via the Stripe API using the cart total from the Maho backend.
// The Stripe secret key is synced from the Maho admin config into KV during data sync.
app.post('/api/payments/stripe/payment-intents', async (c, next) => {
  const { stores, currentStoreCode } = await getStoreContext(c);
  const kvStore = new CloudflareKVStore(c.env.CONTENT);
  const prefix = currentStoreCode ? `${currentStoreCode}:` : '';

  // Get Stripe secret key from KV (synced during data sync) or fall back to env var
  const stripeSecretKey = await kvStore.get<string>(`${prefix}stripe:secretKey`) || c.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return next();

  const apiUrl = getApiUrl(c.env, stores, currentStoreCode);

  let cartId: string;
  let shippingMethod: string | undefined;
  let shippingAddress: any;
  try {
    const body = await c.req.json() as { cartId?: string; shippingMethod?: string; shippingAddress?: any };
    cartId = body.cartId || '';
    shippingMethod = body.shippingMethod;
    shippingAddress = body.shippingAddress;
  } catch {
    return c.json({ error: true, message: 'Invalid request body' }, 400);
  }

  if (!cartId) {
    return c.json({ error: true, message: 'cartId is required' }, 400);
  }

  // Common headers for Maho API calls
  const mahoHeaders: Record<string, string> = {
    'Accept': 'application/ld+json',
    'Content-Type': 'application/ld+json',
  };
  if (currentStoreCode) mahoHeaders['X-Store-Code'] = currentStoreCode;
  if (c.env.MAHO_API_BASIC_AUTH) mahoHeaders['Authorization'] = `Basic ${btoa(c.env.MAHO_API_BASIC_AUTH)}`;

  // If shipping info provided, set it on the cart first so grandTotal includes shipping
  let shippingPrice = 0;
  if (shippingMethod && shippingAddress) {
    // POST shipping-methods with address to set address + get available rates
    const methodsRes = await fetch(`${apiUrl}/api/guest-carts/${cartId}/shipping-methods`, {
      method: 'POST',
      headers: mahoHeaders,
      body: JSON.stringify({ address: shippingAddress }),
    });
    if (methodsRes.ok) {
      const methods = await methodsRes.json() as Array<{ code: string; price: number }>;
      const matched = methods.find(m => m.code === shippingMethod);
      if (matched) shippingPrice = matched.price || 0;
    }
  }

  // Fetch cart totals from Maho backend
  const cartUrl = `${apiUrl}/api/guest-carts/${cartId}`;
  const cartRes = await fetch(cartUrl, { headers: { 'Accept': 'application/ld+json', ...mahoHeaders } });
  if (!cartRes.ok) {
    return c.json({ error: true, message: 'Cart not found' }, 404);
  }

  const cart = await cartRes.json() as { prices?: { grandTotal?: number; shippingAmount?: number | null }; currency?: string };
  let grandTotal = cart.prices?.grandTotal || 0;

  // If the cart doesn't include shipping yet (no shippingAmount), add the matched shipping price
  if (shippingPrice > 0 && (!cart.prices?.shippingAmount || cart.prices.shippingAmount === 0)) {
    grandTotal += shippingPrice;
  }

  if (!grandTotal || grandTotal <= 0) {
    return c.json({ error: true, message: 'Cart is empty or has no total' }, 400);
  }

  // Get currency from cart or store config
  const config = await kvStore.get<StoreConfig>(`${prefix}config`);
  const currency = (cart.currency || config?.defaultDisplayCurrencyCode || 'USD').toLowerCase();

  // Create PaymentIntent via Stripe API
  const amountInCents = Math.round(grandTotal * 100);
  const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(amountInCents),
      currency,
      'automatic_payment_methods[enabled]': 'true',
      'metadata[cart_id]': cartId,
      'metadata[source]': 'maho_storefront',
    }).toString(),
  });

  if (!stripeRes.ok) {
    const stripeErr = await stripeRes.json().catch(() => ({})) as { error?: { message?: string } };
    return c.json({ error: true, message: stripeErr.error?.message || 'Stripe error' }, 500);
  }

  const pi = await stripeRes.json() as { id: string; client_secret: string };
  return c.json(
    { clientSecret: pi.client_secret, paymentIntentId: pi.id },
    200,
    { 'Access-Control-Allow-Origin': '*' },
  );
});

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
    products: (productsRes as any).products || productsRes.member || [],
    totalItems: (productsRes as any).totalItems || 0,
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

// Auth pages
app.get('/login', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<LoginPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

app.get('/register', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<RegisterPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

app.get('/forgot-password', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<ForgotPasswordPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

app.get('/reset-password', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<ResetPasswordPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

// Account
app.get('/account', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
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
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  return c.html(<ContactPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
});

// Checkout
app.get('/checkout', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
  const countries = await store.get<Country[]>('countries') ?? [];
  const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
  const detectedCountry = (c.req.raw.cf as any)?.country as string || '';
  const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const googleMapsKey = await store.get<string>(`${prefix}google:mapsKey`) || c.env.GOOGLE_MAPS_KEY;
  return c.html(<CheckoutPage config={config} categories={categories} countries={countries} stores={stores} currentStoreCode={currentStoreCode} devData={devData} googleMapsKey={googleMapsKey} detectedCountry={detectedCountry} />);
});

// Order success
app.get('/order/success', async (c) => {
  const devSession = c.get('devSession') as DevSession | undefined;
  const timer = devSession ? createDevTimer() : null;
  const store = createStore(c.env, timer);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
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

      // Detect payment plugins from backend and inject config
      try {
        const stripeApiUrl = `${getApiUrl(c.env, stores, storeCode)}/api/payments/stripe/config`;
        const stripeHeaders: Record<string, string> = { 'Accept': 'application/json' };
        if (storeCode) stripeHeaders['X-Store-Code'] = storeCode;
        if (c.env.MAHO_API_BASIC_AUTH) stripeHeaders['Authorization'] = `Basic ${btoa(c.env.MAHO_API_BASIC_AUTH)}`;
        // Send sync secret so the backend returns the Stripe secret key for PaymentIntent creation
        if (c.env.SYNC_SECRET) stripeHeaders['X-Storefront-Sync'] = c.env.SYNC_SECRET;
        const stripeRes = await fetch(stripeApiUrl, { headers: stripeHeaders });
        if (stripeRes.ok) {
          const stripeConfig = await stripeRes.json() as { publishableKey?: string; secretKey?: string };
          if (stripeConfig?.publishableKey) {
            config.extensions = config.extensions || {};
            config.extensions.paymentPlugins = config.extensions.paymentPlugins || [];
            if (!config.extensions.paymentPlugins.some((p: { code: string }) => p.code === 'stripe')) {
              config.extensions.paymentPlugins.push({
                code: 'stripe',
                script: '/plugins/stripe-payment.js',
                config: { STRIPE_PUBLISHABLE_KEY: stripeConfig.publishableKey },
              });
            }
          }
          // Store Stripe secret key in KV for server-side PaymentIntent creation
          if (stripeConfig?.secretKey) {
            await store.put(`${prefix}stripe:secretKey`, stripeConfig.secretKey);
          }
        }
      } catch { /* Stripe not available — skip */ }

      // Store Google Maps key from config extensions (injected by Storefront module observer)
      if (config.extensions?.googleMapsKey) {
        await store.put(`${prefix}google:mapsKey`, config.extensions.googleMapsKey as string);
      }

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
              await store.put(`${prefix}category:${child.urlPath?.replace(/\.html$/, '')}`, child);
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

          // Cache each product individually by urlKey for fast product page loads
          for (const p of data.products) {
            if (p.urlKey) {
              c.executionCtx.waitUntil(store.put(`${prefix}product:${p.urlKey}`, p, 86400));
            }
          }

          const totalPages = Math.ceil(data.totalItems / 24);
          for (let pg = 2; pg <= Math.min(totalPages, 3); pg++) {
            const pageData = await storeApiClient.fetchCategoryProducts(cat.id, pg, 24);
            await store.put(`${prefix}products:category:${cat.id}:page:${pg}`, pageData);
            storeProductCount += pageData.products.length;

            for (const p of pageData.products) {
              if (p.urlKey) {
                c.executionCtx.waitUntil(store.put(`${prefix}product:${p.urlKey}`, p, 86400));
              }
            }
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

      // 8. Sync filterable pages (megamenu data + brand pages)
      try {
        const filterApi = new FilterablePagesApi(
          getApiUrl(c.env, stores, storeCode),
          storeCode,
          c.env.MAHO_API_BASIC_AUTH,
        );
        const filterResult = await syncFilterablePages(filterApi, store, prefix, allCategories);
        results[`${storeCode || 'default'}:filterablePages`] =
          `${filterResult.menuData} menus, ${filterResult.filterPages} pages`;
      } catch { /* FilterablePages module not available — skip */ }

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
              if (child.urlPath) await store.put(`${prefix}category:${child.urlPath?.replace(/\.html$/, '')}`, child);
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
              await store.put(`${prefix}category:${((cat as any).urlPath || '').replace(/\.html$/, '')}`, cat);
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
              if (child.urlPath) await store.put(`${prefix}category:${child.urlPath?.replace(/\.html$/, '')}`, child);
            }
          }
        }
        return c.json({ status: 'ok', type: 'categories-by-id', count: catCount });
      }
      case 'filterable-pages': {
        const fpCategories = await partialApiClient.fetchCategories();
        for (let i = 0; i < fpCategories.length; i++) {
          const cat = fpCategories[i];
          if (cat.id && cat.childrenIds && cat.childrenIds.length > 0) {
            try { fpCategories[i] = await partialApiClient.fetchCategoryById(cat.id); } catch {}
          }
        }
        const fpAllCats = [...fpCategories];
        for (const cat of fpCategories) { if (cat.children) fpAllCats.push(...cat.children); }
        const filterApi = new FilterablePagesApi(
          getApiUrl(c.env, registeredStores, requestedStore || undefined),
          requestedStore || undefined,
          c.env.MAHO_API_BASIC_AUTH,
        );
        const fpResult = await syncFilterablePages(filterApi, store, prefix, fpAllCats);
        return c.json({ status: 'ok', type: 'filterable-pages', ...fpResult });
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
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
  const parentSlug = c.req.param('parent');
  const childSlug = c.req.param('child');
  const urlPath = `${parentSlug}/${childSlug}`;

  // Check if this is a filter page (e.g. /racquets/wilson → brand page)
  const filterPage = await resolveFilterPage(store, prefix, parentSlug, childSlug);
  if (filterPage) {
    // Find category by URL key (parentSlug) — more reliable than categoryId which may differ across store views
    const filterCategory = categories.find(cat => cat.urlKey === parentSlug)
      ?? categories.flatMap(cat => cat.children || []).find(cat => cat.urlKey === parentSlug);
    if (filterCategory) {
      const fpCategoryId = filterCategory.id!;
      const fpPage = parseInt(c.req.query('page') ?? '1', 10);
      const fpItemsPerPage = 12;
      const fpProductsData = await store.get<{ products: Product[]; totalItems: number }>(`${prefix}products:category:${fpCategoryId}:page:${fpPage}`);
      const fpProducts = fpProductsData?.products?.slice(0, fpItemsPerPage) ?? [];
      const fpTotalItems = fpProductsData?.totalItems ?? 0;
      const fpTotalPages = Math.ceil(fpTotalItems / fpItemsPerPage);
      const fpParentCategory = categories.find(cat => cat.children?.some(ch => ch.id === fpCategoryId)) ?? null;
      const fpDevData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
      const fpMenuData = await getMenuData(store, prefix, fpCategoryId);

      return c.html(
        <FilterPage
          config={config}
          categories={categories}
          category={filterCategory}
          filterPage={filterPage}
          products={fpProducts}
          currentPage={fpPage}
          totalPages={fpTotalPages}
          totalItems={fpTotalItems}
          parentCategory={fpParentCategory}
          menuData={fpMenuData}
          stores={stores}
          currentStoreCode={currentStoreCode}
          devData={fpDevData}
        />
      );
    }
  }

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

  // Menu data for filter page navigation (brand clicks → SEO URLs)
  const catMenuData = category.id ? await getMenuData(store, prefix, category.id) : null;

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
      menuData={catMenuData}
      devData={devData}
    />
  );
});

// Clean URLs: /women → category, /geometric-candle-holders → product, /about → CMS page
// Nested category URLs (e.g., /pickleballs-court-gear/pickleball-balls.html)
app.get('/:parent/:child', withEdgeCache(CACHE_PRODUCT), async (c) => {
  const parentSlug = c.req.param('parent').replace(/\.html$/, '');
  const childSlug = c.req.param('child').replace(/\.html$/, '');
  const fullPath = `${parentSlug}/${childSlug}`;
  const fullPathHtml = `${fullPath}.html`;

  const store = createStore(c.env);
  const { stores, currentStoreCode } = await getStoreContext(c);
  const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
  const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
  const devData = (c.get('devSession') as DevSession | undefined)?.preview ? null : null;

  // Find the child category by matching urlPath
  let childCategory: Category | undefined;
  for (const cat of categories) {
    if (cat.children) {
      childCategory = cat.children.find(ch => ch.urlPath === fullPath || ch.urlPath === fullPathHtml || ch.urlKey === childSlug);
      if (childCategory) break;
    }
  }

  // Also try KV lookup with the full path as key
  if (!childCategory) {
    childCategory = await store.get<Category>(`${prefix}category:${fullPath}`) ?? undefined;
  }

  if (childCategory) {
    const page = parseInt(c.req.query('page') ?? '1', 10);
    const itemsPerPage = 12;
    let productsData = await store.get<{ products: Product[]; totalItems: number }>(`${prefix}products:category:${childCategory.id}:page:${page}`);
    if (!productsData) {
      const apiClient = createApiClient(c.env, stores, currentStoreCode);
      productsData = await apiClient.fetchCategoryProducts(childCategory.id, page, itemsPerPage);
      if (productsData.products.length > 0) {
        c.executionCtx.waitUntil(store.put(`${prefix}products:category:${childCategory.id}:page:${page}`, productsData, 86400));
      }
    }
    const products = productsData?.products?.slice(0, itemsPerPage) ?? [];
    const totalItems = productsData?.totalItems ?? 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const parentCategory = categories.find(cat => cat.children?.some(ch => ch.id === childCategory!.id)) ?? null;

    const childMenuData = childCategory.id ? await getMenuData(store, prefix, childCategory.id) : null;
    return c.html(
      <CategoryPage config={config} categories={categories} category={childCategory} products={products}
        currentPage={page} totalPages={totalPages} totalItems={totalItems}
        parentCategory={parentCategory} menuData={childMenuData}
        stores={stores} currentStoreCode={currentStoreCode} devData={devData} />
    );
  }

  return c.text('Not Found', 404);
});

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
  const slug = c.req.param('slug').replace(/\.html$/, '');

  // Fetch store data AND all possible entity types in ONE parallel batch.
  // This reduces 3 sequential KV round trips to 1.
  const [storeData, kvCategory, kvProduct, kvCms, kvCmsUnprefixed, kvBlog] = await Promise.all([
    getStoreData(store, currentStoreCode, new URL(c.req.url).origin),
    store.get<Category>(`${prefix}category:${slug}`),
    store.get<Product>(`${prefix}product:${slug}`),
    store.get<CmsPage>(`${prefix}cms:${slug}`),
    prefix ? store.get<CmsPage>(`cms:${slug}`) : Promise.resolve(null),
    store.get<CmsPage>(`${prefix}blog:${slug}`),
  ]);

  const { config, categories } = storeData;
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
    const slugMenuData = category.id ? await getMenuData(store, prefix, category.id) : null;

    return c.html(
      <CategoryPage
        config={config} categories={categories} category={category} products={products}
        currentPage={page} totalPages={totalPages} totalItems={totalItems}
        parentCategory={parentCategory} stores={stores} currentStoreCode={currentStoreCode}
        featuredBlockHtml={featuredBlock?.content ?? null}
        menuData={slugMenuData}
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
  // All lookups were fetched in parallel above alongside getStoreData().

  if (kvCategory) return renderCategory(kvCategory);

  if (kvProduct && kvProduct.urlKey === slug) {
    // Check if this is a listing stub (missing configurable options) — fetch full product from API
    const isListingStub = kvProduct.type === 'configurable'
      && (!kvProduct.configurableOptions || kvProduct.configurableOptions.length === 0);
    if (isListingStub && kvProduct.id) {
      try {
        const fullProduct = await apiClient.fetchProductById(kvProduct.id);
        if (fullProduct) {
          c.executionCtx.waitUntil(store.put(`${prefix}product:${slug}`, fullProduct, 86400));
          return renderProduct(fullProduct);
        }
      } catch { /* fall through to render listing version */ }
    }
    return renderProduct(kvProduct);
  }

  const resolvedCmsPage = kvCms ?? kvCmsUnprefixed;
  if (resolvedCmsPage) {
    const needsSidebars = resolvedCmsPage.pageLayout && !['one_column', 'empty', 'minimal'].includes(resolvedCmsPage.pageLayout);
    const cmsSidebars = needsSidebars ? await getSidebarBlocks(store, 'cms', currentStoreCode) : { left: null, right: null };
    return c.html(<CmsPageTemplate config={config} categories={categories} page={resolvedCmsPage} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={cmsSidebars.left} sidebarRight={cmsSidebars.right} devData={devData} />);
  }

  if (kvBlog) {
    return c.html(<BlogPostPage config={config} categories={categories} post={kvBlog} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={null} sidebarRight={null} devData={devData} />);
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