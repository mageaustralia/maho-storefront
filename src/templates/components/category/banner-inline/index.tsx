/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { BannerInlineStandard } from './BannerInlineStandard';

const variants: Record<string, FC<any>> = {
  standard: BannerInlineStandard,
};

export const BannerInline: FC<any> = (props) => {
  const variant = getVariant('category', 'banner-inline', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};