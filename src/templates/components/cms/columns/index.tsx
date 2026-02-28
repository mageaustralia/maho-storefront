/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Columns — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { CmsTwoColumn } from './CmsTwoColumn';
import { CmsThreeColumn } from './CmsThreeColumn';
import type { CmsTwoColumnProps } from './CmsTwoColumn';
import type { CmsThreeColumnProps } from './CmsThreeColumn';

export type { CmsTwoColumnProps, CmsThreeColumnProps };

const variants: Record<string, FC<any>> = {
  'two-column': CmsTwoColumn,
  'three-column': CmsThreeColumn,
};

export const Columns: FC<any> = (props) => {
  const variant = getVariant('cms', 'columns', 'two-column');
  const Component = variants[variant] ?? variants['two-column'];
  return <Component {...props} />;
};

export { CmsTwoColumn, CmsThreeColumn };