/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface GalleryProps {
  images: string[];
}

/**
 * Responsive image grid for marketplace extension screenshots.
 * Renders nothing when the images array is empty.
 */
export const Gallery: FC<GalleryProps> = ({ images }) => {
  if (!images || images.length === 0) return null;

  return (
    <div class="my-8">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((src, i) => (
          <a
            key={i}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            class="block overflow-hidden border border-base-300 bg-base-200 hover:border-base-content/30 transition-colors"
          >
            <img
              src={src}
              alt={`Screenshot ${i + 1}`}
              loading="lazy"
              class="h-48 w-full object-cover object-top"
            />
          </a>
        ))}
      </div>
    </div>
  );
};
