/**
 * Maho Storefront — Braintree Plugin
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * CSP sources for Braintree Hosted Fields v3 (+ Cardinal 3DS). Owned by the
 * plugin and merged via src/plugins/csp.ts. If PayPal-via-Braintree is enabled,
 * add the PayPal domains (www.paypal.com / www.paypalobjects.com / checkout).
 */

import type { PluginCsp } from '../csp';

export const BRAINTREE_CSP: PluginCsp = {
  scriptSrc: [
    'https://js.braintreegateway.com',
    'https://assets.braintreegateway.com',
    'https://songbird.cardinalcommerce.com',
    'https://songbirdstag.cardinalcommerce.com',
  ],
  connectSrc: [
    'https://api.braintreegateway.com',
    'https://api.sandbox.braintreegateway.com',
    'https://client-analytics.braintreegateway.com',
    'https://client-analytics.sandbox.braintreegateway.com',
    'https://*.braintree-api.com',
    'https://*.sandbox.braintree-api.com',
  ],
  frameSrc: [
    'https://assets.braintreegateway.com',
    'https://songbird.cardinalcommerce.com',
    'https://songbirdstag.cardinalcommerce.com',
  ],
};
