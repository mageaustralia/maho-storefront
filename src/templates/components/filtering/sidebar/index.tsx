/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { FilterSidebar } from './FilterSidebar';
import type { FilterSidebarProps } from './FilterSidebar';

const variants: Record<string, FC<FilterSidebarProps>> = {
  sidebar: FilterSidebar,
};

export const CategoryFilter: FC<FilterSidebarProps> = (props) => {
  const variant = getVariant('category', 'filter', 'sidebar');
  const Component = variants[variant] ?? variants.sidebar;
  return <Component {...props} />;
};

export type { FilterSidebarProps };
export { FilterSidebar };