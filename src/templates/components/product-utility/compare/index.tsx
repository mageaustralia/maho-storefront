/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Compare — Variant Index
 *
 * Re-exports the active Compare variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { CompareTray } from './CompareTray';
import { CompareTable } from './CompareTable';
import type { CompareTrayProps } from './CompareTray';
import type { CompareTableProps } from './CompareTable';

type CompareProps = CompareTrayProps & Partial<CompareTableProps>;

const variants: Record<string, FC<any>> = {
  tray: CompareTray,
  table: CompareTable,
};

/**
 * Resolves the Compare variant from page.json.
 */
export const Compare: FC<CompareProps> = (props) => {
  const variant = getVariant('product-utility', 'compare', 'tray');
  const Component = variants[variant] ?? variants.tray;
  return <Component {...props} />;
};

export { CompareTray, CompareTable };