/**
 * Maho Storefront — Braintree Plugin
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Sync hook: registers the Braintree payment plugin during a data sync, so the
 * storefront loads /plugins/braintree-payment.js on checkout. Mirrors the
 * Stripe plugin, with one difference: Braintree needs no static key client-side
 * (the adapter fetches a client token at runtime from
 * /api/payments/braintree/client-token), so nothing is persisted to KV.
 *
 * Availability is detected by probing GET /api/payments/braintree/config. If
 * the backend Braintree module doesn't expose it (404), this no-ops — exactly
 * like syncStripeConfig fails safe. See INTEGRATION.md for the backend contract.
 */

import type { StoreConfig } from '../../types';

export interface SyncBraintreeOptions {
  /** Backend base URL for this store (e.g. getApiUrl(env, stores, storeCode)). */
  apiUrl: string;
  storeCode?: string;
  /** "user:pass" for the backend's HTTP basic auth, if any. */
  basicAuth?: string;
  /** SYNC_SECRET — sent so the backend can gate config behind storefront sync. */
  syncSecret?: string;
  /** The store config being assembled — mutated in place to add the payment plugin. */
  config: StoreConfig;
}

export async function syncBraintreeConfig(opts: SyncBraintreeOptions): Promise<void> {
  const { apiUrl, storeCode, basicAuth, syncSecret, config } = opts;
  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (storeCode) headers['X-Store-Code'] = storeCode;
    if (basicAuth) headers['Authorization'] = `Basic ${btoa(basicAuth)}`;
    if (syncSecret) headers['X-Storefront-Sync'] = syncSecret;

    const res = await fetch(`${apiUrl}/api/rest/v2/payments/braintree/config`, { headers });
    if (!res.ok) return; // Braintree module not installed / not exposing config — skip.

    const btConfig = await res.json() as { enabled?: boolean; environment?: string };
    if (btConfig?.enabled === false) return; // Explicitly disabled.

    config.extensions = config.extensions || {};
    config.extensions.paymentPlugins = config.extensions.paymentPlugins || [];
    if (!config.extensions.paymentPlugins.some((p: { code: string }) => p.code === 'braintree')) {
      config.extensions.paymentPlugins.push({
        code: 'braintree',
        script: '/plugins/braintree-payment.js',
        // No static key — the client adapter fetches a client token at runtime.
        config: btConfig?.environment ? { environment: btConfig.environment } : {},
      });
    }
  } catch { /* Braintree not available — skip */ }
}
