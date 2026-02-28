/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface BrandLogoProps {
  brands: { name: string; logoUrl: string; url?: string }[];
}

/**
 * Brand Logo Strip (Marquee)
 *
 * Horizontal auto-scrolling strip of brand logos.
 * Logos are grayscale by default and transition to color on hover.
 * Duplicates the logo list to create a seamless infinite scroll effect.
 */
export const BrandLogoStrip: FC<BrandLogoProps> = ({ brands }) => {
  if (!brands || brands.length === 0) return null;

  const logoItem = (brand: BrandLogoProps['brands'][number], idx: number) => {
    const img = (
      <img
        src={brand.logoUrl}
        alt={brand.name}
        class="h-10 md:h-12 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
        loading="lazy"
      />
    );

    return (
      <div class="flex-shrink-0 px-6 md:px-8" key={idx}>
        {brand.url ? <a href={brand.url} title={brand.name}>{img}</a> : img}
      </div>
    );
  };

  return (
    <section class="py-8 md:py-12 bg-base-100 overflow-hidden">
      <div class="container mx-auto px-4 mb-6">
        <h2 class="text-center text-sm font-semibold uppercase tracking-widest text-base-content/50">
          Shop by Brand
        </h2>
      </div>
      <div class="relative">
        {/* Fade edges */}
        <div class="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-base-100 to-transparent z-10 pointer-events-none" />
        <div class="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-base-100 to-transparent z-10 pointer-events-none" />

        <div class="flex animate-marquee">
          <div class="flex items-center">
            {brands.map((b, i) => logoItem(b, i))}
          </div>
          {/* Duplicate for seamless loop */}
          <div class="flex items-center" aria-hidden="true">
            {brands.map((b, i) => logoItem(b, i + brands.length))}
          </div>
        </div>
      </div>
    </section>
  );
};