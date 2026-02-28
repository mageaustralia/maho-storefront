/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface PromoBannerTopProps {
  text?: string;
  link?: string;
  dismissible?: boolean;
}

/**
 * Promo Banner — Top
 *
 * Full-width announcement banner above the header.
 * Used for sitewide promotions, free shipping thresholds, sale announcements.
 */
export const PromoBannerTop: FC<PromoBannerTopProps> = ({
  text = 'Free shipping on orders over $100',
  link,
  dismissible = true,
}) => (
  <div class="bg-primary text-primary-content text-center text-sm py-2 px-4 relative" data-controller="promo-banner">
    {link ? (
      <a href={link} class="no-underline text-primary-content hover:underline font-medium">{text}</a>
    ) : (
      <span class="font-medium">{text}</span>
    )}
    {dismissible && (
      <button
        class="absolute right-3 top-1/2 -translate-y-1/2 text-primary-content/60 hover:text-primary-content transition-colors"
        data-action="promo-banner#dismiss"
        aria-label="Dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    )}
  </div>
);