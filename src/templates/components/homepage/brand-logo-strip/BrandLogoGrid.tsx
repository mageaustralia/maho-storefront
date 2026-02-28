/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { BrandLogoProps } from './BrandLogoStrip';

/**
 * Brand Logo Grid
 *
 * Static grid of brand logos in a responsive 3/4/6 column layout.
 * Logos are grayscale by default and transition to color on hover.
 */
export const BrandLogoGrid: FC<BrandLogoProps> = ({ brands }) => {
  if (!brands || brands.length === 0) return null;

  return (
    <section class="py-8 md:py-12 bg-base-100">
      <div class="container mx-auto px-4">
        <h2 class="text-center text-sm font-semibold uppercase tracking-widest text-base-content/50 mb-8">
          Shop by Brand
        </h2>
        <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 items-center justify-items-center">
          {brands.map((brand, idx) => {
            const img = (
              <img
                src={brand.logoUrl}
                alt={brand.name}
                class="h-10 md:h-12 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                loading="lazy"
              />
            );

            return (
              <div class="flex items-center justify-center p-2" key={idx}>
                {brand.url ? <a href={brand.url} title={brand.name}>{img}</a> : img}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};