/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { ToolbarStandard } from './ToolbarStandard';
import type { ToolbarProps } from './ToolbarStandard';

const variants: Record<string, FC<ToolbarProps>> = {
  standard: ToolbarStandard,
};

export const CategoryToolbar: FC<ToolbarProps> = (props) => {
  const variant = getVariant('category', 'toolbar', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export type { ToolbarProps };
export { ToolbarStandard };