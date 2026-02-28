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
 * Full Width Hero
 *
 * Edge-to-edge background with centered text overlay and CTA.
 * Uses store accent color as gradient fallback when no image is set.
 */
export const HeroFullwidth: FC<HeroProps> = ({
  config,
  headline,
  subheadline,
  ctaText = 'Shop Now',
  ctaLink = '/new-arrivals',
  imageUrl,
}) => {
  const title = headline ?? config.storeName;
  const subtitle = subheadline ?? 'Discover our latest collection';

  return (
    <section class="relative w-full overflow-hidden bg-primary">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          class="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          fetchpriority="high"
        />
      ) : (
        <div class="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/30" />
      )}
      <div class="absolute inset-0 bg-black/30" />
      <div class="relative flex items-center justify-center min-h-[400px] md:min-h-[500px] px-6 py-16 text-center">
        <div class="max-w-2xl">
          <h1 class="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">{title}</h1>
          <p class="text-lg md:text-xl text-white/80 mb-8">{subtitle}</p>
          <a href={ctaLink} class="btn btn-primary btn-lg shadow-lg">
            {ctaText}
          </a>
        </div>
      </div>
    </section>
  );
};