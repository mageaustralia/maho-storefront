/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { PaginationStandard } from './PaginationStandard';
import { PaginationLoadMore } from './PaginationLoadMore';
import type { PaginationProps } from './PaginationStandard';

const variants: Record<string, FC<PaginationProps>> = {
  standard: PaginationStandard,
  'load-more': PaginationLoadMore,
};

export const Pagination: FC<PaginationProps> = (props) => {
  const variant = getVariant('category', 'pagination', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export type { PaginationProps };
export { PaginationStandard, PaginationLoadMore };