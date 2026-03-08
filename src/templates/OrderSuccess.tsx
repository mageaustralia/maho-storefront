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
    <div class="py-16 flex flex-col items-center text-center" data-controller="order-success">
      <div data-order-success-target="content">
        <div class="text-success mb-4">
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
        <div class="mt-8">
          <a href="/" class="btn btn-primary">Continue Shopping</a>
        </div>
      </div>
      <div data-order-success-target="error" style="display:none">
        <div class="text-error mb-4">
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