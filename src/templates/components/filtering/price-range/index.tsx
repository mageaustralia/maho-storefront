/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { PriceRangeStandard } from './PriceRangeStandard';

const variants: Record<string, FC> = {
  standard: PriceRangeStandard,
};

export const PriceRange: FC = (props) => {
  const Component = variants.standard;
  return <Component {...props} />;
};

export { PriceRangeStandard };