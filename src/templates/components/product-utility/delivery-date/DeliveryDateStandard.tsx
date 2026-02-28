/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface DeliveryDateStandardProps {
  estimatedDate?: string;
  message?: string;
}

/**
 * Delivery Date Standard
 *
 * Simple inline display of estimated delivery date with a green truck icon.
 * Shows either the estimated date or a custom message.
 */
export const DeliveryDateStandard: FC<DeliveryDateStandardProps> = ({ estimatedDate, message }) => (
  <div class="flex items-center gap-2 my-2">
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
      class="text-success shrink-0"
    >
      <path d="M16 16h6" />
      <path d="M2 11h14V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <circle cx="6.5" cy="16.5" r="2.5" />
      <circle cx="18.5" cy="16.5" r="2.5" />
      <path d="M14 11V7h3l3 4" />
    </svg>
    <span class="text-sm text-base-content">
      {message ?? (estimatedDate ? `Estimated delivery: ${estimatedDate}` : 'Free shipping available')}
    </span>
  </div>
);