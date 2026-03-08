/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { updateCartBadge } from '../utils.js';

export default class OrderSuccessController extends Controller {
  static targets = ['orderNumber', 'orderEmail', 'content', 'error'];

  async connect() {
    // Get order ID and token from URL params
    const params = new URLSearchParams(window.location.search);
    let incrementId = params.get('order');
    let orderToken = params.get('token');
    let email = '';

    // Fallback: check sessionStorage for redirect-based payments (PayPal etc.)
    if (!incrementId || !orderToken) {
      const pending = sessionStorage.getItem('maho_pending_order');
      if (pending) {
        try {
          const data = JSON.parse(pending);
          incrementId = data.incrementId;
          orderToken = data.orderToken;
          email = data.email || '';
          sessionStorage.removeItem('maho_pending_order');
        } catch {}
      }
    }

    if (!incrementId || !orderToken) {
      this._showError();
      return;
    }

    try {
      const response = await api.post(`/api/orders/${encodeURIComponent(incrementId)}/verify`, {
        orderToken,
      });

      if (!response.ok) {
        this._showError();
        return;
      }

      const order = await response.json();
      if (!order.verified) {
        this._showError();
        return;
      }

      // Order verified — now safe to clear cart
      localStorage.removeItem('maho_cart_id');
      localStorage.removeItem('maho_cart_qty');
      updateCartBadge();

      if (this.hasOrderNumberTarget) {
        this.orderNumberTarget.textContent = `Your order number is #${order.incrementId}`;
      }
      if (this.hasOrderEmailTarget && (order.email || email)) {
        this.orderEmailTarget.textContent = `A confirmation email will be sent to ${order.email || email}`;
      }
    } catch {
      this._showError();
    }
  }

  _showError() {
    if (this.hasContentTarget) {
      this.contentTarget.style.display = 'none';
    }
    if (this.hasErrorTarget) {
      this.errorTarget.style.display = '';
    }
  }
}
