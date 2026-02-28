/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';

interface ContactPageProps {
  config: StoreConfig;
  categories: Category[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const ContactPage: FC<ContactPageProps> = ({ config, categories, stores, currentStoreCode, devData }) => (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo title={`Contact Us | ${config.storeName}`} description="Get in touch with us. We'd love to hear from you." />
    <div class="flex items-center justify-center min-h-[60vh] px-4 py-12" data-controller="contact">
      <div class="card bg-base-100 shadow-lg w-full max-w-lg">
        <div class="card-body">
          <h1 class="card-title text-2xl font-bold justify-center">Contact Us</h1>
          <p class="text-base-content/60 text-center mb-4">Have a question or feedback? We'd love to hear from you.</p>

          <div data-contact-target="message" class="empty:hidden"></div>

          <form data-action="submit->contact#submit" novalidate class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Name <span class="text-error">*</span></legend>
                <label class="input w-full">
                  <input type="text" id="contact-name" data-contact-target="name" required placeholder="Your name" autocomplete="name" class="grow" />
                </label>
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Email <span class="text-error">*</span></legend>
                <label class="input w-full">
                  <input type="email" id="contact-email" data-contact-target="email" required placeholder="you@example.com" autocomplete="email" class="grow" />
                </label>
              </fieldset>
            </div>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Phone <span class="text-base-content/40">(optional)</span></legend>
              <label class="input w-full">
                <input type="tel" id="contact-phone" data-contact-target="phone" placeholder="Your phone number" autocomplete="tel" class="grow" />
              </label>
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Message <span class="text-error">*</span></legend>
              <textarea id="contact-message" data-contact-target="comment" required rows={6} placeholder="How can we help?" class="textarea w-full"></textarea>
            </fieldset>
            {/* Honeypot — hidden from humans, bots fill it in */}
            <div style="position:absolute;left:-9999px;top:-9999px;" aria-hidden="true">
              <input type="text" name="company" data-contact-target="honeypot" tabindex={-1} autocomplete="off" />
            </div>
            <button type="submit" class="btn btn-primary btn-block" data-contact-target="submitBtn">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  </Layout>
);