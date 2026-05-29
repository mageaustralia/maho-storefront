/**
 * Maho Storefront — Stripe Plugin
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * The Content-Security-Policy sources Stripe needs (Stripe.js, the API, and the
 * 3DS challenge frames). Owned by the plugin so removing the plugin removes its
 * CSP footprint — see src/plugins/csp.ts (the aggregator the security-headers
 * middleware reads).
 */

import type { PluginCsp } from '../csp';

export const STRIPE_CSP: PluginCsp = {
  scriptSrc: ['https://js.stripe.com'],
  connectSrc: ['https://api.stripe.com'],
  frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
};
