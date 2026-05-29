/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Context, Next } from 'hono';
import { PLUGIN_CSP } from '../plugins/csp';

/**
 * Content-Security-Policy emitted in **Report-Only** mode.
 *
 * Why report-only (not enforced): script/style/connect sources are
 * store-specific because payment gateways (Stripe, Braintree, Apple/Google Pay)
 * and analytics are loaded dynamically per store. Enforcing a fixed allowlist
 * would break a store whose gateway isn't listed here. Report-only surfaces
 * every violation (via the browser console / a report collector) without
 * blocking anything, so the allowlist can be proven complete before flipping
 * to enforce. Flipping to enforce also needs nonces on the inline <script>
 * blocks in Layout.tsx / Product.tsx and the inline onclick handlers in the
 * product cards (tracked in the remediation plan, Phase 1.2).
 *
 * Gateway/SDK sources (e.g. Stripe's js.stripe.com / api.stripe.com) are NOT
 * hardcoded here — each plugin owns its CSP sources and they're merged in via
 * PLUGIN_CSP (src/plugins/csp.ts). Removing a plugin removes its CSP footprint.
 */
// Core sources every storefront needs, before plugin contributions.
const BASE_CSP = {
  // 'unsafe-inline' is present ONLY so report-only doesn't drown in noise from
  // the known inline scripts; the enforced version will replace it with nonces.
  scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'"],
  frameSrc: [] as string[],
};

function srcDirective(name: string, base: string[], plugin: string[]): string | null {
  const sources = [...base, ...plugin];
  return sources.length ? `${name} ${sources.join(' ')}` : null;
}

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  srcDirective('script-src', BASE_CSP.scriptSrc, PLUGIN_CSP.scriptSrc),
  srcDirective('style-src', BASE_CSP.styleSrc, PLUGIN_CSP.styleSrc),
  srcDirective('font-src', BASE_CSP.fontSrc, PLUGIN_CSP.fontSrc),
  srcDirective('img-src', BASE_CSP.imgSrc, PLUGIN_CSP.imgSrc),
  srcDirective('connect-src', BASE_CSP.connectSrc, PLUGIN_CSP.connectSrc),
  srcDirective('frame-src', BASE_CSP.frameSrc, PLUGIN_CSP.frameSrc),
].filter(Boolean).join('; ');

/**
 * Global security-headers middleware.
 *
 * Enforced (safe — these don't affect resource loading):
 *   - X-Frame-Options + frame-ancestors: clickjacking protection
 *   - X-Content-Type-Options: nosniff
 *   - Referrer-Policy
 *   - Strict-Transport-Security (HTTPS only)
 *   - Permissions-Policy: disable Topics/FLoC (kept minimal so it can't break
 *     Payment Request API / Apple Pay / geolocation features)
 *
 * Report-only:
 *   - Content-Security-Policy-Report-Only (HTML responses only)
 */
export async function securityHeaders(c: Context, next: Next): Promise<void> {
  await next();
  if (!c.res) return;
  const h = c.res.headers;

  // Applies to every response — cheap and never breaks anything.
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'browsing-topics=()');

  const url = new URL(c.req.url);
  if (url.protocol === 'https:') {
    h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Framing + CSP only matter for HTML documents.
  if (h.get('Content-Type')?.includes('text/html')) {
    h.set('X-Frame-Options', 'SAMEORIGIN');
    // Report-only — see CSP_REPORT_ONLY note above. Cannot block resources.
    if (!h.has('Content-Security-Policy-Report-Only')) {
      h.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);
    }
  }
}
