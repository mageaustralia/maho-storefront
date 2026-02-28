/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Cart Drawer — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { CartDrawer as DrawerSlide } from './DrawerSlide';
// Future variants:
// import { CartDrawer as DrawerModal } from './DrawerModal';

const variants: Record<string, FC> = {
  slide: DrawerSlide,
  // modal: DrawerModal,
};

export const CartDrawer: FC = (props) => {
  const variant = getVariant('cart', 'drawer', 'slide');
  const Component = variants[variant] ?? variants.slide;
  return <Component {...props} />;
};

export { DrawerSlide };