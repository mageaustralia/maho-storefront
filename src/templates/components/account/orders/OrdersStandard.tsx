/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Order history list with detail view and pagination.
 * Wired to account Stimulus controller (ordersPanel target).
 */
export const OrdersStandard: FC = () => (
  <div data-account-target="ordersPanel" style="display:none">
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <h2 class="card-title text-lg">Order History</h2>

        {/* Orders list */}
        <div data-account-target="ordersList" class="mt-4">
          <p class="text-base-content/60 text-sm">Loading orders...</p>
        </div>

        {/* Order detail (hidden by default) */}
        <div data-account-target="orderDetail" style="display:none"></div>

        {/* Pagination */}
        <div class="flex items-center justify-center gap-4 mt-4" data-account-target="ordersPagination" style="display:none">
          <button class="btn btn-outline btn-sm" data-action="account#prevOrdersPage">Previous</button>
          <span class="text-sm text-base-content/60" data-account-target="ordersPageInfo">Page 1</span>
          <button class="btn btn-outline btn-sm" data-action="account#nextOrdersPage">Next</button>
        </div>
      </div>
    </div>
  </div>
);