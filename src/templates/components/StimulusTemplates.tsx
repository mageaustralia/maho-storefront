/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * HTML <template> elements for Stimulus controllers.
 *
 * These are hidden by default (browser doesn't render <template> content).
 * Stimulus controllers clone them via hydrateTemplate() instead of building
 * HTML strings with innerHTML. This lets UnoCSS scan the DaisyUI/utility
 * classes at build time — solving the "runtime DOM classes" problem.
 *
 * Template IDs:
 *   tpl-product-card      — Category grid, cart recs, recently viewed, search
 *   tpl-cart-item         — Cart page items
 *   tpl-drawer-item       — Cart drawer items
 *   tpl-drawer-rec-card   — Cart drawer recommendations
 *   tpl-filter-group      — Category filter sidebar groups
 *   tpl-filter-option     — Individual filter option buttons
 *   tpl-active-filter     — Active filter chips
 *   tpl-search-result     — Search overlay product results
 *   tpl-giftcard-badge    — Applied gift card badges
 *   tpl-checkout-sidebar-item — Checkout order summary line items
 *   tpl-shipping-method   — Checkout shipping method radio option
 *   tpl-payment-method    — Checkout payment method radio option
 *   tpl-blog-card         — Blog listing cards (freshness controller)
 */
export const StimulusTemplates: FC = () => (
  <Fragment>
    {/* ================================================================
        Product Card — used by: category-filter, cart, product, search
        DaisyUI: card, badge
        ================================================================ */}
    <template id="tpl-product-card">
      <article class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full relative">
        <a data-slot="link" href="#" data-turbo-prefetch="true" class="flex flex-col flex-1">
          <figure class="relative aspect-square bg-[var(--product-image-bg)] overflow-hidden">
            <img data-slot="image" class="w-full h-full object-contain mix-blend-multiply" loading="lazy" decoding="async" alt="" />
            <span data-slot="badge-sale" class="badge badge-error absolute top-2 left-2 text-white hidden">Sale</span>
            <span data-slot="badge-oos" class="badge bg-base-300 text-base-content absolute top-2 left-2 hidden">Out of Stock</span>
          </figure>
          <div class="card-body p-3 gap-1.5 flex-1">
            <h3 data-slot="name" class="text-sm font-medium line-clamp-2"></h3>
            <div data-slot="price" class="flex items-baseline gap-2 text-sm"></div>
            <div data-slot="rating" class="flex items-center gap-1 text-xs text-base-content/60 hidden"></div>
          </div>
        </a>
        <div data-slot="actions" class="px-3 pb-3 mt-auto"></div>
        {/* Hover swatch overlay — activated by hover-swatch controller for configurable products */}
        <div data-slot="hover-overlay" data-hover-swatch-target="overlay" class="absolute inset-x-0 bottom-0 bg-base-100/95 backdrop-blur-sm flex flex-col gap-2 p-3 transition-all duration-250 ease-out hidden z-10 border-t border-base-200 rounded-b-[var(--rounded-box)]" style="transform: translateY(100%); opacity: 0">
          <div data-hover-swatch-target="swatches" class="flex flex-col gap-1.5"></div>
          <div data-hover-swatch-target="actions"></div>
        </div>
      </article>
    </template>

    {/* ================================================================
        Cart Drawer Item — used by: cart-drawer-controller
        DaisyUI: btn, join
        ================================================================ */}
    <template id="tpl-drawer-item">
      <div class="flex gap-3 p-4" data-slot="root">
        <a data-slot="image-link" href="#" class="shrink-0" data-turbo-prefetch="true">
          <img data-slot="image" class="w-20 h-20 rounded-lg object-cover bg-base-200" alt="" />
        </a>
        <div class="flex-1 min-w-0">
          <a data-slot="name-link" href="#" class="text-sm font-medium line-clamp-2 hover:text-primary transition-colors" data-turbo-prefetch="true">
            <span data-slot="name"></span>
          </a>
          <div data-slot="options" class="text-xs text-base-content/50 mt-0.5"></div>
          <div data-slot="oos-badge" class="badge badge-error badge-sm mt-1 hidden">Out of Stock</div>
          <div class="flex items-center justify-between mt-2">
            <span data-slot="price" class="text-sm font-bold"></span>
            <div data-slot="qty-controls" class="join">
              <button data-slot="qty-minus" class="btn btn-xs join-item">-</button>
              <span data-slot="qty" class="btn btn-xs join-item no-animation pointer-events-none w-8 tabular-nums"></span>
              <button data-slot="qty-plus" class="btn btn-xs join-item">+</button>
            </div>
          </div>
          <button data-slot="remove" class="btn btn-ghost btn-xs text-base-content/40 hover:text-error mt-1 px-0 transition-colors">Remove</button>
        </div>
      </div>
    </template>

    {/* ================================================================
        Cart Page Item — used by: cart-controller
        DaisyUI: btn
        ================================================================ */}
    <template id="tpl-cart-item">
      <div class="flex gap-3 p-4 bg-base-100" data-slot="root">
        <a data-slot="image-link" href="#" class="shrink-0" data-turbo-prefetch="true">
          <img data-slot="image" class="w-20 h-20 rounded-lg object-cover bg-base-200" alt="" />
        </a>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-medium"><a data-slot="name-link" href="#" data-turbo-prefetch="true"><span data-slot="name"></span></a></h3>
          <div data-slot="sku" class="text-xs text-base-content/50 mt-0.5"></div>
          <div data-slot="options" class="text-xs text-base-content/60 mt-0.5"></div>
          <div data-slot="oos-badge" class="badge badge-error badge-sm mt-1 hidden">Out of Stock</div>
          <div class="flex items-center justify-between mt-2">
            <div data-slot="qty-controls" class="join">
              <button data-slot="qty-minus" class="btn btn-xs join-item">-</button>
              <span data-slot="qty" class="btn btn-xs join-item no-animation pointer-events-none w-8 tabular-nums"></span>
              <button data-slot="qty-plus" class="btn btn-xs join-item">+</button>
            </div>
            <div data-slot="price" class="text-sm font-bold whitespace-nowrap"></div>
          </div>
          <button data-slot="remove" class="btn btn-ghost btn-xs text-base-content/40 hover:text-error mt-1 px-0 transition-colors">Remove</button>
        </div>
      </div>
    </template>

    {/* ================================================================
        Drawer Recommendation Card — used by: cart-drawer-controller
        DaisyUI: card
        ================================================================ */}
    <template id="tpl-drawer-rec-card">
      <div class="relative group">
        <a data-slot="link" href="#" class="card card-compact bg-base-100 shadow-sm hover:shadow-md transition-shadow" data-turbo-prefetch="true">
          <figure class="aspect-square bg-base-200">
            <img data-slot="image" class="w-full h-full object-contain mix-blend-multiply" loading="lazy" alt="" />
          </figure>
          <div class="card-body p-2 gap-0.5">
            <span data-slot="name" class="text-xs font-medium line-clamp-2"></span>
            <span data-slot="price" class="text-xs font-semibold text-primary"></span>
          </div>
        </a>
        <button data-slot="add-btn" class="btn btn-primary btn-xs btn-circle absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md" title="Add to Cart">+</button>
      </div>
    </template>

    {/* ================================================================
        Filter Group — used by: category-filter-controller
        Plain <details> with custom CSS (DaisyUI collapse unreliable)
        ================================================================ */}
    <template id="tpl-filter-group">
      <details class="filter-details mb-4" data-slot="root">
        <summary class="filter-summary" data-slot="toggle">
          <span data-slot="label"></span>
        </summary>
        <div class="filter-details-content">
          <ul data-slot="options" class="flex flex-col pb-0"></ul>
        </div>
      </details>
    </template>

    {/* ================================================================
        Filter Option — used by: category-filter-controller
        DaisyUI: checkbox, badge
        ================================================================ */}
    <template id="tpl-filter-option">
      <li>
        <button data-slot="button" class="flex items-center gap-2.5 w-full px-3 py-1.5 text-base-content/70 rounded-lg hover:bg-base-200 transition-colors">
          <span data-slot="check" class="inline-flex items-center justify-center w-4 h-4 shrink-0 rounded border border-base-content/15 text-xs text-transparent transition-colors">&#10003;</span>
          <span data-slot="label" class="flex-1 text-left"></span>
        </button>
      </li>
    </template>

    {/* ================================================================
        Active Filter Chip — used by: category-filter-controller
        DaisyUI: badge, btn
        ================================================================ */}
    <template id="tpl-active-filter">
      <button data-slot="chip" class="badge badge-soft badge-accent gap-1 cursor-pointer transition-colors">
        <span data-slot="label"></span>
        <span class="pointer-events-none" aria-hidden="true">&times;</span>
      </button>
    </template>

    {/* ================================================================
        Search Result Item — used by: search-controller
        ================================================================ */}
    <template id="tpl-search-result">
      <a data-slot="link" href="#" class="flex gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors" data-turbo-prefetch="true">
        <div class="w-12 h-12 rounded-lg bg-[var(--product-image-bg)] overflow-hidden shrink-0">
          <img data-slot="image" class="w-full h-full object-contain mix-blend-multiply" loading="lazy" alt="" />
        </div>
        <div class="min-w-0 flex-1">
          <div data-slot="name" class="text-sm font-medium line-clamp-1"></div>
          <div data-slot="price" class="text-sm font-semibold text-primary"></div>
        </div>
      </a>
    </template>

    {/* ================================================================
        Gift Card Badge — used by: cart-drawer, cart, checkout
        DaisyUI: badge
        ================================================================ */}
    <template id="tpl-giftcard-badge">
      <div class="badge badge-outline gap-1">
        <span data-slot="label"></span>
        <button data-slot="remove" class="btn btn-ghost btn-xs p-0 min-h-0 h-auto text-base-content/50 hover:text-error">&times;</button>
      </div>
    </template>

    {/* ================================================================
        Checkout Sidebar Item — used by: checkout-controller
        Order summary line items in the checkout sidebar
        ================================================================ */}
    <template id="tpl-checkout-sidebar-item">
      <div class="flex gap-3 py-3">
        <img data-slot="image" class="w-14 h-14 rounded object-cover bg-base-200 shrink-0" alt="" />
        <div class="flex-1 min-w-0">
          <div data-slot="name" class="text-sm font-medium leading-tight"></div>
          <div data-slot="qty" class="text-xs text-base-content/50 mt-0.5"></div>
          <div data-slot="options" class="text-xs text-base-content/50"></div>
        </div>
        <div data-slot="price" class="text-sm font-semibold shrink-0"></div>
      </div>
    </template>

    {/* ================================================================
        Shipping Method — used by: checkout-controller
        Radio button option for shipping method selection
        ================================================================ */}
    <template id="tpl-shipping-method">
      <label class="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
        <input data-slot="radio" type="radio" name="shipping_method" value=""
          class="radio radio-primary radio-sm"
          data-action="change->checkout#selectShipping" />
        <span data-slot="title" class="flex-1 text-sm"></span>
        <span data-slot="price" class="text-sm font-semibold"></span>
      </label>
    </template>

    {/* ================================================================
        Payment Method — used by: checkout-controller
        Radio button option for payment method selection
        ================================================================ */}
    <template id="tpl-payment-method">
      <div data-slot="wrapper">
        <label class="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
          <input data-slot="radio" type="radio" name="payment_method" value=""
            class="radio radio-primary radio-sm"
            data-action="change->checkout#selectPayment" />
          <span data-slot="title" class="text-sm"></span>
          <span data-slot="description" class="text-xs text-base-content/60 hidden"></span>
        </label>
        <div data-slot="fields" class="pl-9 pr-3 pb-3" style="display:none"></div>
      </div>
    </template>

    {/* ================================================================
        Blog Card — used by: freshness-controller
        Blog listing cards for the blog index page
        ================================================================ */}
    <template id="tpl-blog-card">
      <a data-slot="link" href="#" class="blog-card" data-turbo-prefetch="true">
        <img data-slot="image" class="blog-card-image" alt="" loading="lazy" decoding="async" />
        <div data-slot="placeholder" class="blog-card-placeholder hidden"></div>
        <div class="blog-card-info">
          <time data-slot="date" class="blog-card-date hidden"></time>
          <h3 data-slot="title" class="blog-card-title"></h3>
          <p data-slot="excerpt" class="blog-card-excerpt hidden"></p>
        </div>
      </a>
    </template>
  </Fragment>
);