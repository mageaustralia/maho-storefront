/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { updateCartBadge, formatPrice } from '../utils.js';
import { analytics } from '../analytics.js';

export default class OrderSuccessController extends Controller {
  static targets = ['orderNumber', 'orderEmail', 'content', 'error',
    'orderSummary', 'orderItems', 'subtotal', 'shipping', 'tax', 'taxRow', 'total',
    'createAccount', 'newPassword', 'createAccountBtn', 'createAccountMsg'];

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

      this._order = order;

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

      // Render order summary
      this._renderOrderSummary(order);

      // Show guest account creation if backend issued an account token (via HttpOnly cookie)
      if (order.canCreateAccount && this.hasCreateAccountTarget) {
        this.createAccountTarget.style.display = '';
      }

      // Analytics: track purchase
      if (order.items && order.items.length > 0) {
        analytics.purchase(
          order.incrementId,
          order.items,
          order.grandTotal,
          order.tax || 0,
          order.shipping || 0,
          order.currency || 'AUD',
        );
      }
    } catch {
      this._showError();
    }
  }

  _renderOrderSummary(order) {
    if (!order.items?.length || !this.hasOrderSummaryTarget) return;

    const currency = order.currency || 'AUD';

    // Render items
    if (this.hasOrderItemsTarget) {
      this.orderItemsTarget.innerHTML = order.items.map(item => `
        <div class="flex justify-between items-center px-5 py-3 text-sm">
          <div>
            <span class="font-medium">${this._escapeHtml(item.name)}</span>
            <span class="text-base-content/50 ml-1">&times; ${item.qty}</span>
          </div>
          <span>${formatPrice(item.price * item.qty, currency)}</span>
        </div>
      `).join('');
    }

    // Totals
    if (this.hasSubtotalTarget) this.subtotalTarget.textContent = formatPrice(order.subtotal || order.grandTotal, currency);
    if (this.hasShippingTarget) this.shippingTarget.textContent = order.shipping ? formatPrice(order.shipping, currency) : 'Free';
    if (order.tax > 0 && this.hasTaxRowTarget && this.hasTaxTarget) {
      this.taxRowTarget.style.display = '';
      this.taxTarget.textContent = formatPrice(order.tax, currency);
    }
    if (this.hasTotalTarget) this.totalTarget.textContent = formatPrice(order.grandTotal, currency);

    this.orderSummaryTarget.style.display = '';
  }

  async createAccount() {
    if (!this._order?.email || !this.hasNewPasswordTarget) return;
    const password = this.newPasswordTarget.value;
    if (!password || password.length < 6) {
      this._showAccountMsg('Password must be at least 6 characters', true);
      return;
    }

    if (this.hasCreateAccountBtnTarget) {
      this.createAccountBtnTarget.disabled = true;
      this.createAccountBtnTarget.textContent = 'Creating...';
    }

    try {
      // accountToken is sent automatically via HttpOnly cookie — only send password
      const response = await api.post('/api/customers/create-from-order', {
        password,
      });

      if (response.ok) {
        this._showAccountMsg('Account created! You can now log in with your email and password.', false);
        if (this.hasNewPasswordTarget) this.newPasswordTarget.style.display = 'none';
        if (this.hasCreateAccountBtnTarget) this.createAccountBtnTarget.style.display = 'none';
      } else {
        const err = await response.json();
        this._showAccountMsg(err.message || err['hydra:description'] || 'Could not create account. You may already have one.', true);
        if (this.hasCreateAccountBtnTarget) {
          this.createAccountBtnTarget.disabled = false;
          this.createAccountBtnTarget.textContent = 'Create Account';
        }
      }
    } catch {
      this._showAccountMsg('Could not create account. Please try again.', true);
      if (this.hasCreateAccountBtnTarget) {
        this.createAccountBtnTarget.disabled = false;
        this.createAccountBtnTarget.textContent = 'Create Account';
      }
    }
  }

  _showAccountMsg(msg, isError) {
    if (!this.hasCreateAccountMsgTarget) return;
    this.createAccountMsgTarget.textContent = msg;
    this.createAccountMsgTarget.className = `text-sm mt-2 ${isError ? 'text-error' : 'text-success'}`;
    this.createAccountMsgTarget.style.display = '';
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
