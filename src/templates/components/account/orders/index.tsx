/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { OrdersStandard } from './OrdersStandard';

const variants: Record<string, FC> = {
  standard: OrdersStandard,
};

export const AccountOrders: FC = (props) => {
  const variant = getVariant('account', 'orders', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { OrdersStandard };