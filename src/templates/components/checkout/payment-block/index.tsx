/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Payment Block — Variant Index
 *
 * Re-exports the active PaymentBlock variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { PaymentBlockStandard } from './PaymentBlockStandard';
import type { PaymentBlockStandardProps } from './PaymentBlockStandard';

const variants: Record<string, FC<any>> = {
  standard: PaymentBlockStandard,
};

/**
 * Resolves the PaymentBlock variant from page.json.
 */
export const PaymentBlock: FC<PaymentBlockStandardProps> = (props) => {
  const variant = getVariant('checkout', 'payment-block', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { PaymentBlockStandard };