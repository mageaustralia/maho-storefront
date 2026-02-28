/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Promo Strip
 *
 * Horizontal row of icon + text feature callouts.
 * Free shipping, returns, support, etc.
 */
export const PromoStrip: FC = () => (
  <div class="bg-base-200 border-y border-base-300">
    <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)] py-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <div>
            <p class="text-sm font-semibold text-base-content">Free Shipping</p>
            <p class="text-xs text-base-content/50">On orders over $100</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          <div>
            <p class="text-sm font-semibold text-base-content">Easy Returns</p>
            <p class="text-xs text-base-content/50">30-day return policy</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div>
            <p class="text-sm font-semibold text-base-content">Secure Checkout</p>
            <p class="text-xs text-base-content/50">SSL encrypted payment</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-primary shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <div>
            <p class="text-sm font-semibold text-base-content">Support</p>
            <p class="text-xs text-base-content/50">Chat & email available</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);