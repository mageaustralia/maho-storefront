/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { SubcategoryStandard } from './SubcategoryStandard';
import type { SubcategoryTilesProps } from './SubcategoryStandard';

const variants: Record<string, FC<SubcategoryTilesProps>> = {
  standard: SubcategoryStandard,
};

export const SubcategoryTiles: FC<SubcategoryTilesProps> = (props) => {
  const variant = getVariant('category', 'subcategory-tiles', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export type { SubcategoryTilesProps };
export { SubcategoryStandard };