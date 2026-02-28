/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Skeleton — Product Card
 *
 * Loading placeholder for product cards in grids.
 * Uses DaisyUI skeleton class for pulse animation.
 */
export const SkeletonProductCard: FC = () => (
  <div class="flex flex-col gap-3">
    <div class="skeleton aspect-square rounded-lg"></div>
    <div class="flex flex-col gap-2 px-1">
      <div class="skeleton h-4 w-3/4"></div>
      <div class="skeleton h-4 w-1/2"></div>
      <div class="skeleton h-5 w-1/3"></div>
    </div>
  </div>
);

/**
 * Skeleton — Product Grid
 *
 * Multiple skeleton cards in a grid layout.
 */
export const SkeletonProductGrid: FC<{ count?: number }> = ({ count = 8 }) => (
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonProductCard key={i} />
    ))}
  </div>
);

/**
 * Skeleton — Product Page
 *
 * Loading placeholder for the product detail page.
 */
export const SkeletonProductPage: FC = () => (
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
    <div class="skeleton aspect-square rounded-lg"></div>
    <div class="flex flex-col gap-4 py-4">
      <div class="skeleton h-8 w-3/4"></div>
      <div class="skeleton h-4 w-1/4"></div>
      <div class="skeleton h-6 w-1/3"></div>
      <div class="skeleton h-4 w-1/5"></div>
      <div class="flex gap-2 mt-2">
        <div class="skeleton h-10 w-10 rounded-full"></div>
        <div class="skeleton h-10 w-10 rounded-full"></div>
        <div class="skeleton h-10 w-10 rounded-full"></div>
      </div>
      <div class="skeleton h-12 w-full mt-4 rounded-lg"></div>
      <div class="skeleton h-20 w-full mt-2"></div>
    </div>
  </div>
);