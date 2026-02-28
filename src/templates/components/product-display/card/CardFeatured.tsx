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
 * Featured Product Card
 *
 * Larger, more prominent card for hero/spotlight positions.
 * Bigger image, larger text, rating stars, "Quick Add" button, and sale badge.
 */
export const CardFeatured: FC<ProductCardProps> = ({ product, currency = 'AUD', priority = false }) => {
  const hasDiscount = product.specialPrice !== null && product.specialPrice < (product.price ?? 0);
  const displayPrice = product.finalPrice ?? product.price;
  const needsOptions = ['configurable', 'grouped', 'bundle', 'downloadable'].includes(product.type) || product.hasRequiredOptions;
  const isOutOfStock = product.stockStatus === 'out_of_stock';
  const productUrl = `/${product.urlKey}`;
  const savingsPercent = hasDiscount && product.price
    ? Math.round((1 - (product.specialPrice! / product.price)) * 100)
    : 0;

  return (
    <article
      class="card bg-base-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full group"
      data-product-id={String(product.id)}
      data-product-sku={product.sku}
    >
      <a href={productUrl} data-turbo-prefetch="true" class="flex flex-col flex-1">
        {/* Larger image area */}
        <figure class="relative aspect-[4/5] bg-[var(--product-image-bg)] overflow-hidden">
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              decoding={priority ? 'sync' : 'async'}
              fetchpriority={priority ? 'high' : undefined}
              class="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <span class="absolute inset-0 flex items-center justify-center text-base-content/30 text-base">No Image</span>
          )}
          {/* Sale badge with percentage */}
          {hasDiscount && (
            <div class="absolute top-3 left-3 flex flex-col gap-1">
              <span class="badge badge-error text-white font-bold px-3 py-1">Sale</span>
              {savingsPercent > 0 && (
                <span class="badge badge-error badge-outline bg-base-100/90 font-semibold text-xs">
                  Save {savingsPercent}%
                </span>
              )}
            </div>
          )}
          {isOutOfStock && (
            <span class="badge bg-base-300 text-base-content absolute top-3 left-3 px-3 py-1">Out of Stock</span>
          )}
        </figure>

        <div class="card-body p-4 gap-2 flex-1">
          {/* Product name — larger text */}
          <h3 class="text-base font-semibold leading-snug line-clamp-2">{product.name}</h3>

          {/* Star ratings — always shown for featured */}
          <div class="flex items-center gap-1.5">
            {product.reviewCount > 0 ? (
              <>
                <div class="rating rating-sm rating-half pointer-events-none">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const rating = product.averageRating ?? 0;
                    const filled = rating >= star;
                    const half = !filled && rating >= star - 0.5;
                    return (
                      <span
                        key={star}
                        class={`text-warning ${filled ? 'opacity-100' : half ? 'opacity-60' : 'opacity-20'}`}
                      >
                        &#9733;
                      </span>
                    );
                  })}
                </div>
                <span class="text-xs text-base-content/60">({product.reviewCount})</span>
              </>
            ) : (
              <span class="text-xs text-base-content/40">No reviews yet</span>
            )}
          </div>

          {/* Price — larger for featured */}
          <div class="flex items-baseline gap-2 mt-1">
            {hasDiscount ? (
              <>
                <span class="text-lg font-bold text-error">{formatPrice(product.specialPrice, currency)}</span>
                <span class="line-through text-base-content/40 text-sm">{formatPrice(product.price, currency)}</span>
              </>
            ) : (
              <span class="text-lg font-bold">{formatPrice(displayPrice, currency)}</span>
            )}
          </div>
        </div>
      </a>

      {/* Quick Add button area */}
      <div class="px-4 pb-4 mt-auto">
        {isOutOfStock ? (
          <button class="btn btn-disabled w-full" disabled>Out of Stock</button>
        ) : needsOptions ? (
          <a href={productUrl} class="btn btn-primary btn-outline w-full" data-turbo-prefetch="true">Select Options</a>
        ) : (
          <button
            class="btn btn-primary w-full"
            onclick={`(async()=>{const c=localStorage.getItem('maho_cart_id');if(!c){const r=await fetch(window.MAHO_API_URL+'/api/guest-carts',{method:'POST',headers:{'Accept':'application/ld+json'}});const d=await r.json();localStorage.setItem('maho_cart_id',d.maskedId||d.id)}const m=localStorage.getItem('maho_cart_id');const r=await fetch(window.MAHO_API_URL+'/api/guest-carts/'+m+'/items',{method:'POST',headers:{'Accept':'application/ld+json','Content-Type':'application/ld+json'},body:JSON.stringify({sku:'${product.sku}',qty:1})});if(r.ok){document.dispatchEvent(new CustomEvent('cart:updated'));document.dispatchEvent(new CustomEvent('cart:open'));this.textContent='Added!';setTimeout(()=>this.textContent='Quick Add',2000)}else{this.textContent='Error';setTimeout(()=>this.textContent='Quick Add',2000)}})()`}
          >
            Quick Add
          </button>
        )}
      </div>
    </article>
  );
};