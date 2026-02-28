/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Mobile filter drawer — slides in from the left on mobile.
 * Body content is populated by category-filter Stimulus controller.
 */
export const FilterDrawer: FC = () => (
  <div class="fixed inset-0 z-50" style="display:none" data-category-filter-target="filterDrawer">
    <div class="absolute inset-0 bg-black/40" data-action="click->category-filter#closeFilterDrawer"></div>
    <div class="absolute left-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-base-100 shadow-xl flex flex-col">
      <div class="flex items-center justify-between p-4 border-b border-base-200">
        <h3 class="font-bold">Filters</h3>
        <div class="flex items-center gap-2">
          <button class="btn btn-xs btn-ghost text-error" data-action="click->category-filter#clearAllFilters" data-category-filter-target="drawerClearBtn" style="display:none">Clear All</button>
          <button class="btn btn-ghost btn-sm btn-circle" data-action="click->category-filter#closeFilterDrawer" aria-label="Close filters">&times;</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-4" data-category-filter-target="filterDrawerBody"></div>
      <div class="p-4 border-t border-base-200">
        <button class="btn btn-primary w-full" data-action="click->category-filter#closeFilterDrawer">Show Results</button>
      </div>
    </div>
  </div>
);