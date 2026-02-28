/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { StatsCounterRow } from './StatsCounterRow';

const variants: Record<string, FC<any>> = {
  row: StatsCounterRow,
};

export const StatsCounter: FC<any> = (props) => {
  const variant = getVariant('data', 'stats-counter', 'row');
  const Component = variants[variant] ?? variants.row;
  return <Component {...props} />;
};