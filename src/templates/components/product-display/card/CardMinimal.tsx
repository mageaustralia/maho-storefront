/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product } from '../../../../types';
import { formatPrice } from '../../../../utils/format';

interface ProductCardProps {
  product: Product;
  currency?: string;
  priority?: boolean;
}

/**
 * Minimal Product Card
 *
 * Clean, borderless card without shadows. Image + text only.
 * Modern aesthetic — no button, just clickable card.
 * Configurable products get hover-swatch overlay on desktop.
 */
export const ProductCard: FC<ProductCardProps> = ({ product, currency = 'USD', priority = false }) => {
  const hasDiscount = product.specialPrice !== null && product.specialPrice < (product.price ?? 0);
  const displayPrice = product.finalPrice ?? product.price;
  const isConfigurable = product.type === 'configurable';
  const isOutOfStock = product.stockStatus === 'out_of_stock';
  const productUrl = `/${product.urlKey}`;

  const hoverAttrs = isConfigurable && !isOutOfStock ? {
    'data-controller': 'hover-swatch',
    'data-hover-swatch-product-id-value': String(product.id),
    'data-hover-swatch-product-url-value': productUrl,
  } : {};

  return (
    <article class="group flex flex-col h-full relative" data-product-id={String(product.id)} data-product-sku={product.sku} {...hoverAttrs}>
      <a href={productUrl} data-turbo-prefetch="true" class="flex flex-col flex-1">
        <figure class="relative aspect-square bg-[var(--product-image-bg)] rounded-lg overflow-hidden mb-3">
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              decoding={priority ? 'sync' : 'async'}
              fetchpriority={priority ? 'high' : undefined}
              class="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span class="absolute inset-0 flex items-center justify-center text-base-content/30 text-sm">No Image</span>
          )}
          {isOutOfStock && (
            <span class="absolute top-2 left-2 text-xs font-medium text-base-content/60 bg-base-100/80 px-2 py-0.5 rounded">
              Out of Stock
            </span>
          )}
        </figure>
        <div class="flex-1 space-y-1">
          <h3 class="text-sm leading-snug line-clamp-2">{product.name}</h3>
          <div class="flex items-baseline gap-2 text-sm">
            {hasDiscount ? (
              <>
                <span class="font-semibold text-error">{formatPrice(product.specialPrice, currency)}</span>
                <span class="line-through text-base-content/40 text-xs">{formatPrice(product.price, currency)}</span>
              </>
            ) : (
              <span class="font-medium">{formatPrice(displayPrice, currency)}</span>
            )}
          </div>
        </div>
      </a>

      {/* Hover swatch overlay — only for configurable products */}
      {isConfigurable && !isOutOfStock && (
        <div
          data-hover-swatch-target="overlay"
          class="absolute inset-x-0 bottom-0 bg-base-100/95 backdrop-blur-sm flex flex-col gap-2 p-3 transition-all duration-250 ease-out hidden z-10 rounded-lg shadow-lg"
          style="transform: translateY(100%); opacity: 0"
        >
          <div data-hover-swatch-target="swatches" class="flex flex-col gap-1.5"></div>
          <div data-hover-swatch-target="actions"></div>
        </div>
      )}
    </article>
  );
};