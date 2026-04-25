/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Marketplace extension cart controller. Adds an extension license (single
 * or unlimited) to the guest cart by SKU. The license tier is encoded as a
 * Maho catalog product custom-option named `license_type` so a single
 * marketplace SKU can carry both tiers without forking the product.
 *
 * If the backend product is not yet wired with a license_type option, the
 * POST will return an error which we surface inline — by design, so the
 * pricing is honest about which tiers are actually purchasable.
 */
import { Controller } from '../stimulus.js';
import { ensureCart, dispatchCartEvent, updateCartBadge } from '../utils.js';
import { api } from '../api.js';
import { analytics } from '../analytics.js';

export default class extends Controller {
  static values = {
    sku: String,
    name: String,
    currency: { type: String, default: 'AUD' },
  };
  static targets = ['message'];

  async add(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const tier = button.dataset.tier;
    const price = parseFloat(button.dataset.price || '0');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Adding...';

    try {
      const maskedId = await ensureCart();
      const body = {
        sku: this.skuValue,
        qty: 1,
        options: { license_type: tier },
      };
      const response = await api.post(`/api/guest-carts/${maskedId}/items`, body);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err['hydra:description'] || err.detail || err.message || `HTTP ${response.status}`);
      }
      const cart = await response.json();
      localStorage.setItem('maho_cart_qty', String(cart.itemsQty || 0));
      updateCartBadge();
      dispatchCartEvent(cart);
      document.dispatchEvent(new CustomEvent('cart:open'));
      analytics.addToCart({ sku: this.skuValue, name: this.nameValue, price, finalPrice: price }, 1, this.currencyValue);
      button.textContent = 'Added!';
      setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 1500);
    } catch (e) {
      button.textContent = originalText;
      button.disabled = false;
      if (this.hasMessageTarget) {
        this.messageTarget.textContent = e.message;
        this.messageTarget.classList.remove('hidden');
      } else {
        alert(`Could not add to cart: ${e.message}`);
      }
    }
  }
}
