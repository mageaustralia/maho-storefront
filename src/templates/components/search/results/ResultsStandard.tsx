/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product } from '../../../../types';
import { ProductCard } from '../../product-display/card/index';

export interface SearchResultsProps {
  query: string;
  products: Product[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  currency: string;
}

/**
 * Standard search results — search form + product grid + pagination.
 */
export const ResultsStandard: FC<SearchResultsProps> = ({ query, products, totalItems, currentPage, totalPages, currency }) => (
  <>
    {/* Search form */}
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight mb-4">{query ? `Search results for "${query}"` : 'Search'}</h1>
      <form action="/search" method="get" class="flex gap-2 max-w-xl">
        <input
          type="text"
          name="q"
          value={query}
          placeholder="Search products..."
          autofocus={!query}
          class="input input-bordered flex-1"
        />
        <button type="submit" class="btn btn-primary">Search</button>
      </form>
      {query && <p class="text-sm text-base-content/60 mt-2">{totalItems} products found</p>}
    </div>
    {query ? (
      products.length > 0 ? (
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} currency={currency} />
          ))}
        </div>
      ) : (
        <div class="text-center py-16">
          <p class="text-base-content/60 mb-6">No products match your search.</p>
          <a href="/" class="btn btn-primary">Continue Shopping</a>
        </div>
      )
    ) : (
      <p class="text-base-content/60">Enter a search term above to find products.</p>
    )}
    {totalPages > 1 && (
      <nav class="flex items-center justify-center gap-4 mt-8" aria-label="Page navigation">
        {currentPage > 1 && (
          <a href={`/search?q=${encodeURIComponent(query)}&page=${currentPage - 1}`} class="btn btn-sm btn-outline" data-turbo-prefetch="true">&larr; Previous</a>
        )}
        <span class="text-sm text-base-content/60">Page {currentPage} of {totalPages}</span>
        {currentPage < totalPages && (
          <a href={`/search?q=${encodeURIComponent(query)}&page=${currentPage + 1}`} class="btn btn-sm btn-outline" data-turbo-prefetch="true">Next &rarr;</a>
        )}
      </nav>
    )}
  </>
);