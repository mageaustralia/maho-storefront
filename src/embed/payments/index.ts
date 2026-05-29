/**
 * Maho Storefront — Embeddable Widget — Payment adapter registry
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Maps a backend payment-method code to its client-side adapter. Add a gateway
 * by writing an adapter module and registering it here — the checkout flow
 * doesn't change. Methods with no client adapter (offline/redirect) return null.
 */

import type { PaymentAdapter } from './adapter';
import { StripeCardAdapter } from './stripe';

export function createPaymentAdapter(code: string): PaymentAdapter | null {
  switch (code) {
    case 'stripe_card':
      return new StripeCardAdapter();
    default:
      return null;
  }
}

export type { PaymentAdapter, PaymentHost } from './adapter';
