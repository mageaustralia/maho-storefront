/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Static-asset routes — bundled CSS/JS, favicon, and payment-plugin scripts.
 * Extracted from index.tsx as the first step of decomposing the worker entry
 * (registered via registerStaticAssetRoutes). URLs are content-hash
 * cache-busted (?v=...), hence the immutable cache headers.
 */

import type { Hono } from 'hono';
// @ts-expect-error — static asset imports handled by wrangler (Text rule)
import styles from '../../public/styles.css';
// @ts-expect-error — static asset imports handled by wrangler (Text rule)
import controllers from '../../public/controllers.js.txt';
// @ts-expect-error — static asset imports handled by wrangler (Text rule)
import stripePlugin from '../../public/plugins/stripe-payment.js.txt';
// @ts-expect-error — static asset imports handled by wrangler (Text rule)
import braintreePlugin from '../../public/plugins/braintree-payment.js.txt';

const IMMUTABLE = 'public, max-age=31536000, immutable';

// Favicon — a small inline SVG mark (no binary asset needed). The
// <link rel="icon"> in Layout points browsers here; /favicon.ico returns 204
// so the default browser/crawler probe for /favicon.ico stops 404-ing.
const FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
  '<rect width="32" height="32" rx="7" fill="#101317"/>' +
  '<circle cx="16" cy="16" r="8" fill="none" stroke="#c2f04a" stroke-width="3.2"/>' +
  '</svg>';

const plugins: Record<string, string> = {
  'stripe-payment.js': stripePlugin,
  'braintree-payment.js': braintreePlugin,
};

export function registerStaticAssetRoutes(app: Hono<any>): void {
  app.get('/styles.css', (c) =>
    c.body(styles, 200, { 'Content-Type': 'text/css', 'Cache-Control': IMMUTABLE }),
  );
  app.get('/controllers.js', (c) =>
    c.body(controllers, 200, { 'Content-Type': 'application/javascript', 'Cache-Control': IMMUTABLE }),
  );
  app.get('/favicon.svg', (c) =>
    c.body(FAVICON_SVG, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=604800' }),
  );
  app.get('/favicon.ico', (c) => c.body(null, 204, { 'Cache-Control': 'public, max-age=604800' }));
  app.get('/plugins/:name', (c) => {
    const content = plugins[c.req.param('name')];
    if (!content) return c.notFound();
    return c.body(content, 200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400' });
  });
}
