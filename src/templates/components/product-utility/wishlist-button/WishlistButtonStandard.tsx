/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface WishlistButtonStandardProps {
  productId: string;
  isActive?: boolean;
}

/**
 * Wishlist Button Standard
 *
 * Heart icon toggle for adding/removing products from the wishlist.
 * Outlined heart when inactive, filled when active.
 * Uses Stimulus `wishlist` controller for toggle behavior.
 */
export const WishlistButtonStandard: FC<WishlistButtonStandardProps> = ({ productId, isActive = false }) => (
  <button
    class="btn btn-ghost btn-circle"
    data-controller="wishlist"
    data-action="click->wishlist#toggle"
    data-wishlist-product-id-value={productId}
    data-wishlist-active-value={isActive ? 'true' : 'false'}
    aria-label={isActive ? 'Remove from wishlist' : 'Add to wishlist'}
  >
    {isActive ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-error">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-base-content/50">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    )}
  </button>
);