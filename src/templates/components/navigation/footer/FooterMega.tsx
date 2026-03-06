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

/**
 * Mega Footer
 *
 * Three rows: newsletter bar (centered), link columns with logo, social + copyright.
 */
export const FooterMega: FC<FooterProps> = ({ config, footerPages }) => (
  <footer class="bg-neutral text-neutral-content">
    {/* Row 1: Newsletter bar */}
    <div class="border-b border-neutral-content/10" data-controller="newsletter">
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 max-w-[var(--content-max)] mx-auto">
        <p class="font-semibold text-sm uppercase tracking-wider shrink-0">Subscribe to our newsletter</p>
        <form class="join w-full sm:w-auto" data-newsletter-target="form" data-action="submit->newsletter#submit">
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            class="input join-item w-full sm:w-72"
            data-newsletter-target="email"
          />
          <button type="submit" class="btn btn-primary join-item" data-newsletter-target="submit">Subscribe</button>
        </form>
        <p class="text-sm text-success hidden" data-newsletter-target="success">Thanks for subscribing!</p>
        <p class="text-sm text-error hidden" data-newsletter-target="error">Something went wrong. Please try again.</p>
      </div>
    </div>

    {/* Row 2: Logo + link columns */}
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 p-10 max-w-[var(--content-max)] mx-auto">
      {/* Brand column */}
      <aside class="col-span-2 md:col-span-4 lg:col-span-1">
        {config.logoUrl ? (
          <img src={config.logoUrl} alt={config.logoAlt ?? config.storeName} class="h-10 w-auto brightness-0 invert" />
        ) : (
          <span class="text-xl font-extrabold tracking-tight lowercase">{config.storeName}</span>
        )}
        <p class="max-w-[220px] mt-2 text-neutral-content/60 text-sm">Providing quality products and exceptional service since 2024.</p>
      </aside>

      {/* Company links */}
      <nav class="flex flex-col gap-2">
        <p class="footer-title">Company</p>
        <a href="/about-maho-demo-store" class="link link-hover text-sm">About Us</a>
        <a href="/contacts" class="link link-hover text-sm">Contact</a>
        <a href="/blog" class="link link-hover text-sm">Blog</a>
      </nav>

      {/* Customer Service links */}
      <nav class="flex flex-col gap-2">
        <p class="footer-title">Customer Service</p>
        <a href="/privacy-policy-cookie-restriction-mode" class="link link-hover text-sm">Privacy Policy</a>
        {footerPages
          .filter(p => !['about-maho-demo-store', 'privacy-policy-cookie-restriction-mode', 'contacts'].includes(p.identifier))
          .slice(0, 4)
          .map(p => (
            <a key={p.identifier} href={`/${p.identifier}`} class="link link-hover text-sm">{p.title}</a>
          ))
        }
      </nav>

      {/* Account links */}
      <nav class="flex flex-col gap-2">
        <p class="footer-title">Account</p>
        <a href="/account" class="link link-hover text-sm">My Account</a>
        <a href="/account?tab=orders" class="link link-hover text-sm">Orders &amp; Returns</a>
        <a href="/account?tab=wishlist" class="link link-hover text-sm">My Wishlist</a>
        <a href="/search" class="link link-hover text-sm">Advanced Search</a>
      </nav>
    </div>

    {/* Row 3: Social + copyright */}
    <div class="border-t border-neutral-content/10">
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 max-w-[var(--content-max)] mx-auto">
        <p class="text-sm text-neutral-content/50">&copy; {new Date().getFullYear()} {config.storeName}. All rights reserved.</p>
      </div>
    </div>
  </footer>
);