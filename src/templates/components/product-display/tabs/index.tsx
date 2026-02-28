/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Product Content Tabs — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import type { Product as ProductType } from '../../../../types';

import { TabsTabbed } from './TabsTabbed';
import { TabsAccordion } from './TabsAccordion';

export interface ContentTabsProps {
  product: ProductType;
  currency: string;
}

const variants: Record<string, FC<ContentTabsProps>> = {
  tabbed: TabsTabbed,
  accordion: TabsAccordion,
};

export const ContentTabs: FC<ContentTabsProps> = (props) => {
  const variant = getVariant('product', 'tabs', 'tabbed');
  const Component = variants[variant] ?? variants.tabbed;
  return <Component {...props} />;
};

export { TabsTabbed, TabsAccordion };