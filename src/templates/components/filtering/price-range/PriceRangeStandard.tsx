/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Dual-handle price range slider.
 * Wired to category-filter Stimulus controller.
 */
export const PriceRangeStandard: FC = () => (
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
);