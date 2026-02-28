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
        <h6 class="font-semibold text-sm uppercase tracking-wider shrink-0">Subscribe to our newsletter</h6>
        <form class="join w-full sm:w-auto" data-action="submit->newsletter#subscribe">
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            class="input join-item w-full sm:w-72"
            data-newsletter-target="email"
          />
          <button type="submit" class="btn btn-primary join-item" data-newsletter-target="button">Subscribe</button>
        </form>
        <p class="text-sm hidden" data-newsletter-target="message"></p>
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
        <h6 class="footer-title">Company</h6>
        <a href="/about-maho-demo-store" class="link link-hover text-sm">About Us</a>
        <a href="/contacts" class="link link-hover text-sm">Contact</a>
        <a href="/blog" class="link link-hover text-sm">Blog</a>
      </nav>

      {/* Customer Service links */}
      <nav class="flex flex-col gap-2">
        <h6 class="footer-title">Customer Service</h6>
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
        <h6 class="footer-title">Account</h6>
        <a href="/account" class="link link-hover text-sm">My Account</a>
        <a href="/account?tab=orders" class="link link-hover text-sm">Orders &amp; Returns</a>
        <a href="/account?tab=wishlist" class="link link-hover text-sm">My Wishlist</a>
        <a href="/search" class="link link-hover text-sm">Advanced Search</a>
      </nav>
    </div>

    {/* Row 3: Social + copyright */}
    <div class="border-t border-neutral-content/10">
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 max-w-[var(--content-max)] mx-auto">
        <div class="grid grid-flow-col gap-4">
          <a href="#" class="text-neutral-content/50 hover:text-neutral-content transition-colors" aria-label="Twitter">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="fill-current"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
          </a>
          <a href="#" class="text-neutral-content/50 hover:text-neutral-content transition-colors" aria-label="Instagram">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="#" class="text-neutral-content/50 hover:text-neutral-content transition-colors" aria-label="Facebook">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="fill-current"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
          </a>
        </div>
        <p class="text-sm text-neutral-content/50">&copy; {new Date().getFullYear()} {config.storeName}. All rights reserved.</p>
      </div>
    </div>
  </footer>
);