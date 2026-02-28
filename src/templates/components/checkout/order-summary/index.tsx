/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Order Summary — Variant Index
 *
 * Re-exports the active OrderSummary variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { OrderSummaryStandard } from './OrderSummaryStandard';
import type { OrderSummaryStandardProps } from './OrderSummaryStandard';

const variants: Record<string, FC<any>> = {
  standard: OrderSummaryStandard,
};

/**
 * Resolves the OrderSummary variant from page.json.
 */
export const OrderSummary: FC<OrderSummaryStandardProps> = (props) => {
  const variant = getVariant('checkout', 'order-summary', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { OrderSummaryStandard };