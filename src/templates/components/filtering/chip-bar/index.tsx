/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { ChipBarStandard } from './ChipBarStandard';

const variants: Record<string, FC> = {
  standard: ChipBarStandard,
};

export const ChipBar: FC = (props) => {
  const Component = variants.standard;
  return <Component {...props} />;
};

export { ChipBarStandard };