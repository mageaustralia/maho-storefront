/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product as ProductType } from '../../../../types';
import { sanitizeCmsHtml } from '../../../../utils/sanitize-html';
import { ProductOptions } from '../../product-options';
import { GatedPrice } from '../../GatedPrice';

interface InfoPanelCompactProps {
  product: ProductType;
  currency: string;
  formatPrice: (amount: number | null, currency: string) => string;
  swatchMap?: Record<string, string>;
}

/**
 * Compact Info Panel
 *
 * Slim sidebar-friendly product info: title, SKU, rating, price, stock,
 * short description, configurable/grouped/bundle/downloadable/custom options,
 * and add-to-cart. Designed for narrow column layouts (~35% width).
 */
export const InfoPanelCompact: FC<InfoPanelCompactProps> = ({ product, currency, formatPrice, swatchMap = {} }) => {
  const hasDiscount = product.specialPrice !== null && product.specialPrice < (product.price ?? 0);
  const displayPrice = product.finalPrice ?? product.price;
  const isConfigurable = product.type === 'configurable' && product.configurableOptions?.length > 0;
  const isGrouped = product.type === 'grouped' && product.groupedProducts?.length;
  const isBundle = product.type === 'bundle' && product.bundleOptions?.length;
  const isDownloadable = product.type === 'downloadable' && product.downloadableLinks?.length;
  const isGiftcard = product.type === 'giftcard';
  const hasCustomOptions = product.customOptions?.length > 0;

  return (
    <div class="flex flex-col gap-5">
      {/* Title + SKU */}
      <div>
        <h1 class="text-xl font-bold leading-tight mb-1">{product.name}</h1>
        <p class="text-xs text-base-content/40" data-product-target="sku">SKU: {product.sku}</p>
      </div>

      {/* Rating */}
      {product.reviewCount > 0 && (
        <a href="#accordion-reviews" class="flex items-center gap-2 text-sm no-underline">
          <span class="stars" style={`--rating: ${product.averageRating ?? 0}`}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
          <span class="text-base-content/60">{product.reviewCount} reviews</span>
        </a>
      )}

      {/* Price */}
      {!isGrouped && (
        <div data-product-target="price">
          <GatedPrice product={product} class="text-2xl font-bold text-base-content/60">
            {isBundle ? (
              <div>
                {product.minimalPrice && (
                  <div>
                    <span class="text-sm text-base-content/60">From </span>
                    <span class="text-2xl font-bold text-primary">{formatPrice(product.minimalPrice, currency)}</span>
                  </div>
                )}
                <div class="text-sm mt-1" data-product-target="bundleConfiguredPrice" style="display:none">
                  <span class="text-base-content/60">Price as configured: </span>
                  <span class="font-bold text-lg" data-product-target="bundleTotal"></span>
                </div>
              </div>
            ) : hasDiscount ? (
              <div class="flex items-baseline gap-3">
                <span class="text-2xl font-bold text-error">{formatPrice(product.specialPrice, currency)}</span>
                <span class="text-base text-base-content/40 line-through">{formatPrice(product.price, currency)}</span>
              </div>
            ) : (
              <span class="text-2xl font-bold text-primary">{formatPrice(displayPrice, currency)}</span>
            )}
          </GatedPrice>
        </div>
      )}

      {/* Stock */}
      <div data-product-target="stock">
        {product.stockStatus === 'in_stock' ? (
          <span class="flex items-center gap-1.5 text-sm text-success">
            <span class="w-2 h-2 rounded-full bg-success inline-block"></span>
            In Stock
          </span>
        ) : (
          <span class="flex items-center gap-1.5 text-sm text-error">
            <span class="w-2 h-2 rounded-full bg-error inline-block"></span>
            Out of Stock
          </span>
        )}
      </div>

      {/* Short description */}
      {product.shortDescription && (
        <div class="text-sm text-base-content/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(product.shortDescription) }} />
      )}

      {/* Product-type-specific options + custom options */}
      <ProductOptions product={product} currency={currency} formatPrice={formatPrice} swatchMap={swatchMap} />

      {/* Add to Cart */}
      <div data-product-target="actionsSticky">
        {product.stockStatus === 'in_stock' ? (
          <div class="flex flex-col gap-3">
            {!isGrouped && !isBundle && (
              <div class="flex items-center gap-3">
                <div class="join">
                  <button type="button" class="btn btn-sm join-item" data-action="product#decrementQty" aria-label="Decrease quantity">-</button>
                  <input type="number" value="1" min="1" max="99" class="input input-sm join-item w-14 text-center" data-product-target="qty" />
                  <button type="button" class="btn btn-sm join-item" data-action="product#incrementQty" aria-label="Increase quantity">+</button>
                </div>
                <button class="wishlist-btn" data-action="click->wishlist#toggle" data-product-id={String(product.id)} aria-label="Add to Wishlist" style="width:36px;height:36px;flex-shrink:0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            )}
            <button class="btn btn-primary w-full" data-action="product#stickyAdd" data-product-target="addButton">
              Add to Cart
            </button>
            <div class="text-sm text-center" data-product-target="message"></div>
          </div>
        ) : (
          <div class="flex items-center gap-3">
            <button class="btn btn-disabled w-full" disabled>Out of Stock</button>
            <button class="wishlist-btn" data-action="click->wishlist#toggle" data-product-id={String(product.id)} aria-label="Add to Wishlist" style="width:36px;height:36px;flex-shrink:0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
