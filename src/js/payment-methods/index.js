/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Payment Method Adapter Registry
 *
 * The checkout controller imports getAdapter() from here and never deals
 * with gateway-specific logic. To add a new payment gateway:
 *
 *   1. Create a new adapter file (see braintree-adapter.js as example)
 *   2. Import it below and add to the adapters array
 *
 * The checkout controller does NOT need any changes.
 */

import { BraintreeAdapter } from './braintree-adapter.js';
// import { StripeAdapter } from './stripe-adapter.js';
// import { PayPalAdapter } from './paypal-adapter.js';

const adapters = [
  new BraintreeAdapter(),
  // new StripeAdapter(),
  // new PayPalAdapter(),
];

/**
 * Find the adapter that handles a given payment method code.
 * Returns null for methods that don't need client-side handling (checkmo, etc.)
 */
export function getAdapter(methodCode) {
  return adapters.find(a => a.match(methodCode)) ?? null;
}

/**
 * Check if any registered adapter handles this method code.
 * Used by the checkout controller to know whether to show a payment fields container.
 */
export function hasAdapter(methodCode) {
  return adapters.some(a => a.match(methodCode));
}