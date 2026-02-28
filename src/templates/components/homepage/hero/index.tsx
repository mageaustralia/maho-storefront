/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Hero — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { StoreConfig } from '../../../../types';
import { getVariant } from '../../../../page-config';

import { HeroFullwidth } from './HeroFullwidth';
import { HeroSplit } from './HeroSplit';
import { HeroMinimal } from './HeroMinimal';

export interface HeroProps {
  config: StoreConfig;
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
}

const variants: Record<string, FC<HeroProps>> = {
  fullwidth: HeroFullwidth,
  split: HeroSplit,
  minimal: HeroMinimal,
};

export const Hero: FC<HeroProps> = (props) => {
  const variant = getVariant('homepage', 'hero', 'fullwidth');
  const Component = variants[variant] ?? variants.fullwidth;
  return <Component {...props} />;
};

export { HeroFullwidth, HeroSplit, HeroMinimal };