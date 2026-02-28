/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface BannerInlineProps {
  title: string;
  description?: string;
  image?: string;
  ctaText?: string;
  ctaUrl?: string;
}

/**
 * Banner Inline — Standard
 *
 * Promotional card that spans the full grid width, designed to be injected
 * between product rows on category pages. Uses the DaisyUI card with
 * image-full pattern for an immersive look. ~3:1 aspect ratio on desktop.
 */
export const BannerInlineStandard: FC<BannerInlineProps> = ({
  title,
  description,
  image,
  ctaText = 'Shop Now',
  ctaUrl,
}) => (
  <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)] my-6">
    <div class={`card ${image ? 'image-full' : 'bg-primary text-primary-content'}`}>
      {image && (
        <figure class="aspect-[3/1]">
          <img src={image} alt={title} class="w-full h-full object-cover" />
        </figure>
      )}
      <div class="card-body justify-end">
        <h3 class="card-title text-2xl md:text-3xl">{title}</h3>
        {description && <p class="max-w-lg">{description}</p>}
        {ctaUrl && (
          <div class="card-actions mt-2">
            <a href={ctaUrl} class="btn btn-primary">
              {ctaText}
            </a>
          </div>
        )}
      </div>
    </div>
  </div>
);