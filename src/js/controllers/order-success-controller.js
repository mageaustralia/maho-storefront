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

    // Cache the first /details response in sessionStorage so:
    // (a) in-tab refresh shows the same receipt without re-hitting the API
    //     (the backend's one-time-use token would 404 the second request),
    // (b) analytics fire once per actual order placement, not once per
    //     render of this controller (Turbo / Stimulus can connect twice).
    const cacheKey = `maho_order_view:${incrementId}:${orderToken.slice(0, 12)}`;
    let order;
    let firstRender = true;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        order = JSON.parse(cached);
        firstRender = false;
      } catch {}
    }

    try {
      if (!order) {
        // GET /api/orders/{incrementId}/details with X-Order-Token header.
        // The backend consumes (clears) the token on success — that's why
        // we cache the response above; a second hit would 404.
        const response = await fetch(
          `${api.url()}/api/orders/${encodeURIComponent(incrementId)}/details`,
          {
            headers: {
              'Accept': 'application/ld+json',
              'X-Order-Token': orderToken,
            },
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          this._showError();
          return;
        }

        order = await response.json();
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(order));
        } catch {}
      }

      this._order = order;
      this._firstRender = firstRender;

      // Order verified — now safe to clear cart
      localStorage.removeItem('maho_cart_id');
      localStorage.removeItem('maho_cart_qty');
      updateCartBadge();

      // Backend now returns the Order DTO shape — customerEmail not email,
      // prices.* nested, item.price/qty mapped from order_item.
      const orderEmail = order.customerEmail || order.email || email;
      if (this.hasOrderNumberTarget) {
        this.orderNumberTarget.textContent = `Your order number is #${order.incrementId}`;
      }
      if (this.hasOrderEmailTarget && orderEmail) {
        this.orderEmailTarget.textContent = `A confirmation email will be sent to ${orderEmail}`;
      }

      // Render order summary
      this._renderOrderSummary(order);

      // Show guest account creation if backend issued an account token.
      if ((order.accountToken || order.canCreateAccount) && this.hasCreateAccountTarget) {
        this.createAccountTarget.style.display = '';
      }

      // Analytics: track purchase — but ONLY on the first render. Cached
      // re-renders (refresh, Turbo re-attach) must not double-count.
      const prices = order.prices || {};
      if (firstRender && order.items && order.items.length > 0) {
        analytics.purchase(
          order.incrementId,
          order.items,
          prices.grandTotal ?? order.grandTotal,
          prices.taxAmount ?? prices.tax ?? order.tax ?? 0,
          prices.shippingAmount ?? prices.shipping ?? order.shipping ?? 0,
          order.currency || 'USD',
        );
      }
    } catch {
      this._showError();
    }
  }

  _renderOrderSummary(order) {
    if (!order.items?.length || !this.hasOrderSummaryTarget) return;

    const currency = order.currency || 'USD';

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

    // Totals — Order DTO nests these under `prices` (subtotal/subtotalInclTax/
    // shippingAmount/taxAmount/grandTotal). Fall back to flat fields for the
    // pre-rest-v2 response shape.
    const prices = order.prices || {};
    const subtotal = prices.subtotalInclTax ?? prices.subtotal ?? order.subtotal ?? order.grandTotal;
    const shipping = prices.shippingAmountInclTax ?? prices.shippingAmount ?? prices.shipping ?? order.shipping;
    const tax = prices.taxAmount ?? prices.tax ?? order.tax ?? 0;
    const total = prices.grandTotal ?? order.grandTotal;
    if (this.hasSubtotalTarget) this.subtotalTarget.textContent = formatPrice(subtotal, currency);
    if (this.hasShippingTarget) this.shippingTarget.textContent = shipping ? formatPrice(shipping, currency) : 'Free';
    if (tax > 0 && this.hasTaxRowTarget && this.hasTaxTarget) {
      this.taxRowTarget.style.display = '';
      this.taxTarget.textContent = formatPrice(tax, currency);
    }
    if (this.hasTotalTarget) this.totalTarget.textContent = formatPrice(total, currency);

    this.orderSummaryTarget.style.display = '';
  }

  async createAccount() {
    const email = this._order?.customerEmail || this._order?.email;
    if (!email || !this.hasNewPasswordTarget) return;
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
