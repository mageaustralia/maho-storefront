/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface CmsThreeColumnProps {
  columns: any[];
}

/**
 * CMS Three Column Layout
 *
 * Three equal columns. Single column on mobile, three on desktop.
 */
export const CmsThreeColumn: FC<CmsThreeColumnProps> = ({ columns }) => {
  if (!columns || columns.length === 0) return null;

  return (
    <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {columns.map((col, i) => (
          <div key={i}>{col}</div>
        ))}
      </div>
    </div>
  );
};