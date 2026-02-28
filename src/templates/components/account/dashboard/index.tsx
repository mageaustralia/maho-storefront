/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { DashboardStandard } from './DashboardStandard';
import type { DashboardProps } from './DashboardStandard';

const variants: Record<string, FC<DashboardProps>> = {
  standard: DashboardStandard,
};

export const AccountDashboard: FC<DashboardProps> = (props) => {
  const variant = getVariant('account', 'dashboard', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export type { DashboardProps };
export { DashboardStandard };