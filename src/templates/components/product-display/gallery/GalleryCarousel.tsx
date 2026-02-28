/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface GalleryCarouselProps {
  images: { url: string; label?: string | null }[];
  productName: string;
  productImageUrl?: string | null;
}

/**
 * Carousel Gallery
 *
 * Swipeable main image with thumbnail strip below.
 * Supports arrow navigation, swipe, and fullscreen zoom.
 * Uses the existing product-controller carousel targets.
 */
export const GalleryCarousel: FC<GalleryCarouselProps> = ({ images, productName, productImageUrl }) => {
  if (images.length > 1) {
    return (
      <>
        {/* Carousel viewport */}
        <div class="gallery-carousel" data-product-target="carousel">
          <div class="gallery-track" data-product-target="galleryTrack">
            {images.map((img, i) => (
              <div class="gallery-slide" key={i}>
                <img src={img.url} alt={img.label ?? productName} loading={i === 0 ? 'eager' : 'lazy'} />
              </div>
            ))}
          </div>
          <button class="gallery-arrow gallery-arrow-prev" data-action="product#prevSlide" aria-label="Previous image">&#8249;</button>
          <button class="gallery-arrow gallery-arrow-next" data-action="product#nextSlide" aria-label="Next image">&#8250;</button>
          <div class="gallery-counter" data-product-target="slideCounter">1 / {images.length}</div>
          <button class="gallery-zoom-btn" data-action="product#openFullscreen" aria-label="View fullscreen">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
        </div>
        {/* Thumbnails (desktop only) */}
        <div class="product-thumbnails">
          {images.map((img, i) => (
            <img
              key={i}
              src={img.url}
              alt={img.label ?? productName}
              loading="lazy"
              class={`product-thumb ${i === 0 ? 'active' : ''}`}
              data-product-target="galleryThumb"
              data-action="click->product#selectImage"
              data-full-image={img.url}
            />
          ))}
        </div>
      </>
    );
  }

  // Single image fallback
  return (
    <div class="product-main-image">
      {productImageUrl ? (
        <img src={productImageUrl} alt={productName} data-product-target="mainImage" />
      ) : (
        <div class="product-image-placeholder">No Image</div>
      )}
    </div>
  );
};