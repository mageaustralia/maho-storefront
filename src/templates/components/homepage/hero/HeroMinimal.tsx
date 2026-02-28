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
 * Minimal Hero
 *
 * Text-focused with clean background. Editorial, understated feel.
 * No image — just typography and a subtle CTA.
 */
export const HeroMinimal: FC<HeroProps> = ({
  config,
  headline,
  subheadline,
  ctaText = 'Explore',
  ctaLink = '/new-arrivals',
}) => {
  const title = headline ?? config.storeName;
  const subtitle = subheadline ?? 'Discover our latest collection';

  return (
    <section class="flex items-center justify-center px-6 py-20 md:py-28 bg-base-100">
      <div class="max-w-xl text-center">
        <p class="text-sm font-medium text-primary uppercase tracking-widest mb-4">New Season</p>
        <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-base-content mb-6">{title}</h1>
        <p class="text-lg text-base-content/60 mb-10 leading-relaxed">{subtitle}</p>
        <a href={ctaLink} class="btn btn-outline btn-primary btn-lg">
          {ctaText}
        </a>
      </div>
    </section>
  );
};