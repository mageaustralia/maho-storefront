/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface NewsletterPopupImageProps {
  heading?: string;
  description?: string;
  image?: string;
  delay?: number;
}

/**
 * Newsletter Popup with Image
 *
 * Split-layout modal: image on the left (desktop), form on the right.
 * On mobile, image is hidden and the modal pins to the bottom as a sheet.
 * Reuses the newsletter-popup Stimulus controller.
 */
export const NewsletterPopupImage: FC<NewsletterPopupImageProps> = ({
  heading = 'Get 10% off your first order',
  description = 'Sign up to our newsletter for exclusive deals, new product alerts and more.',
  image = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80&fit=crop',
  delay = 5000,
}) => (
  <dialog
    id="newsletter-modal"
    class="modal max-md:modal-bottom"
    data-controller="newsletter-popup"
    data-newsletter-popup-delay-value={delay}
  >
    <div class="modal-box max-w-2xl p-0 overflow-hidden max-md:rounded-t-2xl">
      <div class="flex max-md:flex-col">
        {/* Image — hidden on mobile */}
        <div class="hidden md:block w-[45%] shrink-0">
          <img
            src={image}
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Form side */}
        <div class="flex-1 p-6 md:p-8 relative">
          <form method="dialog">
            <button
              class="btn btn-circle absolute right-3 top-3 bg-base-200 hover:bg-base-300 border-none text-base-content"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </form>

          <h3 class="font-bold text-xl mb-2 pr-8">{heading}</h3>
          {description && (
            <p class="text-sm text-base-content/60 mb-5">{description}</p>
          )}

          <form
            data-newsletter-popup-target="form"
            data-action="submit->newsletter-popup#submit"
          >
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Email address</legend>
              <label class="input w-full">
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  required
                  class="grow"
                  data-newsletter-popup-target="email"
                />
              </label>
            </fieldset>

            <div class="mt-4">
              <button type="submit" class="btn btn-primary w-full" data-newsletter-popup-target="submit">
                Subscribe
              </button>
            </div>
          </form>

          <p
            class="text-sm text-success mt-3 hidden text-center"
            data-newsletter-popup-target="success"
          >
            Thanks for subscribing!
          </p>
          <p
            class="text-sm text-error mt-3 hidden text-center"
            data-newsletter-popup-target="error"
          >
            Something went wrong. Please try again.
          </p>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
);
