/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { PromoTabs } from '../../PromoTabs';

export const CartDrawer: FC = () => (
  <div class="fixed inset-0 z-50" style="display:none" data-controller="cart-drawer" data-action="click->cart-drawer#backdropClick keydown.esc@document->cart-drawer#close">
    {/* Backdrop */}
    <div class="absolute inset-0 bg-black/40 transition-opacity"></div>

    {/* Recommendations side panel */}
    <div class="absolute right-[380px] top-0 bottom-0 w-[180px] bg-base-100 shadow-lg p-3 overflow-y-auto max-lg:hidden" data-cart-drawer-target="recommendations" style="display:none">
      <h3 class="text-xs font-bold mb-2 uppercase tracking-wide text-base-content/60">You May Also Like</h3>
      <div class="flex flex-col gap-2" data-cart-drawer-target="recsList"></div>
    </div>

    {/* Main drawer */}
    <aside class="absolute right-0 top-0 bottom-0 w-[380px] max-w-full bg-base-100 shadow-xl flex flex-col" data-cart-drawer-target="panel">
      {/* Header */}
      <div class="flex items-center justify-between p-4 border-b border-base-200">
        <h2 class="text-lg font-bold">Your Cart <span class="text-sm font-normal text-base-content/60" data-cart-drawer-target="count"></span></h2>
        <button class="btn btn-ghost btn-sm btn-circle" data-action="cart-drawer#close" aria-label="Close cart">&times;</button>
      </div>

      {/* Body */}
      <div class="flex-1 overflow-y-auto">
        <div class="p-4 animate-pulse space-y-4" data-cart-drawer-target="loading" style="display:none">
          {[1, 2, 3].map(i => (
            <div key={i} class="flex gap-3">
              <div class="w-16 h-16 bg-base-200 rounded shrink-0"></div>
              <div class="flex-1 space-y-2 py-1">
                <div class="h-3 bg-base-200 rounded w-3/4"></div>
                <div class="h-3 bg-base-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
        <div class="text-center py-12" data-cart-drawer-target="empty" style="display:none">
          <p class="text-base-content/60 mb-4">Your cart is empty.</p>
          <a href="/" class="btn btn-primary btn-sm" data-action="click->cart-drawer#close">Continue Shopping</a>
        </div>
        <div class="divide-y divide-base-200/50" data-cart-drawer-target="items"></div>
      </div>

      {/* Footer */}
      <div class="border-t border-base-200 p-4" data-cart-drawer-target="footer" style="display:none">
        <PromoTabs controller="cart-drawer" />

        {/* Summary */}
        <div class="text-sm space-y-1.5 mt-4">
          <div class="flex justify-between"><span>Subtotal</span><span data-cart-drawer-target="subtotal"></span></div>
          <div class="flex justify-between" data-cart-drawer-target="discountRow" style="display:none"><span>Discount</span><span class="text-success" data-cart-drawer-target="discount"></span></div>
          <div class="flex justify-between"><span>Tax</span><span data-cart-drawer-target="tax"></span></div>
          <div class="flex justify-between" data-cart-drawer-target="giftcardRow" style="display:none"><span>Gift Card</span><span class="text-success" data-cart-drawer-target="giftcardTotal"></span></div>
          <div class="flex justify-between font-bold text-base pt-1.5 border-t border-base-200"><span>Total</span><span data-cart-drawer-target="total"></span></div>
        </div>

        <div class="text-sm text-error text-center mt-2" data-cart-drawer-target="checkoutMessage" style="display:none"></div>
        <a href="/checkout" class="btn btn-primary w-full mt-3 rounded-full" data-cart-drawer-target="checkoutBtn">Proceed to Checkout</a>
        <a href="/cart" class="block text-center text-sm text-base-content/60 hover:text-base-content mt-2 transition-colors" data-action="click->cart-drawer#close">View full cart</a>
      </div>
    </aside>
  </div>
);