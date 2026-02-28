/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Featured Products — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { FeaturedProductsRow } from './FeaturedProductsRow';
import type { FeaturedProductsProps } from './FeaturedProductsRow';

export type { FeaturedProductsProps, FeaturedProduct } from './FeaturedProductsRow';

const variants: Record<string, FC<FeaturedProductsProps>> = {
  row: FeaturedProductsRow,
};

export const FeaturedProducts: FC<FeaturedProductsProps> = (props) => {
  const variant = getVariant('homepage', 'featured-products', 'row');
  const Component = variants[variant] ?? variants.row;
  return <Component {...props} />;
};

export { FeaturedProductsRow };