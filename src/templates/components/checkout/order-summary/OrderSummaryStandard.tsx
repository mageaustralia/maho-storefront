/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface OrderSummaryStandardProps {
  items?: Array<{ name: string; qty: number; price: number; image?: string }>;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  total?: number;
  currency?: string;
}

/**
 * Order Summary Standard
 *
 * Right-side checkout summary panel showing line items with thumbnails
 * and a subtotal/shipping/tax/total breakdown. Uses DaisyUI card.
 */
export const OrderSummaryStandard: FC<OrderSummaryStandardProps> = ({
  items = [],
  subtotal = 0,
  shipping,
  tax = 0,
  total = 0,
  currency = '$',
}) => {
  const formatPrice = (amount: number) => `${currency}${amount.toFixed(2)}`;

  return (
    <div class="card bg-base-200" data-controller="checkout">
      <div class="card-body">
        <h3 class="card-title text-lg">Order Summary</h3>

        {items.length > 0 && (
          <ul class="divide-y divide-base-300">
            {items.map((item) => (
              <li class="flex items-center gap-3 py-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    class="w-12 h-12 object-cover rounded"
                    loading="lazy"
                  />
                )}
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-base-content truncate">{item.name}</p>
                  <p class="text-xs text-base-content/60">Qty: {item.qty}</p>
                </div>
                <span class="text-sm font-medium" data-checkout-target="lineTotal">
                  {formatPrice(item.price * item.qty)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {items.length === 0 && (
          <p class="text-sm text-base-content/60 py-4">No items in order.</p>
        )}

        <div class="divider my-1"></div>

        <dl class="space-y-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-base-content/70">Subtotal</dt>
            <dd data-checkout-target="subtotal">{formatPrice(subtotal)}</dd>
          </div>

          <div class="flex justify-between">
            <dt class="text-base-content/70">Shipping</dt>
            <dd data-checkout-target="shipping">
              {shipping !== undefined ? formatPrice(shipping) : 'Calculated at next step'}
            </dd>
          </div>

          <div class="flex justify-between">
            <dt class="text-base-content/70">Tax</dt>
            <dd data-checkout-target="tax">{formatPrice(tax)}</dd>
          </div>

          <div class="divider my-1"></div>

          <div class="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd data-checkout-target="total">{formatPrice(total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};