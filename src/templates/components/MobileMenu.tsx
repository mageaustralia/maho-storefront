/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, StorefrontStore } from '../../types';
import { cleanUrlPath } from '../../utils/format';

interface MobileMenuProps {
  categories: Category[];
  config: StoreConfig;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
}

export const MobileMenu: FC<MobileMenuProps> = ({ categories, config, stores, currentStoreCode }) => (
  <div class="fixed inset-0 z-50" style="display:none" data-controller="mobile-menu"
    data-action="click->mobile-menu#backdropClick keydown.esc@document->mobile-menu#close mobile-menu:open@document->mobile-menu#open">
    {/* Backdrop */}
    <div class="absolute inset-0 bg-black/40 transition-opacity"></div>

    {/* Panel */}
    <nav class="absolute left-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-base-100 shadow-xl flex flex-col overflow-y-auto" data-mobile-menu-target="panel">
      {/* Header */}
      <div class="flex items-center justify-between p-4 border-b border-base-200">
        <span class="text-lg font-bold">Menu</span>
        <button class="btn btn-ghost btn-sm btn-circle" data-action="mobile-menu#close" aria-label="Close menu">&times;</button>
      </div>

      <div class="flex-1 overflow-y-auto">
        {/* Account Section */}
        <div class="p-4 border-b border-base-200" data-controller="auth-state">
          {/* Guest state */}
          <div class="flex gap-2" data-auth-state-target="guestLink">
            <a href="/login" class="btn btn-primary btn-sm flex-1" data-action="click->mobile-menu#close">Sign In</a>
            <a href="/register" class="btn btn-outline btn-sm flex-1" data-action="click->mobile-menu#close">Register</a>
          </div>
          {/* Logged-in state */}
          <div data-auth-state-target="userMenu" style="display:none">
            <div class="flex items-center gap-3 mb-3">
              <div class="avatar placeholder">
                <div class="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center" data-auth-state-target="avatar">?</div>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold truncate" data-auth-state-target="greeting">Welcome</p>
                <p class="text-xs text-base-content/50 truncate" data-auth-state-target="email"></p>
              </div>
            </div>
            <div class="flex gap-2">
              <a href="/account" class="btn btn-outline btn-sm flex-1" data-action="click->mobile-menu#close">My Account</a>
              <button class="btn btn-ghost btn-sm" data-action="auth-state#logout click->mobile-menu#close">Sign Out</button>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div class="px-4 py-3 border-b border-base-200">
          <h3 class="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2">Shop by Category</h3>
          <ul class="flex flex-col">
            {categories.filter(c => c.level === 2 && c.includeInMenu).map((cat) => {
              const children = cat.children?.filter(c => c.includeInMenu) ?? [];
              return (
                <li key={cat.id}>
                  <div class="flex items-center border-b border-base-200/50 last:border-b-0">
                    <a href={`/${cat.urlKey}`} class="flex-1 py-3 text-sm font-medium" data-action="click->mobile-menu#close" data-turbo-prefetch="true">
                      {(cat.extensions?.menuTitle as string | undefined) || cat.name}
                    </a>
                    {children.length > 0 && (
                      <button class="p-3 -mr-2 text-base-content/50" data-action="click->mobile-menu#toggleCategory" aria-label={`Expand ${(cat.extensions?.menuTitle as string | undefined) || cat.name}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {children.length > 0 && (
                    <ul class="bg-base-200/30" style="display:none">
                      {children.map((child) => (
                        <li key={child.id}>
                          <a href={`/${cleanUrlPath(child.urlPath) || child.urlKey}`} class="block py-2.5 pl-6 pr-4 text-sm text-base-content/70 hover:text-base-content" data-action="click->mobile-menu#close" data-turbo-prefetch="true">
                            {child.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Quick Links Section */}
        <div class="p-4 border-b border-base-200">
          <h3 class="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2">Quick Links</h3>
          <ul class="menu menu-sm p-0">
            <li>
              <a href="/search" class="gap-3" data-action="click->mobile-menu#close">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Search
              </a>
            </li>
            <li>
              <a href="/blog" class="gap-3" data-action="click->mobile-menu#close">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                Blog
              </a>
            </li>
            <li>
              <a href="/account?tab=wishlist" class="gap-3" data-action="click->mobile-menu#close" data-controller="wishlist-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                Wishlist
                <span class="badge badge-sm badge-primary" data-wishlist-badge-target="count" style="display:none">0</span>
              </a>
            </li>
            <li>
              <a href="/cart" class="gap-3" data-action="click->mobile-menu#close">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                Shopping Cart
                <span class="badge badge-sm badge-primary" data-cart-target="menuCount">0</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Store Switcher Section */}
        {stores && stores.length > 1 && (
          <div class="p-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2">Switch Store</h3>
            <ul class="menu menu-sm p-0">
              {stores.map((store) => (
                <li key={store.code}>
                  <a href={store.url} class={`flex items-center justify-between ${store.code === currentStoreCode ? 'active' : ''}`}>
                    <span>{store.name}</span>
                    {store.code === currentStoreCode && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  </div>
);