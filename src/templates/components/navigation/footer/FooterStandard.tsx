/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { StoreConfig } from '../../../../types';

interface FooterPage { identifier: string; title: string; }

interface FooterProps {
  config: StoreConfig;
  footerPages: FooterPage[];
}

export const Footer: FC<FooterProps> = ({ config, footerPages }) => (
  <footer class="mt-20 bg-secondary text-secondary-content">
    <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)] pt-12 pb-8">
      {/* Newsletter */}
      <div class="text-center mb-10 pb-8 border-b border-secondary-content/12" data-controller="newsletter">
        <h4 class="text-lg font-bold mb-2">Newsletter</h4>
        <p class="text-sm opacity-60 mb-4">Sign up for our newsletter to receive updates and exclusive offers.</p>
        <form class="flex gap-2 max-w-[400px] mx-auto" data-action="submit->newsletter#subscribe">
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
            class="flex-1 h-12 px-5 bg-secondary-content/8 border border-secondary-content/20 text-secondary-content text-sm placeholder:text-secondary-content/40 focus:border-primary focus:bg-secondary-content/12 focus:outline-none rounded-full"
            data-newsletter-target="email"
          />
          <button type="submit" class="btn btn-primary rounded-full whitespace-nowrap" data-newsletter-target="button">Subscribe</button>
        </form>
        <p class="text-sm mt-2 hidden" data-newsletter-target="message"></p>
      </div>

      {/* Link columns */}
      <div class="grid grid-cols-4 gap-8 mb-8 max-md:grid-cols-2 max-md:gap-6 max-sm:grid-cols-1 max-sm:gap-5">
        <div>
          <h4 class="text-sm font-bold uppercase tracking-wider text-secondary-content mb-3">Company</h4>
          <ul class="flex flex-col gap-2">
            <li><a href="/about-maho-demo-store" data-turbo-prefetch="true" class="text-sm opacity-55 no-underline transition-colors hover:text-primary">About Us</a></li>
            <li><a href="/contacts" data-turbo-prefetch="true" class="text-sm opacity-55 no-underline transition-colors hover:text-primary">Contact Us</a></li>
          </ul>
        </div>

        <div>
          <h4 class="text-sm font-bold uppercase tracking-wider text-secondary-content mb-3">Customer Service</h4>
          <ul class="flex flex-col gap-2">
            <li><a href="/privacy-policy-cookie-restriction-mode" data-turbo-prefetch="true" class="text-sm opacity-55 no-underline transition-colors hover:text-primary">Privacy Policy</a></li>
            {footerPages
              .filter(p => !['about-maho-demo-store', 'privacy-policy-cookie-restriction-mode', 'contacts'].includes(p.identifier))
              .map(p => (
                <li key={p.identifier}><a href={`/${p.identifier}`} data-turbo-prefetch="true" class="text-sm opacity-55 no-underline transition-colors hover:text-primary">{p.title}</a></li>
              ))
            }
          </ul>
        </div>

        <div>
          <h4 class="text-sm font-bold uppercase tracking-wider text-secondary-content mb-3">Quick Links</h4>
          <ul class="flex flex-col gap-2">
            <li><a href="/search" data-turbo-prefetch="true" class="text-sm opacity-55 no-underline transition-colors hover:text-primary">Advanced Search</a></li>
            <li><a href="/blog" data-turbo-prefetch="true" class="text-sm opacity-55 no-underline transition-colors hover:text-primary">Blog</a></li>
          </ul>
        </div>

        <div>
          <h4 class="text-sm font-bold uppercase tracking-wider text-secondary-content mb-3">Account</h4>
          <ul class="flex flex-col gap-2">
            <li><a href="/account" data-turbo-prefetch="true" class="text-sm opacity-55 no-underline transition-colors hover:text-primary">My Account</a></li>
            <li><a href="/account?tab=orders" data-turbo-prefetch="true" class="text-sm opacity-55 no-underline transition-colors hover:text-primary">Orders &amp; Returns</a></li>
            <li><a href="/account?tab=wishlist" data-turbo-prefetch="true" class="text-sm opacity-55 no-underline transition-colors hover:text-primary">My Wishlist</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div class="pt-6 border-t border-secondary-content/10 text-center">
        <span class="text-sm text-secondary-content/35">&copy; {new Date().getFullYear()} {config.storeName}. All rights reserved.</span>
      </div>
    </div>
  </footer>
);