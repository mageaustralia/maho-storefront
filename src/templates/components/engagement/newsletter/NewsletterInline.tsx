/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface NewsletterInlineProps {
  heading?: string;
  description?: string;
}

/**
 * Newsletter Inline
 *
 * Horizontal inline newsletter signup form with email input and submit button.
 * Designed to sit inside a page section (e.g. above the footer).
 * Uses a newsletter Stimulus controller for async submission.
 */
export const NewsletterInline: FC<NewsletterInlineProps> = ({
  heading = 'Stay in the loop',
  description = 'Get the latest deals, new arrivals and exclusive offers straight to your inbox.',
}) => (
  <section
    class="bg-base-200 rounded-box p-6 md:p-8"
    data-controller="newsletter"
    data-newsletter-url-value="/newsletter/subscriber/new"
  >
    <div class="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
      <div class="flex-1">
        <h2 class="text-lg font-bold text-base-content">{heading}</h2>
        {description && (
          <p class="text-sm text-base-content/60 mt-1">{description}</p>
        )}
      </div>
      <form
        class="flex gap-2 w-full md:w-auto"
        data-newsletter-target="form"
        data-action="submit->newsletter#submit"
      >
        <fieldset class="fieldset flex-1 md:flex-none">
          <label class="input w-full md:w-72">
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              required
              class="grow"
              data-newsletter-target="email"
            />
          </label>
        </fieldset>
        <button type="submit" class="btn btn-primary" data-newsletter-target="submit">
          Subscribe
        </button>
      </form>
    </div>
    <p
      class="text-sm text-success mt-3 hidden"
      data-newsletter-target="success"
    >
      Thanks for subscribing!
    </p>
    <p
      class="text-sm text-error mt-3 hidden"
      data-newsletter-target="error"
    >
      Something went wrong. Please try again.
    </p>
  </section>
);