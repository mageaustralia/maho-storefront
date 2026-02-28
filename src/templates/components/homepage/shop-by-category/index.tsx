/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Shop by Category — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category } from '../../../../types';

import { ShopByCategoryTiles } from './ShopByCategoryTiles';

export interface ShopByCategoryProps {
  categories: Category[];
}

// Only one variant for now
export const ShopByCategory: FC<ShopByCategoryProps> = (props) => {
  return <ShopByCategoryTiles {...props} />;
};

export { ShopByCategoryTiles };