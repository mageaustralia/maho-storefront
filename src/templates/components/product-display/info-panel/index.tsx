/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Product Info Panel — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import type { Product as ProductType } from '../../../../types';

import { InfoPanelCompact } from './InfoPanelCompact';

export interface InfoPanelProps {
  product: ProductType;
  currency: string;
  formatPrice: (amount: number | null, currency: string) => string;
  swatchMap?: Record<string, string>;
}

const variants: Record<string, FC<InfoPanelProps>> = {
  compact: InfoPanelCompact,
};

export const InfoPanel: FC<InfoPanelProps> = (props) => {
  const variant = getVariant('product', 'info-panel', 'compact');
  const Component = variants[variant] ?? variants.compact;
  return <Component {...props} />;
};

export { InfoPanelCompact };