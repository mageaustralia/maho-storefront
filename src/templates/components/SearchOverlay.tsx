/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export const SearchOverlay: FC = () => (
  <div class="search-overlay" data-controller="search" data-action="keydown.esc@document->search#close">
    <div class="w-full max-w-5xl max-h-[85vh] bg-base-100 rounded-2xl shadow-xl flex flex-col overflow-hidden mx-4">
      <div class="p-4 px-5 border-b border-base-300">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 shrink-0 text-base-content/40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search products, categories, pages..."
            class="flex-1 border-none outline-none text-base py-1 text-base-content bg-transparent placeholder:text-base-content/40"
            data-search-target="input"
            data-action="input->search#onInput keydown.enter->search#submitSearch"
            autocomplete="off"
          />
          <button class="text-2xl text-base-content/40 hover:text-base-content transition-colors p-1 leading-none" data-action="search#close">&times;</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto" data-search-target="results" style="display:none">
        <div class="flex max-md:flex-col">
          {/* Left sidebar — categories, pages, suggestions */}
          <div class="w-72 max-md:w-full shrink-0 border-r max-md:border-r-0 max-md:border-b border-base-200 p-4 space-y-4">
            <div data-search-target="categoryResults"></div>
            <div data-search-target="pageResults"></div>
          </div>
          {/* Right — product grid */}
          <div class="flex-1 p-4">
            <div data-search-target="productResults"></div>
          </div>
        </div>
      </div>
      <div class="py-8 px-5 text-center text-base-content/50" data-search-target="empty" style="display:none">
        <p>No results found</p>
      </div>
    </div>
  </div>
);
