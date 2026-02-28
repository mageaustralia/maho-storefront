/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Product Gallery — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { GalleryCarousel } from './GalleryCarousel';
import { GalleryMasonry } from './GalleryMasonry';

export interface GalleryProps {
  images: { url: string; label?: string | null }[];
  productName: string;
  productImageUrl?: string | null;
  showSaleBadge?: boolean;
}

const variants: Record<string, FC<GalleryProps>> = {
  carousel: GalleryCarousel,
  masonry: GalleryMasonry,
};

export const Gallery: FC<GalleryProps> = (props) => {
  const variant = getVariant('product', 'gallery', 'carousel');
  const Component = variants[variant] ?? variants.carousel;
  return <Component {...props} />;
};

export { GalleryCarousel, GalleryMasonry };