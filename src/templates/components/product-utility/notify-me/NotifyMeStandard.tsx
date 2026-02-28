/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface NotifyMeStandardProps {
  productId: string;
  productName?: string;
}

/**
 * Notify Me Standard
 *
 * Inline email signup form for back-in-stock notifications.
 * Shown when a product is out of stock. Uses Stimulus `notify-me` controller.
 */
export const NotifyMeStandard: FC<NotifyMeStandardProps> = ({ productId, productName }) => (
  <div
    class="my-4 p-4 bg-base-200 rounded-lg"
    data-controller="notify-me"
    data-notify-me-product-id-value={productId}
  >
    <p class="text-sm font-semibold text-base-content mb-1">Out of Stock</p>
    {productName && (
      <p class="text-xs text-base-content/60 mb-3">
        Get notified when <span class="font-medium">{productName}</span> is back in stock.
      </p>
    )}
    {!productName && (
      <p class="text-xs text-base-content/60 mb-3">
        Enter your email to be notified when this product is back in stock.
      </p>
    )}
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Email Address</legend>
      <div class="flex gap-2">
        <label class="input w-full">
          <input
            type="email"
            class="grow"
            placeholder="your@email.com"
            data-notify-me-target="email"
            required
          />
        </label>
        <button
          class="btn btn-primary btn-sm"
          data-action="click->notify-me#submit"
        >
          Notify Me
        </button>
      </div>
    </fieldset>
    <div
      class="hidden mt-2 text-sm text-success"
      data-notify-me-target="confirmation"
    >
      You'll be notified when this product is available.
    </div>
  </div>
);