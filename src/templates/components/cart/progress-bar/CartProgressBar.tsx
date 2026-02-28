/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface CartProgressBarProps {
  threshold?: number;
  currency?: string;
}

/**
 * Cart Progress Bar — Free Shipping Threshold
 *
 * Shows how close the customer is to free shipping.
 * Uses DaisyUI progress component. Updated client-side by cart controller.
 */
export const CartProgressBar: FC<CartProgressBarProps> = ({
  threshold = 100,
  currency = 'AUD',
}) => {
  const formatted = new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(threshold);

  return (
    <div class="px-4 py-3 bg-base-200/50 border-b border-base-200" data-cart-progress-target="wrap">
      <div class="flex items-center justify-between text-xs mb-1.5">
        <span class="text-base-content/60" data-cart-progress-target="message">
          Spend {formatted} for free shipping
        </span>
        <span class="font-medium text-base-content/80" data-cart-progress-target="amount"></span>
      </div>
      <progress
        class="progress progress-primary w-full h-2"
        value="0"
        max="100"
        data-cart-progress-target="bar"
      ></progress>
    </div>
  );
};