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

import { BasePaymentAdapter } from './base-adapter.js';
import { BraintreeAdapter } from './braintree-adapter.js';

const adapters = [
  new BraintreeAdapter(),
];

/**
 * Register an external payment adapter (for standalone plugins).
 * Call via window.MahoStorefront.registerPaymentAdapter(adapterInstance)
 */
export function registerAdapter(adapter) {
  if (adapter && typeof adapter.match === 'function') {
    adapters.push(adapter);
  }
}

/**
 * Find the adapter that handles a given payment method code.
 * Returns null for methods that don't need client-side handling (checkmo, etc.)
 */
export function getAdapter(methodCode) {
  return adapters.find(a => a.match(methodCode)) ?? null;
}

/**
 * Find an adapter that supports early initialization (e.g. Stripe Link).
 * Returns the first adapter with a non-default initEarly(), or null.
 */
export function getEarlyInitAdapter() {
  return adapters.find(a =>
    typeof a.initEarly === 'function' &&
    a.initEarly !== BasePaymentAdapter.prototype.initEarly
  ) ?? null;
}

/**
 * Check if any registered adapter handles this method code.
 * Used by the checkout controller to know whether to show a payment fields container.
 */
export function hasAdapter(methodCode) {
  return adapters.some(a => a.match(methodCode));
}

/**
 * Collect all method codes that are absorbed by registered adapters.
 * Absorbed methods are handled inline by another adapter (e.g. Google Pay / Apple Pay
 * are handled by the Payment Request Button inside the Stripe card adapter).
 * These should be hidden from the payment method list.
 */
export function getAbsorbedMethods() {
  const absorbed = new Set();
  for (const a of adapters) {
    if (typeof a.absorbedMethods === 'function') {
      for (const code of a.absorbedMethods()) {
        absorbed.add(code);
      }
    }
  }
  return absorbed;
}