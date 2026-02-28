/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { RelatedProduct } from '../../../../types';
import { formatPrice } from '../../../../utils/format';

interface CardHorizontalProps {
  product: RelatedProduct;
  currency: string;
}

/**
 * Horizontal Product Card
 *
 * Image left, details right. Good for search results, wishlists,
 * and sidebar recommendations where vertical space is limited.
 */
export const CardHorizontal: FC<CardHorizontalProps> = ({ product, currency }) => {
  const hasDiscount = product.specialPrice !== null && product.specialPrice !== undefined && product.specialPrice < (product.price ?? 0);
  const displayPrice = product.finalPrice ?? product.price;

  return (
    <a
      href={`/${product.urlKey}`}
      class="flex gap-4 p-3 bg-base-100 rounded-lg border border-base-200 no-underline text-base-content hover:border-base-300 hover:shadow-sm transition-all group"
      data-turbo-prefetch="true"
    >
      {/* Image */}
      <div class="w-24 h-24 shrink-0 bg-[var(--product-image-bg)] rounded-md overflow-hidden">
        {product.thumbnailUrl ? (
          <img
            src={product.thumbnailUrl}
            alt={product.name}
            loading="lazy"
            class="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div class="w-full h-full flex items-center justify-center text-base-content/20 text-xs">No Image</div>
        )}
      </div>

      {/* Details */}
      <div class="flex flex-col justify-center gap-1 min-w-0">
        <h3 class="text-sm font-medium line-clamp-2 leading-snug">{product.name}</h3>
        <div class="flex items-baseline gap-2">
          {hasDiscount ? (
            <>
              <span class="text-sm font-semibold text-error">{formatPrice(product.specialPrice!, currency)}</span>
              <span class="text-xs line-through text-base-content/40">{formatPrice(product.price, currency)}</span>
            </>
          ) : (
            <span class="text-sm font-semibold">{formatPrice(displayPrice, currency)}</span>
          )}
        </div>
        {product.stockStatus === 'out_of_stock' && (
          <span class="text-xs text-base-content/50">Out of stock</span>
        )}
      </div>
    </a>
  );
};