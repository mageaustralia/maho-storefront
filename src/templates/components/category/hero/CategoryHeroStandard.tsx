/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface CategoryHeroProps {
  title: string;
  description?: string;
  image?: string;
  productCount?: number;
}

/**
 * Category Hero — Standard
 *
 * Full-width hero banner for category pages. When a background image is
 * provided, renders a dark overlay with white text. Without an image,
 * falls back to a solid bg-base-200 surface with dark text.
 */
export const CategoryHeroStandard: FC<CategoryHeroProps> = ({
  title,
  description,
  image,
  productCount,
}) => (
  <section class={`relative w-full ${image ? 'text-white' : 'bg-base-200 text-base-content'}`}>
    {image && (
      <div
        class="absolute inset-0 bg-cover bg-center"
        style={`background-image: url('${image}')`}
      >
        <div class="absolute inset-0 bg-black/50" />
      </div>
    )}
    <div class="relative max-w-[var(--content-max)] mx-auto px-[var(--content-padding)] py-12 md:py-20">
      <div class="max-w-2xl">
        <h1 class="text-3xl md:text-5xl font-bold">{title}</h1>
        {description && (
          <p class={`mt-3 text-lg ${image ? 'text-white/80' : 'text-base-content/70'}`}>
            {description}
          </p>
        )}
        {productCount != null && (
          <span class="badge badge-primary mt-4">{productCount} products</span>
        )}
      </div>
    </div>
  </section>
);