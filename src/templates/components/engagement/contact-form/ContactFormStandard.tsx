/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface ContactFormStandardProps {}

/**
 * Contact Form Standard
 *
 * Full contact form with name, email, subject, and message fields.
 * Uses DaisyUI v5 fieldset/fieldset-legend pattern.
 * Wired to a contact Stimulus controller for async submission.
 */
export const ContactFormStandard: FC<ContactFormStandardProps> = () => (
  <section class="max-w-xl mx-auto">
    <h2 class="text-2xl font-bold text-base-content mb-6">Contact Us</h2>

    <form
      data-controller="contact"
      data-contact-url-value="/contacts/index/post"
      data-action="submit->contact#submit"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Name</legend>
          <label class="input w-full">
            <input
              type="text"
              name="name"
              placeholder="Your name"
              required
              class="grow"
              data-contact-target="name"
            />
          </label>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Email</legend>
          <label class="input w-full">
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              required
              class="grow"
              data-contact-target="email"
            />
          </label>
        </fieldset>
      </div>

      <fieldset class="fieldset mb-4">
        <legend class="fieldset-legend">Subject</legend>
        <label class="input w-full">
          <input
            type="text"
            name="subject"
            placeholder="How can we help?"
            required
            class="grow"
            data-contact-target="subject"
          />
        </label>
      </fieldset>

      <fieldset class="fieldset mb-4">
        <legend class="fieldset-legend">Message</legend>
        <textarea
          name="comment"
          rows={5}
          placeholder="Tell us more..."
          required
          class="textarea w-full"
          data-contact-target="message"
        ></textarea>
      </fieldset>

      <button
        type="submit"
        class="btn btn-primary"
        data-contact-target="submit"
      >
        Send Message
      </button>

      <p
        class="text-sm text-success mt-3 hidden"
        data-contact-target="success"
      >
        Your message has been sent. We'll get back to you soon.
      </p>
      <p
        class="text-sm text-error mt-3 hidden"
        data-contact-target="error"
      >
        Something went wrong. Please try again.
      </p>
    </form>
  </section>
);