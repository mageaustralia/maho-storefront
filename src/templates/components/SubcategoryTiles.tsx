/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category } from '../../types';

interface SubcategoryTilesProps {
  categories: Category[];
}

/**
 * Subcategory tile grid — shows child categories as image cards.
 * Positioned below the category hero image, above products.
 *
 * Orphan handling: if count is divisible by 4, use a grid.
 * Otherwise, use a horizontal scroll row so no orphan sits alone.
 *
 * Future: swappable variant (tiles, list, carousel, etc.)
 */
export const SubcategoryTiles: FC<SubcategoryTilesProps> = ({ categories }) => {
  if (!categories.length) return null;

  const useGrid = categories.length % 4 === 0;

  const card = (cat: Category) => (
    <a key={cat.id} href={`/${cat.urlPath ?? cat.urlKey}`} data-turbo-prefetch="true"
      class="card bg-base-100 border border-border hover:shadow-md transition-shadow overflow-hidden">
      {cat.image ? (
        <figure class="aspect-[4/3] bg-base-200">
          <img src={cat.image} alt={cat.name} class="w-full h-full object-cover" loading="lazy" />
        </figure>
      ) : (
        <figure class="aspect-[4/3] bg-base-200 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-base-content/20">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21"/>
          </svg>
        </figure>
      )}
      <div class="card-body p-3">
        <h3 class="text-sm font-medium text-center">{cat.name}</h3>
      </div>
    </a>
  );

  if (useGrid) {
    return (
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
        {categories.map(card)}
      </div>
    );
  }

  // Scroll row for non-divisible counts — no orphans
  return (
    <div class="flex gap-4 mt-6 mb-6 overflow-x-auto scroll-snap-x snap-mandatory scrollbar-none pb-1">
      {categories.map(cat => (
        <div key={cat.id} class="shrink-0 w-[calc(25%-0.75rem)] max-md:w-[calc(50%-0.5rem)] snap-start">
          {card(cat)}
        </div>
      ))}
    </div>
  );
};