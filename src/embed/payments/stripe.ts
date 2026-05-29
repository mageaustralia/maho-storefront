/**
 * Maho Storefront — Embeddable Widget — Stripe payment adapter
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Stripe Card adapter. All Stripe.js / Elements / 3DS logic lives here — the
 * checkout flow has no Stripe-specific code. This mirrors the storefront's
 * "Stripe is a plugin, not core" boundary at the embed-widget level.
 */

import type { PaymentAdapter, PaymentHost } from './adapter';

const STRIPE_JS_URL = 'https://js.stripe.com/v3/';

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
  ));
}

export class StripeCardAdapter implements PaymentAdapter {
  readonly code = 'stripe_card';

  private stripe: any = null;
  private elements: any = null;
  private cardElement: any = null;
  private complete = false;

  async mount(container: HTMLElement, host: PaymentHost): Promise<void> {
    try {
      // Load Stripe.js if needed
      if (!(window as any).Stripe) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = STRIPE_JS_URL;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Stripe'));
          document.head.appendChild(script);
        });
      }

      // Get publishable key (pre-loaded from /embed/products response)
      if (!host.api.stripePublishableKey) {
        // Fallback: try fetching from API
        const config = await host.api.getStripeConfig();
        if (!config?.publishableKey) {
          container.innerHTML = '<p style="font-size:13px;color:var(--maho-error)">Payment not configured.</p>';
          return;
        }
        host.api.stripePublishableKey = config.publishableKey;
      }

      this.stripe = (window as any).Stripe(host.api.stripePublishableKey);
      this.elements = this.stripe.elements();
      this.cardElement = this.elements.create('card', {
        style: {
          base: {
            fontSize: '15px',
            color: '#1f2937',
            '::placeholder': { color: '#9ca3af' },
          },
        },
      });

      container.innerHTML = '';
      this.cardElement.mount(container);

      this.cardElement.on('change', (event: any) => {
        this.complete = event.complete;
        host.setReady(event.complete);
        if (event.error) host.showError(event.error.message);
      });
    } catch (err: any) {
      container.innerHTML = `<p style="font-size:13px;color:var(--maho-error)">${escHtml(err.message || 'Payment error')}</p>`;
    }
  }

  async confirm(host: PaymentHost): Promise<Record<string, unknown> | null> {
    if (!this.stripe || !this.cardElement) return null;
    if (!this.complete) throw new Error('Please complete your card details.');

    // Create PaymentIntent (pass shipping info so backend can calculate correct total)
    const pi = await host.api.createPaymentIntent(host.getCartId(), host.getSelectedShipping(), host.buildAddress());

    // Confirm card payment (handles 3DS)
    const result = await this.stripe.confirmCardPayment(pi.clientSecret, {
      payment_method: { card: this.cardElement },
    });

    if (result.error) throw new Error(result.error.message || 'Payment failed.');

    return { stripe_payment_intent_id: result.paymentIntent.id };
  }

  teardown(): void {
    // Stripe elements can't survive being hidden — destroy on close.
    if (this.cardElement) {
      try { this.cardElement.destroy(); } catch {}
      this.cardElement = null;
    }
    this.elements = null;
    this.stripe = null;
    this.complete = false;
  }
}
