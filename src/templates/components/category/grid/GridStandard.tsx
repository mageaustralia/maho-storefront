/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product } from '../../../../types';
import { ProductCard } from '../../product-display/card/index';

export interface CategoryGridProps {
  products: Product[];
  currency: string;
  currentPage: number;
  totalPages: number;
}

/**
 * Standard product grid — responsive 2/3 columns with pagination.
 * Wired to category-filter Stimulus controller for dynamic updates.
 */
export const GridStandard: FC<CategoryGridProps> = ({ products, currency, currentPage, totalPages }) => (
  <>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4" data-category-filter-target="grid">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} currency={currency} priority={i < 4} />
      ))}
    </div>

    {products.length === 0 && (
      <div class="text-center py-16 text-base-content/60">
        <p>No products found in this category.</p>
      </div>
    )}

    {totalPages > 1 && (
      <nav class="flex items-center justify-center gap-4 mt-8" aria-label="Page navigation" data-category-filter-target="bottomPagination">
        <button class="btn btn-sm btn-outline" disabled={currentPage <= 1}
          data-action="click->category-filter#prevPage">Previous</button>
        <span class="text-sm text-base-content/60" data-category-filter-target="bottomPageInfo">Page {currentPage} of {totalPages}</span>
        <button class="btn btn-sm btn-outline" disabled={currentPage >= totalPages}
          data-action="click->category-filter#nextPage">Next</button>
      </nav>
    )}
  </>
);