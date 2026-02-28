/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Sort dropdown — standalone sort control for use outside the toolbar.
 */
export const SortStandard: FC = () => (
  <div class="flex items-center gap-2">
    <label for="sort-select" class="sr-only">Sort order</label>
    <select id="sort-select" class="select select-sm" data-category-filter-target="sort" data-action="change->category-filter#onSortChange">
      <option value="">Sort by</option>
      <option value="position-asc">Featured</option>
      <option value="created_at-desc">Newest</option>
      <option value="name-asc">Name: A-Z</option>
      <option value="name-desc">Name: Z-A</option>
      <option value="price-asc">Price: Low-High</option>
      <option value="price-desc">Price: High-Low</option>
    </select>
  </div>
);