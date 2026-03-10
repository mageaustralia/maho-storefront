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

interface OrderSuccessProps {
  config: StoreConfig;
  categories: Category[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const OrderSuccessPage: FC<OrderSuccessProps> = ({ config, categories, stores, currentStoreCode, devData }) => (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo title={`Order Confirmed | ${config.storeName}`} />
    <div class="py-16 flex flex-col items-center text-center max-w-2xl mx-auto px-4" data-controller="order-success">
      <div data-order-success-target="content">
        <div class="flex justify-center text-success mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h1 class="text-3xl font-bold tracking-tight mb-3">Thank You for Your Order!</h1>
        <p class="text-lg text-base-content/70" data-order-success-target="orderNumber">
          Verifying your order...
        </p>
        <p class="text-base-content/60 mt-1" data-order-success-target="orderEmail"></p>

        {/* Order summary — populated by JS after verification */}
        <div data-order-success-target="orderSummary" style="display:none" class="mt-8 w-full text-left">
          <div class="border border-base-300 rounded-lg overflow-hidden">
            <div class="bg-base-200/50 px-5 py-3 font-semibold text-sm">Order Summary</div>
            <div data-order-success-target="orderItems" class="divide-y divide-base-200"></div>
            <div class="px-5 py-3 border-t border-base-300 space-y-1 text-sm">
              <div class="flex justify-between">
                <span class="text-base-content/60">Subtotal</span>
                <span data-order-success-target="subtotal"></span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Shipping</span>
                <span data-order-success-target="shipping"></span>
              </div>
              <div class="flex justify-between" data-order-success-target="taxRow" style="display:none">
                <span class="text-base-content/60">Tax</span>
                <span data-order-success-target="tax"></span>
              </div>
              <div class="flex justify-between font-semibold text-base pt-2 border-t border-base-200">
                <span>Total</span>
                <span data-order-success-target="total"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Guest account creation — shown only for guest orders */}
        <div data-order-success-target="createAccount" style="display:none" class="mt-6 w-full">
          <div class="border border-base-300 rounded-lg p-5 text-left">
            <p class="font-semibold mb-1">Save your details for next time</p>
            <p class="text-sm text-base-content/60 mb-4">Create an account to track your order and checkout faster.</p>
            <fieldset class="fieldset">
              <label class="input w-full">
                <input type="password" data-order-success-target="newPassword" placeholder="Choose a password" class="grow" minlength="6" />
              </label>
            </fieldset>
            <button data-order-success-target="createAccountBtn" data-action="click->order-success#createAccount" class="btn btn-sm btn-neutral mt-3 w-full">
              Create Account
            </button>
            <p data-order-success-target="createAccountMsg" class="text-sm mt-2" style="display:none"></p>
          </div>
        </div>

        <div class="mt-8">
          <a href="/" class="btn btn-primary">Continue Shopping</a>
        </div>
      </div>
      <div data-order-success-target="error" style="display:none">
        <div class="flex justify-center text-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h1 class="text-3xl font-bold tracking-tight mb-3">Order Not Found</h1>
        <p class="text-lg text-base-content/70">
          We couldn't verify this order. It may have already been viewed or the link has expired.
        </p>
        <div class="mt-8">
          <a href="/" class="btn btn-primary">Continue Shopping</a>
        </div>
      </div>
    </div>
  </Layout>
);
