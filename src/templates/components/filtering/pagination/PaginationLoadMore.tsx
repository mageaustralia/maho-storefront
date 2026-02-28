/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { PaginationProps } from './PaginationStandard';

/**
 * Load More pagination — single button to load next page inline.
 * Stimulus controller appends products to existing grid instead of replacing.
 */
export const PaginationLoadMore: FC<PaginationProps> = ({ currentPage, totalPages }) => {
  if (currentPage >= totalPages) return null;

  return (
    <div class="flex justify-center mt-8" data-category-filter-target="bottomPagination">
      <button class="btn btn-outline btn-wide"
        data-action="click->category-filter#loadMore">
        Load More Products
      </button>
    </div>
  );
};