/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Wishlist Button — Variant Index
 *
 * Re-exports the active WishlistButton variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { WishlistButtonStandard } from './WishlistButtonStandard';
import type { WishlistButtonStandardProps } from './WishlistButtonStandard';

const variants: Record<string, FC<WishlistButtonStandardProps>> = {
  standard: WishlistButtonStandard,
};

/**
 * Resolves the WishlistButton variant from page.json.
 */
export const WishlistButton: FC<WishlistButtonStandardProps> = (props) => {
  const variant = getVariant('product-utility', 'wishlist-button', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { WishlistButtonStandard };