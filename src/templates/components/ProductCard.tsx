/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product } from '../../types';
import { formatPrice } from '../../utils/format';

interface ProductCardProps {
  product: Product;
  currency?: string;
  priority?: boolean;
}

export const ProductCard: FC<ProductCardProps> = ({ product, currency = 'AUD', priority = false }) => {
  const hasDiscount = product.specialPrice !== null && product.specialPrice < (product.price ?? 0);
  const displayPrice = product.finalPrice ?? product.price;
  const needsOptions = ['configurable', 'grouped', 'bundle', 'downloadable'].includes(product.type) || product.hasRequiredOptions;
  const isOutOfStock = product.stockStatus === 'out_of_stock';
  const productUrl = `/${product.urlKey}`;

  return (
    <article class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full" data-product-id={String(product.id)} data-product-sku={product.sku}>
      <a href={productUrl} data-turbo-prefetch="true" class="flex flex-col flex-1">
        <figure class="relative aspect-square bg-[var(--product-image-bg)] overflow-hidden">
          {product.thumbnailUrl ? (
            <img src={product.thumbnailUrl} alt={product.name} loading={priority ? 'eager' : 'lazy'} decoding={priority ? 'sync' : 'async'} fetchpriority={priority ? 'high' : undefined} class="w-full h-full object-contain mix-blend-multiply" />
          ) : (
            <span class="absolute inset-0 flex items-center justify-center text-base-content/30 text-sm">No Image</span>
          )}
          {hasDiscount && <span class="badge badge-error absolute top-2 left-2 text-white">Sale</span>}
          {isOutOfStock && <span class="badge bg-base-300 text-base-content absolute top-2 left-2">Out of Stock</span>}
        </figure>
        <div class="card-body p-3 gap-1.5 flex-1">
          <h3 class="text-sm font-medium line-clamp-2">{product.name}</h3>
          <div class="flex items-baseline gap-2 text-sm">
            {hasDiscount ? (
              <>
                <span class="line-through text-base-content/40">{formatPrice(product.price, currency)}</span>
                <span class="font-semibold text-error">{formatPrice(product.specialPrice, currency)}</span>
              </>
            ) : (
              <span class="font-semibold">{formatPrice(displayPrice, currency)}</span>
            )}
          </div>
          {product.reviewCount > 0 && (
            <div class="flex items-center gap-1 text-xs text-base-content/60">
              <span class="text-warning" style={`--rating: ${product.averageRating ?? 0}`}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span>({product.reviewCount})</span>
            </div>
          )}
        </div>
      </a>
      <div class="px-3 pb-3 mt-auto">
        {isOutOfStock ? (
          <button class="btn btn-sm btn-disabled w-full" disabled>Out of Stock</button>
        ) : needsOptions ? (
          <a href={productUrl} class="btn btn-sm btn-primary btn-outline w-full" data-turbo-prefetch="true">Select Options</a>
        ) : (
          <button class="btn btn-sm btn-primary w-full" onclick={`(async()=>{const c=localStorage.getItem('maho_cart_id');if(!c){const r=await fetch(window.MAHO_API_URL+'/api/guest-carts',{method:'POST',headers:{'Accept':'application/ld+json'}});const d=await r.json();localStorage.setItem('maho_cart_id',d.maskedId)}const m=localStorage.getItem('maho_cart_id');const r=await fetch(window.MAHO_API_URL+'/api/guest-carts/'+m+'/items',{method:'POST',headers:{'Accept':'application/ld+json','Content-Type':'application/ld+json'},body:JSON.stringify({sku:'${product.sku}',qty:1})});if(r.ok){document.dispatchEvent(new CustomEvent('cart:updated'));document.dispatchEvent(new CustomEvent('cart:open'));this.textContent='Added!';setTimeout(()=>this.textContent='Add to Cart',2000)}else{this.textContent='Error';setTimeout(()=>this.textContent='Add to Cart',2000)}})()`}>Add to Cart</button>
        )}
      </div>
    </article>
  );
};