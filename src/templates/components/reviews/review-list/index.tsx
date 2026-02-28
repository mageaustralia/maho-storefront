/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Review List — Variant Index
 *
 * Re-exports the active ReviewList variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { ReviewListStandard } from './ReviewListStandard';
import { ReviewListCompact } from './ReviewListCompact';
import type { ReviewListProps, Review } from './ReviewListStandard';

const variants: Record<string, FC<ReviewListProps>> = {
  standard: ReviewListStandard,
  compact: ReviewListCompact,
};

export const ReviewList: FC<ReviewListProps> = (props) => {
  const variant = getVariant('reviews', 'review-list', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export type { ReviewListProps, Review };
export { ReviewListStandard, ReviewListCompact };