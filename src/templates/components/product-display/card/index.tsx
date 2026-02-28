/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Product Card — Variant Index
 *
 * Re-exports the active ProductCard variant based on page.json config.
 * Import from this index to get the configured variant automatically.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product } from '../../../../types';
import { getVariant } from '../../../../page-config';

// Import all variants
import { ProductCard as CardStandard } from './CardStandard';
import { ProductCard as CardMinimal } from './CardMinimal';
import { CardHorizontal } from './CardHorizontal';
import { CardFeatured } from './CardFeatured';

export interface ProductCardProps {
  product: Product;
  currency?: string;
  priority?: boolean;
}

const variants: Record<string, FC<ProductCardProps>> = {
  standard: CardStandard,
  minimal: CardMinimal,
  horizontal: CardHorizontal,
  featured: CardFeatured,
};

/**
 * Resolves the ProductCard variant from page.json.
 * Checks both 'product' and 'category' page configs (card is used in both).
 */
export const ProductCard: FC<ProductCardProps> = (props) => {
  const variant = getVariant('category', 'card', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

// Also export individual variants for direct use
export { CardStandard, CardMinimal, CardHorizontal, CardFeatured };