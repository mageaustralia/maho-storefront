/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Recently Viewed — Variant Index
 *
 * Container for recently viewed products. Server-renders the shell;
 * client JS fills it from localStorage.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { RecentlyViewedRow } from './RecentlyViewedRow';

const variants: Record<string, FC> = {
  row: RecentlyViewedRow,
};

export const RecentlyViewed: FC = (props) => {
  const variant = getVariant('product', 'recently-viewed', 'row');
  const Component = variants[variant] ?? variants.row;
  return <Component {...props} />;
};

export { RecentlyViewedRow };