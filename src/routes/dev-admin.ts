/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Dev admin routes — password-gate config + dev-token CRUD. All auth-protected
 * via the injected checkSyncAuth (SYNC_SECRET bearer OR an authenticated dev
 * session). Extracted from index.tsx (Phase 3.4) via registerDevAdminRoutes.
 * The dev *session* routes (/dev/login, /dev/logout, /dev/preview) stay in
 * index.tsx — they're coupled to the password-gate middleware.
 */

import type { Hono } from 'hono';
import { CloudflareKVStore } from '../content-store';
import { hashToken } from '../dev-auth';
import type { Env } from '../types';

export interface DevAdminDeps {
  /** Valid sync bearer OR an authenticated dev session. */
  checkSyncAuth: (c: any) => boolean;
}

export function registerDevAdminRoutes(app: Hono<any>, deps: DevAdminDeps): void {
  const { checkSyncAuth } = deps;

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
}
