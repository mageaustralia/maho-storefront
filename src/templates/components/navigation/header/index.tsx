/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Header — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, StorefrontStore } from '../../../../types';
import { getVariant } from '../../../../page-config';

import { Header as HeaderSticky } from './HeaderSticky';
import { HeaderMinimal } from './HeaderMinimal';
import { HeaderCentered } from './HeaderCentered';
import { Header as HeaderMega } from './HeaderMega';
import { Header as HeaderVisual } from './HeaderVisual';

export interface HeaderProps {
  categories: Category[];
  config: StoreConfig;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
}

const variants: Record<string, FC<HeaderProps>> = {
  sticky: HeaderSticky,
  minimal: HeaderMinimal,
  centered: HeaderCentered,
  mega: HeaderMega,
  visual: HeaderVisual,
};

export const Header: FC<HeaderProps> = (props) => {
  const variant = getVariant('header', 'variant', 'sticky');
  const Component = variants[variant] ?? variants.sticky;
  return <Component {...props} />;
};

export { HeaderSticky, HeaderMinimal, HeaderCentered, HeaderMega, HeaderVisual };