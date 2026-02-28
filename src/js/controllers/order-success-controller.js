/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';

export default class OrderSuccessController extends Controller {
  static targets = ['orderNumber', 'orderEmail'];

  connect() {
    const data = sessionStorage.getItem('maho_last_order');
    if (data) {
      try {
        const order = JSON.parse(data);
        if (this.hasOrderNumberTarget && order.incrementId) {
          this.orderNumberTarget.textContent = `Your order number is #${order.incrementId}`;
        }
        if (this.hasOrderEmailTarget && order.email) {
          this.orderEmailTarget.textContent = `A confirmation email will be sent to ${order.email}`;
        }
        sessionStorage.removeItem('maho_last_order');
      } catch {}
    }
  }
}

// On every page load, checks the live API for current page content.
// If the data differs from what was rendered (from KV), updates KV and reloads.
// This ensures users always see fresh data even if KV is stale.
// Freshness: client-driven revalidation
// The page renders with _lastChecked (unix timestamp of when KV data was last verified).
// If it's older than 60s, the CLIENT calls the Maho API directly, compares data,
// and tells the Worker to update KV if stale. No server-side API calls for freshness.