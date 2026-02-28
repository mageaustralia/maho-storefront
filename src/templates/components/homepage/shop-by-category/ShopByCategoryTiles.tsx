/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category } from '../../../../types';

interface ShopByCategoryProps {
  categories: Category[];
}

// Extract first image URL from cmsBlock HTML
function extractImageFromCmsBlock(cmsBlock: string | null | undefined): string | null {
  if (!cmsBlock) return null;
  const match = cmsBlock.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function getCategoryImage(cat: Category): string | null {
  return cat.image ?? extractImageFromCmsBlock(cat.cmsBlock);
}

export const ShopByCategoryTiles: FC<ShopByCategoryProps> = ({ categories }) => {
  const topCategories = categories.filter(c => c.level === 2 && c.includeInMenu);
  if (topCategories.length === 0) return <></>;

  return (
    <section class="pt-16 pb-8">
      <h2 class="text-4xl font-bold text-center py-8">Shop by Category</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {topCategories.map((cat) => {
          const categoryImage = getCategoryImage(cat);
          return (
            <a key={cat.id} href={`/${cat.urlKey}`} data-turbo-prefetch="true" class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              {categoryImage ? (
                <figure class="aspect-square bg-base-200 overflow-hidden">
                  <img src={categoryImage} alt={cat.name} loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </figure>
              ) : (
                <figure class="aspect-square bg-base-200" />
              )}
              <div class="card-body p-3 gap-0.5">
                <h3 class="text-sm font-semibold">{cat.name}</h3>
                <span class="text-xs text-base-content/50">{cat.productCount} products</span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};