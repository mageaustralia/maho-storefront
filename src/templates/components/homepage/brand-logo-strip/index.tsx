/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Brand Logo Strip — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { BrandLogoStrip } from './BrandLogoStrip';
import { BrandLogoGrid } from './BrandLogoGrid';
import type { BrandLogoProps } from './BrandLogoStrip';

export type { BrandLogoProps };

const variants: Record<string, FC<BrandLogoProps>> = {
  strip: BrandLogoStrip,
  grid: BrandLogoGrid,
};

export const BrandLogos: FC<BrandLogoProps> = (props) => {
  const variant = getVariant('homepage', 'brand-logo-strip', 'strip');
  const Component = variants[variant] ?? variants.strip;
  return <Component {...props} />;
};

export { BrandLogoStrip, BrandLogoGrid };