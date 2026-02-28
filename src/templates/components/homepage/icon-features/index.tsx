/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Icon Features — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { IconFeatureRow } from './IconFeatureRow';
import { IconFeatureGrid } from './IconFeatureGrid';
import type { IconFeatureProps } from './IconFeatureRow';

export type { IconFeatureProps, Feature } from './IconFeatureRow';

const variants: Record<string, FC<IconFeatureProps>> = {
  row: IconFeatureRow,
  grid: IconFeatureGrid,
};

export const IconFeatures: FC<IconFeatureProps> = (props) => {
  const variant = getVariant('homepage', 'icon-features', 'row');
  const Component = variants[variant] ?? variants.row;
  return <Component {...props} />;
};

export { IconFeatureRow, IconFeatureGrid };