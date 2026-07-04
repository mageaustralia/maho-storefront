/**
 * Maho Storefront — B2B Access sync
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Discovery hook: probes the backend for the B2B Access module during a data
 * sync. If GET /api/rest/v2/b2b/access/config returns 200, we register the
 * plugin in the store config so the storefront's render layer knows to look
 * at product.extensions.b2bAccess.gateFlags. If the endpoint 404s (module not
 * installed) or returns enabled=false (installed but off), we skip
 * registration - the storefront then behaves as if the plugin isn't here.
 *
 * See docs: reference/b2b-integration-pattern.
 */

import type { ContentStore } from '../../content-store';
import type { StoreConfig } from '../../types';

export interface SyncB2bAccessOptions {
  /** Backend base URL for this store (e.g. getApiUrl(env, stores, storeCode)). */
  apiUrl: string;
  storeCode?: string;
  /** "user:pass" for the backend's HTTP basic auth, if any. */
  basicAuth?: string;
  /** The store config being assembled — mutated in place to add the b2b plugin entry. */
  config: StoreConfig;
  /** KV store, used for future extension points (e.g. cache the config alongside). */
  store: ContentStore;
  /** Store-code KV prefix (e.g. "sv_2:") or "". */
  prefix: string;
}

interface B2bAccessConfigResponse {
  enabled?: boolean;
  requireLogin?: boolean;
  hidePrice?: boolean;
  blockPurchase?: boolean;
  loginMessage?: string | null;
  hiddenPriceMessage?: string | null;
  loginRedirectUrl?: string | null;
}

export async function syncB2bAccessConfig(opts: SyncB2bAccessOptions): Promise<void> {
  const { apiUrl, storeCode, basicAuth, config } = opts;
  try {
    const url = `${apiUrl}/api/rest/v2/b2b/access/config`;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (storeCode) headers['X-Store-Code'] = storeCode;
    if (basicAuth) headers['Authorization'] = `Basic ${btoa(basicAuth)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return; // 404 = module not installed; skip.
    const cfg = await res.json() as B2bAccessConfigResponse;
    if (!cfg?.enabled) return; // installed but off; skip.

    config.extensions = config.extensions || {};
    config.extensions.b2bPlugins = config.extensions.b2bPlugins || [];
    if (config.extensions.b2bPlugins.some((p: { code: string }) => p.code === 'b2b-access')) return;
    config.extensions.b2bPlugins.push({
      code: 'b2b-access',
      script: '/plugins/b2b-access.js',
      config: {
        requireLogin: !!cfg.requireLogin,
        hidePrice: !!cfg.hidePrice,
        blockPurchase: !!cfg.blockPurchase,
        loginMessage: cfg.loginMessage || 'Please log in to view this store.',
        hiddenPriceMessage: cfg.hiddenPriceMessage || 'Log in to see pricing.',
        loginRedirectUrl: cfg.loginRedirectUrl || '/customer/account/login/',
      },
    });
  } catch {
    // Backend unreachable / malformed response — treat as "not installed".
  }
}
