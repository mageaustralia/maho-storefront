/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface EmptyStateProps {
  icon?: 'cart' | 'search' | 'wishlist' | 'orders' | 'generic';
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

const icons: Record<string, string> = {
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  wishlist: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  orders: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
  generic: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
};

/**
 * Empty State
 *
 * Shown when a section has no content: empty cart, no search results,
 * no orders, empty wishlist, etc.
 */
export const EmptyState: FC<EmptyStateProps> = ({
  icon = 'generic',
  title,
  description,
  actionLabel,
  actionHref,
}) => (
  <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div class="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mb-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-base-content/30"
        dangerouslySetInnerHTML={{ __html: icons[icon] ?? icons.generic }}
      />
    </div>
    <h3 class="text-lg font-semibold text-base-content mb-1">{title}</h3>
    {description && <p class="text-sm text-base-content/50 max-w-sm mb-4">{description}</p>}
    {actionLabel && actionHref && (
      <a href={actionHref} class="btn btn-primary btn-sm">{actionLabel}</a>
    )}
  </div>
);