/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { CategoryHeroStandard } from './CategoryHeroStandard';

const variants: Record<string, FC<any>> = {
  standard: CategoryHeroStandard,
};

export const CategoryHero: FC<any> = (props) => {
  const variant = getVariant('category', 'hero', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};