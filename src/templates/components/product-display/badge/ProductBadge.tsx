/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface ProductBadgeProps {
  type: 'sale' | 'new' | 'low-stock' | 'bestseller' | 'out-of-stock';
  label?: string;
  percentage?: number;
}

/**
 * Product Badge
 *
 * Small overlay badge for product cards and galleries.
 * Uses DaisyUI badge component with semantic colors.
 */
export const ProductBadge: FC<ProductBadgeProps> = ({ type, label, percentage }) => {
  const config: Record<string, { class: string; text: string }> = {
    'sale': {
      class: 'badge badge-error text-white',
      text: label ?? (percentage ? `-${percentage}%` : 'Sale'),
    },
    'new': {
      class: 'badge badge-primary text-primary-content',
      text: label ?? 'New',
    },
    'low-stock': {
      class: 'badge badge-warning text-warning-content',
      text: label ?? 'Low Stock',
    },
    'bestseller': {
      class: 'badge badge-accent text-accent-content',
      text: label ?? 'Bestseller',
    },
    'out-of-stock': {
      class: 'badge badge-neutral text-neutral-content',
      text: label ?? 'Sold Out',
    },
  };

  const badge = config[type];
  if (!badge) return <></>;

  return <span class={badge.class}>{badge.text}</span>;
};