/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { GridStandard } from './GridStandard';
import { GridList } from './GridList';
import type { CategoryGridProps } from './GridStandard';

const variants: Record<string, FC<CategoryGridProps>> = {
  standard: GridStandard,
  list: GridList,
};

export const CategoryGrid: FC<CategoryGridProps> = (props) => {
  const variant = getVariant('category', 'grid', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export type { CategoryGridProps };
export { GridStandard, GridList };