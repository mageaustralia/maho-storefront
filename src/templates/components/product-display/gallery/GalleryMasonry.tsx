/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface GalleryMasonryProps {
  images: { url: string; label?: string | null }[];
  productName: string;
  showSaleBadge?: boolean;
}

/**
 * Masonry Image Gallery
 *
 * 2-column grid with first image spanning full width.
 * Click any image to open fullscreen overlay.
 */
export const GalleryMasonry: FC<GalleryMasonryProps> = ({ images, productName, showSaleBadge = false }) => {
  if (images.length === 0) {
    return (
      <div class="bg-[var(--product-image-bg)] rounded-lg aspect-square flex items-center justify-center text-base-content/30">No Image</div>
    );
  }

  return (
    <div class="grid grid-cols-2 gap-2">
      {images.map((img, i) => (
        <div
          key={i}
          class={`relative bg-[var(--product-image-bg)] rounded-lg overflow-hidden cursor-zoom-in ${i === 0 ? 'col-span-2' : ''}`}
          data-action="click->product#openFullscreen"
          data-slide-index={String(i)}
        >
          <img
            src={img.url}
            alt={img.label ?? productName}
            loading={i < 2 ? 'eager' : 'lazy'}
            class={`w-full object-contain mix-blend-multiply ${i === 0 ? 'aspect-[4/3]' : 'aspect-square'}`}
          />
          {i === 0 && showSaleBadge && (
            <span class="badge badge-error absolute top-3 left-3 text-white">Sale</span>
          )}
        </div>
      ))}
    </div>
  );
};