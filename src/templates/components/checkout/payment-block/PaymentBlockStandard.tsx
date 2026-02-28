/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface PaymentBlockStandardProps {
  methods?: Array<{ id: string; label: string; icon?: string }>;
}

/**
 * Payment Block Standard
 *
 * Radio-based payment method selector. Each method is displayed in a bordered
 * card that highlights when selected. Uses DaisyUI radio styling.
 */
export const PaymentBlockStandard: FC<PaymentBlockStandardProps> = ({
  methods = [],
}) => (
  <div data-controller="checkout">
    <h3 class="text-lg font-semibold text-base-content mb-4">Payment Method</h3>

    {methods.length === 0 && (
      <p class="text-sm text-base-content/60">No payment methods available.</p>
    )}

    <div class="space-y-3">
      {methods.map((method, i) => (
        <label
          class="card card-border bg-base-100 cursor-pointer hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
        >
          <div class="card-body flex-row items-center gap-3 p-4">
            <input
              type="radio"
              name="payment[method]"
              value={method.id}
              class="radio radio-primary"
              checked={i === 0}
              data-action="change->checkout#selectPayment"
              data-checkout-target="paymentMethod"
            />
            {method.icon && (
              <img
                src={method.icon}
                alt=""
                class="w-8 h-8 object-contain"
                loading="lazy"
              />
            )}
            <span class="font-medium text-base-content">{method.label}</span>
          </div>
        </label>
      ))}
    </div>
  </div>
);