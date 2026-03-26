/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, StorefrontStore } from '../../../../types';
import { cleanUrlPath } from '../../../../utils/format';

interface HeaderProps {
  categories: Category[];
  config: StoreConfig;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
}

export const Header: FC<HeaderProps> = ({ categories, config, stores, currentStoreCode }) => (
  <header class="sticky top-0 z-50 bg-base-100/95 backdrop-blur-md border-b border-base-300/50">
    <div class="flex items-center gap-6 max-w-[var(--content-max)] mx-auto px-[var(--content-padding)] h-[var(--header-height)]">
      {/* Hamburger — mobile only */}
      <button
        class="hidden max-lg:flex items-center justify-center w-10 h-10 shrink-0 text-base-content rounded-md hover:bg-base-content/10 transition-colors"
        onclick="document.dispatchEvent(new CustomEvent('mobile-menu:open'))"
        aria-label="Open menu"
      >
        <svg class="w-5.5 h-5.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Logo */}
      <a href="/" class="flex items-center shrink-0 no-underline text-base-content hover:text-base-content" data-turbo-prefetch="true">
        {config.logoUrl ? (
          <img src={config.logoUrl} alt={config.logoAlt ?? config.storeName} class="h-9 w-auto" width="133" height="36" />
        ) : (
          <span class="text-xl font-extrabold tracking-tight whitespace-nowrap lowercase">{config.storeName}</span>
        )}
      </a>

      {/* Main Nav — desktop only */}
      <nav class="flex-1 flex items-center max-lg:hidden">
        <ul class="flex items-center gap-1">
          {categories.filter(c => c.level === 2 && c.includeInMenu).map((cat) => (
            <li key={cat.id} class="relative group">
              <a
                href={`/${cat.urlKey}`}
                data-turbo-prefetch="true"
                class="block px-4 py-2 font-medium text-base-content/80 rounded-md no-underline whitespace-nowrap transition-colors hover:text-base-content hover:bg-base-content/10"
              >
                {cat.menuTitle || cat.name}
              </a>
              {cat.children && cat.children.length > 0 && (
                <ul class="hidden group-hover:block absolute top-full left-0 pt-2 min-w-[200px] pb-1 px-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 before:content-[''] before:absolute before:left-0 before:right-0 before:bottom-full before:h-3">
                  {cat.children.filter(c => c.includeInMenu).map((child) => (
                    <li key={child.id}>
                      <a
                        href={`/${cleanUrlPath(child.urlPath) || child.urlKey}`}
                        data-turbo-prefetch="true"
                        class="block px-3 py-1.5 text-sm text-base-content/70 rounded-md no-underline transition-colors hover:text-base-content hover:bg-base-content/10"
                      >
                        {child.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Header Actions */}
      <div class="flex items-center gap-1 shrink-0 ml-auto">
        {/* Store Switcher — desktop only */}
        {stores && stores.length > 1 && (
          <div class="relative group max-lg:hidden mr-2">
            <button class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-base-content/70 bg-base-200 border border-base-300 rounded-full cursor-pointer transition-all hover:text-base-content hover:border-base-content/20" aria-label="Switch store" aria-expanded="false">
              <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span class="max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap">{stores.find(s => s.code === currentStoreCode)?.name ?? 'Store'}</span>
              <svg class="w-3 h-3 shrink-0 transition-transform group-hover:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="hidden group-hover:block absolute top-full right-0 pt-2 min-w-[160px] pb-1 px-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 before:content-[''] before:absolute before:left-0 before:right-0 before:bottom-full before:h-3">
              {stores.map((store) => (
                <a
                  key={store.code}
                  href={store.url}
                  class={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm font-medium no-underline rounded-md transition-colors ${
                    store.code === currentStoreCode
                      ? 'text-primary bg-primary/8'
                      : 'text-base-content/70 hover:text-base-content hover:bg-base-content/10'
                  }`}
                >
                  {store.name}
                  {store.code === currentStoreCode && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <button class="flex items-center justify-center w-10 h-10 text-base-content/80 rounded-md hover:text-base-content hover:bg-base-content/10 transition-colors" onclick="document.dispatchEvent(new CustomEvent('search:open'))" aria-label="Search">
          <svg class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>

        {/* Account — desktop only */}
        <div class="max-lg:hidden" data-controller="auth-state">
          {/* Guest state */}
          <a href="/login" class="flex items-center justify-center w-10 h-10 text-base-content/80 rounded-md hover:text-base-content hover:bg-base-content/10 transition-colors" data-auth-state-target="guestLink" aria-label="Sign in">
            <svg class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </a>
          {/* Logged-in state */}
          <div class="dropdown dropdown-end" data-auth-state-target="userMenu" style="display:none">
            <button class="flex items-center justify-center w-10 h-10 text-base-content/80 rounded-md hover:text-base-content hover:bg-base-content/10 transition-colors" data-action="auth-state#toggleDropdown" aria-label="Account menu">
              <svg class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
            <div class="dropdown-content bg-base-100 shadow-lg rounded-lg border border-base-300 py-1 px-1 w-48 z-50" data-auth-state-target="dropdown" style="display:none">
              <span class="block px-3 py-1.5 text-sm font-semibold text-base-content" data-auth-state-target="greeting">Hi, Guest</span>
              <a href="/account" class="block px-3 py-1.5 text-sm text-base-content/70 rounded-md no-underline hover:bg-base-content/10 hover:text-base-content transition-colors" data-turbo-prefetch="true">My Account</a>
              <a href="/account?tab=wishlist" class="block px-3 py-1.5 text-sm text-base-content/70 rounded-md no-underline hover:bg-base-content/10 hover:text-base-content transition-colors" data-turbo-prefetch="true">My Wishlist</a>
              <a href="/account?tab=orders" class="block px-3 py-1.5 text-sm text-base-content/70 rounded-md no-underline hover:bg-base-content/10 hover:text-base-content transition-colors" data-turbo-prefetch="true">My Orders</a>
              <div class="my-1 border-t border-base-200"></div>
              <button class="w-full text-left px-3 py-1.5 text-sm text-error rounded-md hover:bg-error/8 transition-colors" data-action="auth-state#logout">Sign Out</button>
            </div>
          </div>
        </div>

        {/* Cart */}
        <a href="/cart" class="flex items-center justify-center w-10 h-10 relative text-base-content/80 rounded-md hover:text-base-content hover:bg-base-content/10 transition-colors" data-turbo-prefetch="true" data-controller="cart" data-cart-target="badge" aria-label="Shopping cart">
          <svg class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span class="absolute -top-1 -right-1 hidden bg-primary text-primary-content text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" data-cart-target="count">0</span>
        </a>
      </div>
    </div>
  </header>
);