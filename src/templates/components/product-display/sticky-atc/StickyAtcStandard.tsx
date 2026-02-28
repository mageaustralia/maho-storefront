/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { formatPrice } from '../../../../utils/format';

interface StickyAtcProps {
  productName: string;
  price: number;
  finalPrice?: number;
  sku: string;
  currency?: string;
}

/**
 * Sticky Add to Cart Bar
 *
 * Fixed bottom bar that appears when the user scrolls past the main
 * add-to-cart section. Shows product name, price, and an "Add to Cart" button.
 * Hidden by default — Stimulus controller toggles visibility on scroll.
 */
export const StickyAtcStandard: FC<StickyAtcProps> = ({
  productName,
  price,
  finalPrice,
  sku,
  currency = 'AUD',
}) => {
  const hasDiscount = finalPrice !== undefined && finalPrice < price;
  const displayPrice = finalPrice ?? price;

  return (
    <div
      class="fixed bottom-0 inset-x-0 z-50 translate-y-full transition-transform duration-300 bg-base-100 border-t border-base-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
      data-controller="product"
      data-product-target="stickyAtc"
      data-product-sku-value={sku}
    >
      <div class="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Product info */}
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{productName}</p>
          <div class="flex items-baseline gap-2">
            {hasDiscount ? (
              <>
                <span class="text-base font-bold text-error">{formatPrice(displayPrice, currency)}</span>
                <span class="text-xs line-through text-base-content/40">{formatPrice(price, currency)}</span>
              </>
            ) : (
              <span class="text-base font-bold">{formatPrice(displayPrice, currency)}</span>
            )}
          </div>
        </div>

        {/* Add to Cart button */}
        <button
          class="btn btn-primary btn-sm sm:btn-md shrink-0"
          data-action="product#addToCart"
          data-product-sku-param={sku}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};