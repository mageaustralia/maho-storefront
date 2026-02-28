/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface CheckoutTrustBadgesProps {}

/**
 * Checkout Trust Badges
 *
 * Row of trust indicators specific to the checkout flow: secure checkout,
 * buyer protection, and accepted payment methods. Muted styling, centered.
 */
export const CheckoutTrustBadges: FC<CheckoutTrustBadgesProps> = () => (
  <div class="flex flex-wrap items-center justify-center gap-6 py-4 text-base-content/50">
    {/* Secure Checkout */}
    <div class="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span class="text-xs font-medium uppercase tracking-wide">Secure Checkout</span>
    </div>

    {/* Buyer Protection */}
    <div class="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span class="text-xs font-medium uppercase tracking-wide">Buyer Protection</span>
    </div>

    {/* All Major Cards */}
    <div class="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
      <span class="text-xs font-medium uppercase tracking-wide">All Major Cards</span>
    </div>
  </div>
);