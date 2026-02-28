/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface CookieConsentBarProps {
  message?: string;
}

/**
 * Cookie Consent Bar
 *
 * Fixed bottom bar with privacy message, "Accept" and "Settings" buttons.
 * Uses DaisyUI alert styling. Hidden by default; the cookie-consent Stimulus
 * controller checks for a consent cookie and shows the bar if absent.
 */
export const CookieConsentBar: FC<CookieConsentBarProps> = ({
  message = 'We use cookies to improve your experience. By continuing to browse, you agree to our use of cookies.',
}) => (
  <div
    class="fixed bottom-0 inset-x-0 z-50 p-4 hidden"
    data-controller="cookie-consent"
    data-cookie-consent-target="banner"
  >
    <div class="alert bg-base-100 shadow-lg border border-base-300 max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-base-content/50">
          <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
          <path d="M8.5 8.5v.01" />
          <path d="M16 15.5v.01" />
          <path d="M12 12v.01" />
          <path d="M11 17v.01" />
          <path d="M7 14v.01" />
        </svg>
        <p class="text-sm text-base-content/80 flex-1">{message}</p>
        <div class="flex gap-2 shrink-0">
          <button
            class="btn btn-sm btn-ghost"
            data-action="cookie-consent#openSettings"
          >
            Settings
          </button>
          <button
            class="btn btn-sm btn-primary"
            data-action="cookie-consent#accept"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  </div>
);