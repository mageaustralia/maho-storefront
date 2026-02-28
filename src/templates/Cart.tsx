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
import { PromoTabs } from './components/PromoTabs';

interface CartPageProps {
  config: StoreConfig;
  categories: Category[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const CartPage: FC<CartPageProps> = ({ config, categories, stores, currentStoreCode, devData }) => (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo title={`Shopping Cart | ${config.storeName}`} />
    <div class="py-8" data-controller="cart" data-cart-mode-value="page">
      <h1 class="text-3xl font-bold tracking-tight mb-8">Shopping Cart</h1>

      {/* Loading skeleton — mirrors cart content grid to prevent CLS */}
      <div data-cart-target="loading">
        <div class="grid grid-cols-[1fr_340px] gap-10 items-start max-lg:grid-cols-1 animate-pulse">
          {/* Skeleton cart items */}
          <div class="flex flex-col border border-base-300 rounded-lg overflow-hidden divide-y divide-base-200">
            {[1, 2].map(i => (
              <div key={i} class="flex gap-4 p-4">
                <div class="w-20 h-20 bg-base-200 rounded shrink-0"></div>
                <div class="flex-1 space-y-2 py-1">
                  <div class="h-4 bg-base-200 rounded w-3/4"></div>
                  <div class="h-3 bg-base-200 rounded w-1/2"></div>
                  <div class="h-4 bg-base-200 rounded w-20"></div>
                </div>
                <div class="w-24 h-8 bg-base-200 rounded self-center shrink-0"></div>
              </div>
            ))}
          </div>
          {/* Skeleton order summary */}
          <div class="bg-base-200/50 rounded-lg p-5 border border-base-300">
            <div class="h-5 bg-base-200 rounded w-32 mb-5"></div>
            <div class="space-y-3">
              <div class="flex justify-between"><div class="h-3 bg-base-200 rounded w-16"></div><div class="h-3 bg-base-200 rounded w-14"></div></div>
              <div class="flex justify-between"><div class="h-3 bg-base-200 rounded w-10"></div><div class="h-3 bg-base-200 rounded w-14"></div></div>
              <div class="border-t border-base-300 pt-3 flex justify-between"><div class="h-4 bg-base-200 rounded w-12"></div><div class="h-4 bg-base-200 rounded w-16"></div></div>
            </div>
            <div class="h-10 bg-base-300 rounded-lg w-full mt-5"></div>
          </div>
        </div>
      </div>

      {/* Empty */}
      <div class="text-center py-16" data-cart-target="empty" style="display: none">
        <p class="text-base-content/60 mb-6">Your cart is empty.</p>
        <a href="/" class="btn btn-primary">Continue Shopping</a>
      </div>

      {/* Cart content */}
      <div class="grid grid-cols-[1fr_340px] gap-10 items-start max-lg:grid-cols-1" data-cart-target="content" style="display: none">
        {/* Cart items */}
        <div class="flex flex-col border border-base-300 rounded-lg overflow-hidden divide-y divide-base-200 max-h-[600px] overflow-y-auto" data-cart-target="items">
          {/* Items rendered by Stimulus controller via tpl-cart-item */}
        </div>

        {/* Order summary */}
        <div class="bg-base-200 rounded-lg p-5 sticky top-20 border border-border">
          <h3 class="text-lg font-bold mb-4">Order Summary</h3>
          <div class="text-sm space-y-1.5">
            <div class="flex justify-between">
              <span>Subtotal</span>
              <span data-cart-target="subtotal"><span class="inline-block h-3.5 w-14 bg-base-300 rounded animate-pulse"></span></span>
            </div>
            <div class="flex justify-between" data-cart-target="discountRow" style="display:none">
              <span>Discount</span>
              <span class="text-success" data-cart-target="discount">-$0.00</span>
            </div>
            <div class="flex justify-between" data-cart-target="shippingRow" style="display:none">
              <span>Shipping</span>
              <span data-cart-target="shipping">$0.00</span>
            </div>
            <div class="flex justify-between">
              <span>Tax</span>
              <span data-cart-target="tax"><span class="inline-block h-3.5 w-14 bg-base-300 rounded animate-pulse"></span></span>
            </div>
            <div class="flex justify-between" data-cart-target="giftcardRow" style="display:none">
              <span>Gift Card</span>
              <span class="text-success" data-cart-target="giftcardTotal">-$0.00</span>
            </div>
            <div class="flex justify-between font-bold text-base pt-2 border-t border-border">
              <span>Total</span>
              <span data-cart-target="total"><span class="inline-block h-4 w-16 bg-base-300 rounded animate-pulse"></span></span>
            </div>
          </div>

          <PromoTabs controller="cart" />

          {/* Checkout */}
          <div class="text-sm text-error text-center mt-3" data-cart-target="checkoutMessage" style="display:none"></div>
          <a href="/checkout" class="btn btn-primary w-full mt-4" data-cart-target="checkoutBtn">Proceed to Checkout</a>
        </div>
      </div>

      {/* Cross-sell recommendations */}
      <div class="mt-12" data-cart-target="recommendations" style="display: none">
        <h2 class="text-xl font-bold mb-4">You May Also Like</h2>
        <div class="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory" data-cart-target="recsList">
          {/* Rendered by Stimulus via tpl-product-card — children get constrained widths via CSS */}
        </div>
      </div>

      {/* Recently Viewed */}
      <div class="mt-12" data-cart-target="recentlyViewed" style="display: none">
        <h2 class="text-xl font-bold mb-4">Recently Viewed</h2>
        <div class="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory" data-cart-target="recentlyViewedList">
          {/* Rendered by Stimulus via tpl-product-card */}
        </div>
      </div>
    </div>
  </Layout>
);