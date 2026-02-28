/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { StoreConfig } from '../../../../types';

interface HeroProps {
  config: StoreConfig;
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
}

/**
 * Split Hero
 *
 * 50/50 layout — content on the left, image on the right.
 * Stacks vertically on mobile (image first, then content).
 */
export const HeroSplit: FC<HeroProps> = ({
  config,
  headline,
  subheadline,
  ctaText = 'Shop Now',
  ctaLink = '/new-arrivals',
  imageUrl,
}) => {
  const title = headline ?? config.storeName;
  const subtitle = subheadline ?? 'Discover our latest collection of premium products, curated for you.';

  return (
    <section class="grid grid-cols-1 md:grid-cols-2 min-h-[400px] md:min-h-[480px]">
      <div class="flex items-center justify-center px-8 py-12 md:px-16 bg-base-200 order-2 md:order-1">
        <div class="max-w-md">
          <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-base-content mb-4">{title}</h1>
          <p class="text-base text-base-content/70 mb-8 leading-relaxed">{subtitle}</p>
          <a href={ctaLink} class="btn btn-primary btn-lg">
            {ctaText}
            <svg class="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
      <div class="relative bg-base-300 overflow-hidden order-1 md:order-2 min-h-[240px] md:min-h-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            class="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchpriority="high"
          />
        ) : (
          <div class="absolute inset-0 bg-gradient-to-tr from-base-300 to-primary/20" />
        )}
      </div>
    </section>
  );
};