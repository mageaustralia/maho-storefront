/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product, Category, StoreConfig, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';
import { ProductCard } from './components/product-display/card/index';

interface SearchResultsPageProps {
  config: StoreConfig;
  categories: Category[];
  query: string;
  products: Product[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const SearchResultsPage: FC<SearchResultsPageProps> = ({ config, categories, query, products, totalItems, currentPage, totalPages, stores, currentStoreCode, devData }) => (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo title={`${query ? `Search: ${query}` : 'Search'} | ${config.storeName}`} />
    <div class="py-6">
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
              <ProductCard key={product.id} product={product} currency={config.baseCurrencyCode} />
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
    </div>
  </Layout>
);