/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { ComparisonTableStandard } from './ComparisonTableStandard';

const variants: Record<string, FC<any>> = {
  standard: ComparisonTableStandard,
};

export const ComparisonTable: FC<any> = (props) => {
  const variant = getVariant('data', 'comparison-table', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};