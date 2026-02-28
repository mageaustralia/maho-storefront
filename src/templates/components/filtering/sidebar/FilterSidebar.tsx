/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category } from '../../../../types';

export interface FilterSidebarProps {
  category: Category;
  sidebarParent: Category | null;
  sidebarChildren: Category[];
  currency: string;
}

/**
 * Desktop filter sidebar — category nav, price range, and layered filters.
 * Filter options are populated dynamically by the category-filter Stimulus controller.
 */
export const FilterSidebar: FC<FilterSidebarProps> = ({ category, sidebarParent, sidebarChildren }) => (
  <aside class="max-lg:hidden">
    {sidebarChildren.length > 0 && (
      <div class="mb-8">
        <h2 class="font-bold uppercase tracking-wider mb-3">{sidebarParent!.name}</h2>
        <ul class="flex flex-col">
          {sidebarChildren.map((child) => (
            <li key={child.id}>
              <a
                href={`/${child.urlPath ?? child.urlKey}`}
                data-turbo-prefetch="true"
                class={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-colors ${child.id === category.id ? 'bg-primary/10 text-primary font-semibold' : 'text-base-content/70 hover:bg-base-200'}`}
              >
                {child.name}
                {child.productCount > 0 && <span class="text-base-content/35">({child.productCount})</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Price Filter */}
    <div class="mb-8">
      <h2 class="font-bold uppercase tracking-wider mb-3">Price</h2>
      <div data-category-filter-target="priceFilter">
        <div class="flex justify-between text-xs text-base-content/60 mb-1">
          <span data-category-filter-target="priceMinLabel">$0</span>
          <span data-category-filter-target="priceMaxLabel">$500+</span>
        </div>
        <div class="price-range-slider">
          <label for="price-range-min" class="sr-only">Minimum price</label>
          <input id="price-range-min" type="range" min="0" max="500" value="0" step="10" class="range-min"
            data-category-filter-target="priceMin"
            data-action="input->category-filter#onPriceChange" />
          <label for="price-range-max" class="sr-only">Maximum price</label>
          <input id="price-range-max" type="range" min="0" max="500" value="500" step="10" class="range-max"
            data-category-filter-target="priceMax"
            data-action="input->category-filter#onPriceChange" />
        </div>
        <button class="btn btn-xs btn-ghost text-error mt-1" data-action="category-filter#clearPriceFilter" style="display:none" data-category-filter-target="priceClear">Clear</button>
      </div>
    </div>

    {/* Layered navigation filters (populated dynamically) */}
    <div data-category-filter-target="filtersContainer"></div>
  </aside>
);