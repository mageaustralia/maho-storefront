/**
 * Maho Storefront — Stripe Plugin
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Server-side Stripe PaymentIntent route. Extracted from the core worker entry
 * so Stripe is a self-contained, optional plugin (it is NOT part of core). The
 * route no-ops (falls through) when no Stripe secret key is configured, so a
 * store without the Maho Stripe module behaves as if this plugin isn't there.
 *
 * Requires: the Maho Stripe module exposing /api/payments/stripe/config (read
 * by syncStripeConfig), which seeds `${prefix}stripe:secretKey` in KV.
 */

import type { Hono } from 'hono';
import { CloudflareKVStore } from '../../content-store';
import type { Env, StoreConfig, StorefrontStore, WaitUntilCtx } from '../../types';

export interface StripeRouteDeps {
  getStoreContext: (c: any) => Promise<{ stores: StorefrontStore[]; currentStoreCode: string | undefined }>;
  getApiUrl: (env: Env, stores: StorefrontStore[], storeCode?: string) => string;
  getClientIP: (c: any) => string;
  rateLimitExceeded: (bucket: string, id: string, max: number, windowSec: number, ctx: WaitUntilCtx) => Promise<boolean>;
}

export function registerStripeRoutes(app: Hono<any>, deps: StripeRouteDeps): void {
  const { getStoreContext, getApiUrl, getClientIP, rateLimitExceeded } = deps;

  // CORS preflight for Stripe PaymentIntent (embed widget sends cross-origin POST)
  app.options('/api/payments/stripe/payment-intents', (c) => {
    return c.body(null, 204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    });
  });

  // Stripe PaymentIntent creation — handles both storefront and embed widget checkout.
  // Creates PaymentIntents directly via the Stripe API using the cart total from the Maho backend.
  // The Stripe secret key is synced from the Maho admin config into KV during data sync.
  app.post('/api/payments/stripe/payment-intents', async (c, next) => {
    const { stores, currentStoreCode } = await getStoreContext(c);
    const kvStore = new CloudflareKVStore(c.env.CONTENT);
    const prefix = currentStoreCode ? `${currentStoreCode}:` : '';

    // Get Stripe secret key from KV (synced during data sync) or fall back to env var
    const stripeSecretKey = await kvStore.get<string>(`${prefix}stripe:secretKey`) || c.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) return next();

    // Throttle PaymentIntent creation per IP — each call hits the live Stripe API
    // and creates a real PI, so an unbounded loop could burn Stripe quota / inflate
    // PI counts. 30 per 5 min is generous for a human (shipping/address changes
    // recreate PIs) while stopping abuse. Best-effort: only when executionCtx exists.
    if (c.executionCtx && await rateLimitExceeded('stripe-pi', getClientIP(c), 30, 300, c.executionCtx)) {
      return c.json({ error: true, message: 'Too many payment attempts. Please wait a moment and try again.' }, 429);
    }

    const apiUrl = getApiUrl(c.env, stores, currentStoreCode);

    let cartId: string;
    let shippingMethod: string | undefined;
    let shippingAddress: any;
    try {
      const body = await c.req.json() as { cartId?: string; shippingMethod?: string; shippingAddress?: any };
      cartId = body.cartId || '';
      shippingMethod = body.shippingMethod;
      shippingAddress = body.shippingAddress;
    } catch {
      return c.json({ error: true, message: 'Invalid request body' }, 400);
    }

    if (!cartId) {
      return c.json({ error: true, message: 'cartId is required' }, 400);
    }

    // Common headers for Maho API calls
    const mahoHeaders: Record<string, string> = {
      'Accept': 'application/ld+json',
      'Content-Type': 'application/ld+json',
    };
    if (currentStoreCode) mahoHeaders['X-Store-Code'] = currentStoreCode;
    if (c.env.MAHO_API_BASIC_AUTH) mahoHeaders['Authorization'] = `Basic ${btoa(c.env.MAHO_API_BASIC_AUTH)}`;

    // Compute the cart's grand total INCLUDING shipping. This has to be the
    // amount the order will eventually total to, otherwise Stripe.capture()
    // rejects the order with an amount/currency mismatch.
    //
    // Two layers of defence so different client paths all converge on the
    // right number:
    //   1. If the client passed shippingMethod + shippingAddress, post it to
    //      /shipping-methods (sets the address on the cart, returns rates)
    //      and look up the matched method's price.
    //   2. After fetching the cart, if the cart has no committed shipping_amount
    //      and the matched-price lookup didn't fire (e.g. PaymentRequestButton
    //      flow that doesn't send shipping info, or client-side race), fall
    //      back to the FIRST available shipping method on the cart.
    let shippingPrice = 0;
    if (shippingMethod && shippingAddress) {
      const methodsRes = await fetch(`${apiUrl}/api/rest/v2/guest-carts/${cartId}/shipping-methods`, {
        method: 'POST',
        headers: mahoHeaders,
        body: JSON.stringify({ address: shippingAddress }),
      });
      if (methodsRes.ok) {
        const resp = await methodsRes.json() as { availableShippingMethods?: Array<{ carrierCode: string; methodCode: string; price: number }> };
        const methods = resp.availableShippingMethods || [];
        const matched = methods.find(m => `${m.carrierCode}_${m.methodCode}` === shippingMethod);
        if (matched) shippingPrice = matched.price || 0;
      }
    }

    // Fetch cart totals from Maho backend
    const cartUrl = `${apiUrl}/api/rest/v2/guest-carts/${cartId}`;
    const cartRes = await fetch(cartUrl, { headers: { 'Accept': 'application/ld+json', ...mahoHeaders } });
    if (!cartRes.ok) {
      return c.json({ error: true, message: 'Cart not found' }, 404);
    }

    const cart = await cartRes.json() as {
      prices?: { grandTotal?: number; shippingAmount?: number | null };
      availableShippingMethods?: Array<{ carrierCode: string; methodCode: string; price: number }>;
      currency?: string;
    };
    let grandTotal = cart.prices?.grandTotal || 0;
    const cartShipping = cart.prices?.shippingAmount;

    if (!cartShipping || cartShipping === 0) {
      // Cart has no committed shipping yet — add the price we found (from
      // explicit client info), or fall back to the cart's first available
      // shipping method so the PI lines up with what place-order will charge.
      if (shippingPrice <= 0 && cart.availableShippingMethods && cart.availableShippingMethods.length > 0) {
        shippingPrice = cart.availableShippingMethods[0].price || 0;
      }
      if (shippingPrice > 0) {
        grandTotal += shippingPrice;
      }
    }

    if (!grandTotal || grandTotal <= 0) {
      return c.json({ error: true, message: 'Cart is empty or has no total' }, 400);
    }

    // Get currency from cart or store config
    const config = await kvStore.get<StoreConfig>(`${prefix}config`);
    const currency = (cart.currency || config?.defaultDisplayCurrencyCode || 'USD').toLowerCase();

    // Create PaymentIntent via Stripe API
    const amountInCents = Math.round(grandTotal * 100);
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(amountInCents),
        currency,
        'automatic_payment_methods[enabled]': 'true',
        // Auth only — actual capture happens when Maho saves the order via
        // Card.php::capture(). If order placement fails the auth is cancelled
        // (Card.php::cancel) and the customer is never charged.
        'capture_method': 'manual',
        'metadata[cart_id]': cartId,
        'metadata[source]': 'maho_storefront',
        // Multi-install discriminator: lets reconciliation jobs ignore PIs
        // that belong to a different Maho install sharing this Stripe account.
        'metadata[maho_origin]': new URL(c.req.url).origin,
      }).toString(),
    });

    if (!stripeRes.ok) {
      const stripeErr = await stripeRes.json().catch(() => ({})) as { error?: { message?: string } };
      return c.json({ error: true, message: stripeErr.error?.message || 'Stripe error' }, 500);
    }

    const pi = await stripeRes.json() as { id: string; client_secret: string };
    return c.json(
      { clientSecret: pi.client_secret, paymentIntentId: pi.id },
      200,
      { 'Access-Control-Allow-Origin': '*' },
    );
  });
}
