/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Embed widget server routes — the standalone embeddable product/checkout
 * widget for third-party sites. Serves the demo page, the IIFE bundle
 * (public/embed.js.txt) and the product-data API the widget calls. Extracted
 * from index.tsx via registerEmbedRoutes. The widget's own bundle still uses
 * Stripe directly (embed-plugin refactor pending — see architecture/plugins).
 */

import type { Hono } from 'hono';
// @ts-expect-error — static asset import handled by wrangler (Text rule)
import embedScript from '../../public/embed.js.txt';
import { CloudflareKVStore } from '../content-store';
import { getStripePublishableKey } from '../plugins/stripe';
import type { MahoApiClient } from '../api-client';
import type { Env, StoreConfig, StorefrontStore } from '../types';

export interface EmbedRouteDeps {
  getStoreContext: (c: any) => Promise<{ stores: StorefrontStore[]; currentStoreCode: string | undefined }>;
  createApiClient: (env: Env, stores: StorefrontStore[], storeCode?: string) => MahoApiClient;
}

export function registerEmbedRoutes(app: Hono<any>, deps: EmbedRouteDeps): void {
  const { getStoreContext, createApiClient } = deps;

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
    const stripeKey = getStripePublishableKey(config);

    const detectedCountry = (c.req.raw.cf as any)?.country as string || '';
    const googleMapsKey = await store.get<string>(`${prefix}google:mapsKey`) || c.env.GOOGLE_MAPS_KEY || null;
    return c.json({ products, config: { stripePublishableKey: stripeKey, googleMapsKey, detectedCountry, currency: config?.defaultDisplayCurrencyCode || 'USD', defaultCountry: config?.defaultCountry || 'US' } }, 200, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    });
  });
}
