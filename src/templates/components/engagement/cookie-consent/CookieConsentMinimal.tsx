/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface CookieConsentMinimalProps {
  message?: string;
}

/**
 * Cookie Consent Minimal
 *
 * Simpler cookie consent bar with just a message and an accept button.
 * No settings option. Fixed bottom bar, hidden by default.
 */
export const CookieConsentMinimal: FC<CookieConsentMinimalProps> = ({
  message = 'This site uses cookies to improve your experience.',
}) => (
  <div
    class="fixed bottom-0 inset-x-0 z-50 p-4 hidden"
    data-controller="cookie-consent"
    data-cookie-consent-target="banner"
  >
    <div class="alert bg-base-100 shadow-md border border-base-300 max-w-2xl mx-auto">
      <div class="flex items-center gap-3 w-full">
        <p class="text-sm text-base-content/80 flex-1">{message}</p>
        <button
          class="btn btn-sm btn-primary shrink-0"
          data-action="cookie-consent#accept"
        >
          OK
        </button>
      </div>
    </div>
  </div>
);