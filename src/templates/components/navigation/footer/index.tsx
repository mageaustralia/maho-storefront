/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Footer — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { StoreConfig } from '../../../../types';
import { getVariant } from '../../../../page-config';

import { Footer as FooterStandard } from './FooterStandard';
import { FooterMinimal } from './FooterMinimal';
import { FooterCentered } from './FooterCentered';
import { FooterMega } from './FooterMega';

interface FooterPage { identifier: string; title: string; }

export interface FooterProps {
  config: StoreConfig;
  footerPages?: FooterPage[];
}

const variants: Record<string, FC<FooterProps>> = {
  standard: FooterStandard,
  minimal: FooterMinimal,
  centered: FooterCentered,
  mega: FooterMega,
};

export const Footer: FC<FooterProps> = (props) => {
  const variant = getVariant('footer', 'variant', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { FooterStandard, FooterMinimal, FooterCentered, FooterMega };