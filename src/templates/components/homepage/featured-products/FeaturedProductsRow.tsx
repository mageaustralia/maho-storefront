/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface FeaturedProduct {
  id: number;
  name: string;
  urlKey: string;
  price: number;
  finalPrice?: number;
  thumbnailUrl?: string;
}

export interface FeaturedProductsProps {
  heading: string;
  viewAllUrl?: string;
  products: FeaturedProduct[];
}

/**
 * Featured Products Row
 *
 * Horizontal scrolling row of product cards with scroll-snap.
 * Reusable for any product collection — "New Arrivals", "Trending",
 * "Bestsellers" — just pass different heading and product data.
 */
export const FeaturedProductsRow: FC<FeaturedProductsProps> = ({
  heading,
  viewAllUrl,
  products,
}) => {
  if (!products || products.length === 0) return null;

  return (
    <section class="py-8 md:py-12 bg-base-100">
      <div class="container mx-auto px-4">
        {/* Section header */}
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl md:text-2xl font-bold">{heading}</h2>
          {viewAllUrl && (
            <a href={viewAllUrl} class="btn btn-ghost btn-sm gap-1">
              View All
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </a>
          )}
        </div>

        {/* Scrolling product row */}
        <div class="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4">
          {products.map((product) => {
            const hasDiscount = product.finalPrice && product.finalPrice < product.price;

            return (
              <article
                class="card bg-base-100 shadow-sm min-w-[200px] max-w-[220px] snap-start shrink-0"
                key={product.id}
              >
                <a href={`/${product.urlKey}`}>
                  <figure class="aspect-square bg-base-200">
                    {product.thumbnailUrl ? (
                      <img
                        src={product.thumbnailUrl}
                        alt={product.name}
                        class="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div class="w-full h-full flex items-center justify-center text-base-content/20">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </figure>
                  <div class="card-body p-3 gap-1">
                    <h3 class="text-sm font-medium line-clamp-2">{product.name}</h3>
                    <div class="flex items-center gap-2">
                      {hasDiscount ? (
                        <>
                          <span class="text-sm font-semibold text-error">
                            ${product.finalPrice!.toFixed(2)}
                          </span>
                          <span class="text-xs line-through opacity-50">
                            ${product.price.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span class="text-sm font-semibold">
                          ${product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};