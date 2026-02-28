/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface TrustBadge {
  icon: string;
  title: string;
  description?: string;
}

export interface TrustBadgeRowProps {
  badges: TrustBadge[];
}

/**
 * SVG icon paths for common trust badge types.
 * The `icon` prop maps to one of these keys, or falls back to a generic shield.
 */
const iconPaths: Record<string, string> = {
  shipping: '<path d="M16 16h6"/><path d="M2 11h14V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="18.5" cy="16.5" r="2.5"/><path d="M14 11V7h3l3 4"/>',
  secure: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  refund: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  support: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.68 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.24a2 2 0 0 1 2.11-.45c.74.32 1.53.55 2.34.68A2 2 0 0 1 22 16.92z"/>',
  quality: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  warranty: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
};

const fallbackIcon = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';

/**
 * Trust Badge Row
 *
 * Horizontal row of trust indicators (Free Shipping, Secure Payment, etc.)
 * with icons, titles, and optional descriptions. Wraps on mobile.
 */
export const TrustBadgeRow: FC<TrustBadgeRowProps> = ({ badges }) => (
  <div class="flex flex-wrap justify-center gap-6 md:gap-10 py-6">
    {badges.map((badge) => (
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-primary"
            dangerouslySetInnerHTML={{ __html: iconPaths[badge.icon] ?? fallbackIcon }}
          />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-base-content leading-tight">{badge.title}</p>
          {badge.description && (
            <p class="text-xs text-base-content/50 leading-tight mt-0.5">{badge.description}</p>
          )}
        </div>
      </div>
    ))}
  </div>
);