/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Rating Summary — Variant Index
 *
 * Re-exports the active RatingSummary variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { RatingSummaryStandard } from './RatingSummaryStandard';
import type { RatingSummaryProps } from './RatingSummaryStandard';

const variants: Record<string, FC<RatingSummaryProps>> = {
  standard: RatingSummaryStandard,
};

export const RatingSummary: FC<RatingSummaryProps> = (props) => {
  const variant = getVariant('reviews', 'rating-summary', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export type { RatingSummaryProps };
export { RatingSummaryStandard };