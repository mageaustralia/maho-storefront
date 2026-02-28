/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface ToolbarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

/**
 * Category toolbar — sort, per-page, mobile filter toggle, and top pagination.
 * Wired to the category-filter Stimulus controller.
 */
export const ToolbarStandard: FC<ToolbarProps> = ({ currentPage, totalPages }) => (
  <div class="flex items-center gap-2 mb-4">
    <button class="btn btn-sm btn-outline gap-2 lg:hidden shrink-0" data-action="click->category-filter#openFilterDrawer">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 4h12M4 8h8M6 12h4"/>
      </svg>
      Filters
    </button>
    {totalPages > 1 && (
      <div class="hidden sm:flex items-center gap-1 shrink-0" data-category-filter-target="topPagination">
        <button class="btn btn-xs btn-ghost" disabled={currentPage <= 1}
          data-action="click->category-filter#prevPage">Prev</button>
        <span class="text-xs text-base-content/60" data-category-filter-target="topPageInfo">{currentPage}/{totalPages}</span>
        <button class="btn btn-xs btn-ghost" disabled={currentPage >= totalPages}
          data-action="click->category-filter#nextPage">Next</button>
      </div>
    )}
    <div class="ml-auto flex items-center gap-2">
      <label for="perpage-select" class="sr-only">Products per page</label>
      <select id="perpage-select" class="select select-xs sm:select-sm hidden sm:inline-flex" data-category-filter-target="perPage" data-action="change->category-filter#onPerPageChange">
        <option value="12">12 per page</option>
        <option value="24">24 per page</option>
        <option value="48">48 per page</option>
        <option value="96">96 per page</option>
      </select>
      <label for="sort-select" class="sr-only">Sort order</label>
      <select id="sort-select" class="select select-xs sm:select-sm" data-category-filter-target="sort" data-action="change->category-filter#onSortChange">
        <option value="">Sort by</option>
        <option value="position-asc">Featured</option>
        <option value="created_at-desc">Newest</option>
        <option value="name-asc">Name: A-Z</option>
        <option value="name-desc">Name: Z-A</option>
        <option value="price-asc">Price: Low-High</option>
        <option value="price-desc">Price: High-Low</option>
      </select>
    </div>
  </div>
);