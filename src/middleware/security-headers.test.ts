/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { securityHeaders } from './security-headers';

function makeApp() {
  const app = new Hono();
  app.use('*', securityHeaders);
  app.get('/page', (c) => c.html('<!doctype html><title>x</title>'));
  app.get('/data.json', (c) => c.json({ ok: true }));
  return app;
}

describe('securityHeaders', () => {
  it('sets the always-on headers on every response', async () => {
    const res = await makeApp().request('https://store.example.com/data.json');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Permissions-Policy')).toBe('browsing-topics=()');
  });

  it('sets HSTS only over https', async () => {
    const https = await makeApp().request('https://store.example.com/data.json');
    expect(https.headers.get('Strict-Transport-Security')).toContain('max-age=');
    const http = await makeApp().request('http://localhost/data.json');
    expect(http.headers.get('Strict-Transport-Security')).toBeNull();
  });

  it('applies framing + report-only CSP to HTML, not to JSON', async () => {
    const html = await makeApp().request('https://store.example.com/page');
    expect(html.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    const csp = html.headers.get('Content-Security-Policy-Report-Only');
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain('https://js.stripe.com');
    // Report-only, never the enforcing header.
    expect(html.headers.get('Content-Security-Policy')).toBeNull();

    const json = await makeApp().request('https://store.example.com/data.json');
    expect(json.headers.get('X-Frame-Options')).toBeNull();
    expect(json.headers.get('Content-Security-Policy-Report-Only')).toBeNull();
  });
});
