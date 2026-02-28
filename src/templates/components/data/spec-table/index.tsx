/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { SpecTableStandard } from './SpecTableStandard';

const variants: Record<string, FC<any>> = {
  standard: SpecTableStandard,
};

export const SpecTable: FC<any> = (props) => {
  const variant = getVariant('data', 'spec-table', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};