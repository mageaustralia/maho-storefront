/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { PromoGrid3Up } from './PromoGrid3Up';
import { PromoGrid2Up } from './PromoGrid2Up';

const variants: Record<string, FC<any>> = {
  '3up': PromoGrid3Up,
  '2up': PromoGrid2Up,
};

export const PromoGrid: FC<any> = (props) => {
  const variant = getVariant('homepage', 'promo-grid', '3up');
  const Component = variants[variant] ?? variants['3up'];
  return <Component {...props} />;
};