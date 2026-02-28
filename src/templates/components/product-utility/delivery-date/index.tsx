/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Delivery Date — Variant Index
 *
 * Re-exports the active DeliveryDate variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { DeliveryDateStandard } from './DeliveryDateStandard';
import type { DeliveryDateStandardProps } from './DeliveryDateStandard';

const variants: Record<string, FC<DeliveryDateStandardProps>> = {
  standard: DeliveryDateStandard,
};

/**
 * Resolves the DeliveryDate variant from page.json.
 */
export const DeliveryDate: FC<DeliveryDateStandardProps> = (props) => {
  const variant = getVariant('product-utility', 'delivery-date', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { DeliveryDateStandard };