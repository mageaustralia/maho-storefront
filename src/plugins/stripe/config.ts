/**
 * Maho Storefront — Stripe Plugin
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Small config readers shared by core endpoints that need to surface Stripe's
 * public key (e.g. the embed cart-recommendations response) without reaching
 * into the paymentPlugins shape directly.
 */

import type { StoreConfig } from '../../types';

/** The Stripe publishable key from the synced payment-plugin config, or null. */
export function getStripePublishableKey(config: StoreConfig | null | undefined): string | null {
  const stripePlugin = config?.extensions?.paymentPlugins?.find((p: any) => p.code === 'stripe');
  return stripePlugin?.config?.STRIPE_PUBLISHABLE_KEY ?? null;
}
