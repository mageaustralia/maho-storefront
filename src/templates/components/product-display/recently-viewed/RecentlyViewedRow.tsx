/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Recently Viewed Products Row
 *
 * Server-renders the container shell. Client-side JS (Stimulus) reads
 * recently viewed product IDs from localStorage and populates the row
 * with product cards via API fetch.
 *
 * The section is hidden by default and shown only when there are items
 * to display, avoiding empty section flicker.
 */
export const RecentlyViewedRow: FC = () => {
  return (
    <section
      class="hidden"
      data-controller="product"
      data-product-target="recentlyViewed"
      aria-label="Recently Viewed Products"
    >
      <div class="container mx-auto px-4 py-8">
        <h2 class="text-xl font-semibold mb-4">Recently Viewed</h2>
        <div
          class="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-4 px-4"
          data-product-target="recentlyViewedGrid"
          role="list"
        >
          {/* Product cards injected by Stimulus controller from localStorage data */}
        </div>
      </div>
    </section>
  );
};