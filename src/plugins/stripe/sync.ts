/**
 * Maho Storefront — Stripe Plugin
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Sync hook: pulls Stripe config from the Maho backend during a data sync.
 * Called from the core /sync route. Registers the `stripe` payment plugin in
 * the store config (so the client loads /plugins/stripe-payment.js) and seeds
 * the secret key into KV for server-side PaymentIntent creation. No-ops if the
 * backend doesn't expose /api/payments/stripe/config (Stripe not installed).
 */

import type { ContentStore } from '../../content-store';
import type { StoreConfig } from '../../types';

export interface SyncStripeOptions {
  /** Backend base URL for this store (e.g. getApiUrl(env, stores, storeCode)). */
  apiUrl: string;
  storeCode?: string;
  /** "user:pass" for the backend's HTTP basic auth, if any. */
  basicAuth?: string;
  /** SYNC_SECRET — the backend only returns the secret key when this is sent. */
  syncSecret?: string;
  /** The store config being assembled — mutated in place to add the payment plugin. */
  config: StoreConfig;
  /** KV store, used to persist the secret key. */
  store: ContentStore;
  /** Store-code KV prefix (e.g. "sv_2:") or "". */
  prefix: string;
}

export async function syncStripeConfig(opts: SyncStripeOptions): Promise<void> {
  const { apiUrl, storeCode, basicAuth, syncSecret, config, store, prefix } = opts;
  try {
    const stripeApiUrl = `${apiUrl}/api/payments/stripe/config`;
    const stripeHeaders: Record<string, string> = { 'Accept': 'application/json' };
    if (storeCode) stripeHeaders['X-Store-Code'] = storeCode;
    if (basicAuth) stripeHeaders['Authorization'] = `Basic ${btoa(basicAuth)}`;
    // Send sync secret so the backend returns the Stripe secret key for PaymentIntent creation
    if (syncSecret) stripeHeaders['X-Storefront-Sync'] = syncSecret;
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
}
