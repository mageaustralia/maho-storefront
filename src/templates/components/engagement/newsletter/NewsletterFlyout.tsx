/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface NewsletterFlyoutProps {
  heading?: string;
}

/**
 * Newsletter Flyout
 *
 * Small floating card that slides in from the bottom-right corner.
 * Fixed position, compact form. A Stimulus controller handles the
 * slide-in animation, dismiss, and form submission.
 */
export const NewsletterFlyout: FC<NewsletterFlyoutProps> = ({
  heading = 'Stay updated',
}) => (
  <div
    class="fixed bottom-4 right-4 z-50 w-80 max-md:bottom-0 max-md:right-0 max-md:left-0 max-md:w-full max-md:min-h-[150px] max-md:rounded-b-none card bg-base-100 shadow-xl border border-base-300 max-md:border-b-0 translate-y-[120%] transition-transform duration-300"
    data-controller="newsletter-flyout"
    data-newsletter-flyout-target="container"
  >
    <div class="card-body p-4 gap-3">
      <div class="flex items-center justify-between">
        <h4 class="card-title text-sm">{heading}</h4>
        <button
          class="btn btn-ghost btn-xs btn-circle"
          aria-label="Dismiss"
          data-action="newsletter-flyout#dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <form
        class="flex gap-2"
        data-newsletter-flyout-target="form"
        data-action="submit->newsletter-flyout#submit"
      >
        <label class="input input-sm flex-1">
          <input
            type="email"
            name="email"
            placeholder="your@email.com"
            required
            class="grow"
            data-newsletter-flyout-target="email"
          />
        </label>
        <button type="submit" class="btn btn-primary btn-sm" data-newsletter-flyout-target="submit">
          Go
        </button>
      </form>

      <p
        class="text-xs text-success hidden"
        data-newsletter-flyout-target="success"
      >
        Subscribed!
      </p>
      <p
        class="text-xs text-error hidden"
        data-newsletter-flyout-target="error"
      >
        Please try again.
      </p>
    </div>
  </div>
);