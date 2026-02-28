/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface SpotlightProps {
  title?: string;
  subtitle?: string;
  viewAllUrl?: string;
  viewAllLabel?: string;
  children?: any;
}

/**
 * Collection Spotlight — Standard
 *
 * Section header with title, subtitle, "View All" link, and a slot for
 * a horizontally-scrollable product card row.
 */
export const SpotlightStandard: FC<SpotlightProps> = ({
  title = 'Featured Collection',
  subtitle,
  viewAllUrl,
  viewAllLabel = 'View All',
  children,
}) => (
  <section class="py-8 md:py-12">
    <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]">
      {/* Header */}
      <div class="flex items-end justify-between mb-6">
        <div>
          <h2 class="text-2xl md:text-3xl font-bold text-base-content">{title}</h2>
          {subtitle && <p class="mt-1 text-base-content/60">{subtitle}</p>}
        </div>
        {viewAllUrl && (
          <a href={viewAllUrl} class="link link-primary text-sm font-medium whitespace-nowrap">
            {viewAllLabel}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </a>
        )}
      </div>

      {/* Product row — scrollable on mobile */}
      <div class="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
        {children}
      </div>
    </div>
  </section>
);