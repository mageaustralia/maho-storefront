/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Sticky Add to Cart — Variant Index
 *
 * Fixed bottom bar for quick add-to-cart on product pages.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { StickyAtcStandard } from './StickyAtcStandard';

export interface StickyAtcProps {
  productName: string;
  price: number;
  finalPrice?: number;
  sku: string;
  currency?: string;
}

const variants: Record<string, FC<StickyAtcProps>> = {
  standard: StickyAtcStandard,
};

export const StickyAtc: FC<StickyAtcProps> = (props) => {
  const variant = getVariant('product', 'sticky-atc', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { StickyAtcStandard };