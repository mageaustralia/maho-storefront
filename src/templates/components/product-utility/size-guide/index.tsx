/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Size Guide — Variant Index
 *
 * Re-exports the active SizeGuide variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { SizeGuideTable } from './SizeGuideTable';
import { SizeGuideVisual } from './SizeGuideVisual';
import { SizeGuideModal } from './SizeGuideModal';
import type { SizeGuideTableProps } from './SizeGuideTable';
import type { SizeGuideVisualProps } from './SizeGuideVisual';
import type { SizeGuideModalProps } from './SizeGuideModal';

type SizeGuideProps = SizeGuideTableProps & Partial<SizeGuideVisualProps>;

const variants: Record<string, FC<any>> = {
  table: SizeGuideTable,
  visual: SizeGuideVisual,
  modal: SizeGuideModal,
};

/**
 * Resolves the SizeGuide variant from page.json.
 */
export const SizeGuide: FC<SizeGuideProps> = (props) => {
  const variant = getVariant('product-utility', 'size-guide', 'table');
  const Component = variants[variant] ?? variants.table;
  return <Component {...props} />;
};

export { SizeGuideTable, SizeGuideVisual, SizeGuideModal };