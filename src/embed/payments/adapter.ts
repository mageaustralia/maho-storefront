/**
 * Maho Storefront — Embeddable Widget — Payment adapters
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Payment-gateway abstraction for the embed checkout. The checkout flow is
 * payment-agnostic — it mounts whatever adapter matches the selected payment
 * method and asks it to confirm. Gateways (Stripe, …) live in their own adapter
 * modules so no gateway is hardcoded into the checkout flow.
 */

import type { EmbedApi } from '../api';

/** Callbacks + accessors the checkout flow exposes to a mounted adapter. */
export interface PaymentHost {
  /** The embed API client (transport + gateway endpoint helpers). */
  readonly api: EmbedApi;
  /** Current guest cart id. */
  getCartId(): string;
  /** Selected shipping method code (so the gateway can compute the right total). */
  getSelectedShipping(): string;
  /** The address payload for the order/payment. */
  buildAddress(): any;
  /** Enable/disable the "Pay" button (e.g. once card input is complete). */
  setReady(ready: boolean): void;
  /** Surface a gateway error in the payment step. */
  showError(message: string): void;
}

/**
 * One payment gateway's client-side integration. `mount` renders the input UI;
 * `confirm` performs any client-side authorisation (e.g. Stripe 3DS) and
 * returns the `paymentData` to pass to place-order (or null if none); `teardown`
 * disposes of any gateway SDK state.
 */
export interface PaymentAdapter {
  /** Backend payment-method code this adapter handles (e.g. 'stripe_card'). */
  readonly code: string;
  mount(container: HTMLElement, host: PaymentHost): Promise<void>;
  confirm(host: PaymentHost): Promise<Record<string, unknown> | null>;
  teardown(): void;
}
