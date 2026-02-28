/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

/**
 * Standard pagination — Previous/Next buttons with page info.
 * Wired to category-filter Stimulus controller.
 */
export const PaginationStandard: FC<PaginationProps> = ({ currentPage, totalPages }) => {
  if (totalPages <= 1) return null;

  return (
    <nav class="flex items-center justify-center gap-4 mt-8" aria-label="Page navigation" data-category-filter-target="bottomPagination">
      <button class="btn btn-sm btn-outline" disabled={currentPage <= 1}
        data-action="click->category-filter#prevPage">Previous</button>
      <span class="text-sm text-base-content/60" data-category-filter-target="bottomPageInfo">Page {currentPage} of {totalPages}</span>
      <button class="btn btn-sm btn-outline" disabled={currentPage >= totalPages}
        data-action="click->category-filter#nextPage">Next</button>
    </nav>
  );
};