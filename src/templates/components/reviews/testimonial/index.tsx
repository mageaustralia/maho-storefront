/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testimonial — Variant Index
 *
 * Re-exports the active Testimonial variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { TestimonialCarousel } from './TestimonialCarousel';
import { TestimonialGrid } from './TestimonialGrid';
import type { TestimonialProps, Testimonial } from './TestimonialCarousel';

const variants: Record<string, FC<TestimonialProps>> = {
  carousel: TestimonialCarousel,
  grid: TestimonialGrid,
};

export const TestimonialDisplay: FC<TestimonialProps> = (props) => {
  const variant = getVariant('reviews', 'testimonial', 'carousel');
  const Component = variants[variant] ?? variants.carousel;
  return <Component {...props} />;
};

export type { TestimonialProps, Testimonial };
export { TestimonialCarousel, TestimonialGrid };