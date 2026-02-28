/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Shipping Estimator — Variant Index
 *
 * Re-exports the active ShippingEstimator variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { ShippingEstimatorStandard } from './ShippingEstimatorStandard';

const variants: Record<string, FC> = {
  standard: ShippingEstimatorStandard,
};

/**
 * Resolves the ShippingEstimator variant from page.json.
 */
export const ShippingEstimator: FC = (props) => {
  const variant = getVariant('product-utility', 'shipping-estimator', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { ShippingEstimatorStandard };