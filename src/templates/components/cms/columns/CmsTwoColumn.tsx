/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface CmsTwoColumnProps {
  left: any;
  right: any;
  split?: '50-50' | '60-40' | '40-60';
}

const splitClasses: Record<string, string> = {
  '50-50': 'grid-cols-1 md:grid-cols-2',
  '60-40': 'grid-cols-1 md:grid-cols-[3fr_2fr]',
  '40-60': 'grid-cols-1 md:grid-cols-[2fr_3fr]',
};

/**
 * CMS Two Column Layout
 *
 * Two-column grid with configurable split ratio. Stacks on mobile.
 */
export const CmsTwoColumn: FC<CmsTwoColumnProps> = ({ left, right, split = '50-50' }) => (
  <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]">
    <div class={`grid ${splitClasses[split] ?? splitClasses['50-50']} gap-6 md:gap-8`}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  </div>
);