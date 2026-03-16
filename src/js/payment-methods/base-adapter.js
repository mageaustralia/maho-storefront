/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Base payment method adapter.
 *
 * All payment adapters extend this class. The checkout controller calls these
 * methods generically — it never knows which gateway it's talking to.
 *
 * To add a new payment gateway:
 *   1. Create src/js/payment-methods/my-gateway-adapter.js
 *   2. Extend BasePaymentAdapter and implement the methods below
 *   3. Import and register it in src/js/payment-methods/index.js
 *
 * That's it. The checkout controller doesn't need any changes.
 */
export class BasePaymentAdapter {
  /**
   * Return true if this adapter handles the given Maho payment method code.
   * @param {string} methodCode - e.g. 'gene_braintree_creditcard', 'stripe', 'checkmo'
   * @returns {boolean}
   */
  match(methodCode) {
    return false;
  }

  /**
   * Called early in checkout (at connect time) to initialize pre-payment UX.
   * Use this to replace the email field with an enhanced element (e.g. Stripe Link).
   * Return true if the adapter mounted something, false to skip.
   * @param {object} context - { emailContainer, currency, country, prefillEmail, onEmail, onAddress, onPaymentReady }
   * @returns {Promise<boolean>}
   */
  async initEarly(context) { return false; }

  /**
   * Called when this payment method is selected.
   * Load external SDKs, render card fields, mount buttons, etc.
   * @param {HTMLElement} container - The DOM element to render into
   * @param {object} context - { currency, api, formatPrice }
   * @returns {Promise<void>}
   */
  async init(container, context) {}

  /**
   * Called just before place-order.
   * Tokenize card data, get a nonce, or do any pre-submit work.
   * Return an object that gets sent as `paymentData` in the place-order API call,
   * or null if no extra data is needed (e.g. check/money order).
   * @returns {Promise<object|null>}
   */
  async tokenize() {
    return null;
  }

  /**
   * Called when the user switches away from this payment method or leaves checkout.
   * Clean up SDK instances, remove iframes, etc.
   */
  destroy() {}
}