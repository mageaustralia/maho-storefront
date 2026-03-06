/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart, getRecentlyViewed } from '../utils.js';
import { hydrateTemplate, setSlotHtml, setSlotAttributes, showSlot } from '../template-helpers.js';

export default class CartController extends Controller {
  static targets = ['count', 'qty', 'addButton', 'message', 'items', 'content', 'empty', 'loading',
    'subtotal', 'tax', 'total', 'discount', 'discountRow', 'shipping', 'shippingRow',
    'giftcardTotal', 'giftcardRow', 'promoTabs',
    'couponTab', 'couponForm', 'couponApplied', 'couponInput', 'couponBadge',
    'giftcardTab', 'giftcardInput', 'giftcardsApplied',
    'checkoutBtn', 'checkoutMessage',
    'recommendations', 'recsList', 'recentlyViewed', 'recentlyViewedList'];
  static values = { productId: String, productType: String, sku: String, mode: String };

  connect() {
    updateCartBadge();
    if (this.modeValue === 'page') {
      this.loadCart();
    }
  }

  async add(event) {
    event.preventDefault();
    const button = this.hasAddButtonTarget ? this.addButtonTarget : event.currentTarget;
    const originalText = button.textContent;
    button.textContent = 'Adding...';
    button.disabled = true;

    try {
      const maskedId = await ensureCart();
      const qty = this.hasQtyTarget ? parseInt(this.qtyTarget.value, 10) : 1;
      const body = { sku: this.skuValue, qty };

      let response = await api.post(`/api/guest-carts/${maskedId}/items`, body);

      // If cart is stale/expired, create a new one and retry
      if (response.status === 400 || response.status === 404) {
        localStorage.removeItem('maho_cart_id');
        localStorage.removeItem('maho_cart_qty');
        const newId = await ensureCart();
        response = await api.post(`/api/guest-carts/${newId}/items`, body);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error['hydra:description'] || error.detail || error.message || 'Failed to add item');
      }

      const cart = await response.json();
      localStorage.setItem('maho_cart_qty', String(cart.itemsQty || 0));
      updateCartBadge();
      dispatchCartEvent(cart);
      document.dispatchEvent(new CustomEvent('cart:open'));

      if (this.hasMessageTarget) {
        this.messageTarget.textContent = 'Added to cart!';
        this.messageTarget.className = 'cart-message success';
        setTimeout(() => { this.messageTarget.textContent = ''; this.messageTarget.className = 'cart-message'; }, 3000);
      }
    } catch (e) {
      if (this.hasMessageTarget) {
        this.messageTarget.textContent = e.message;
        this.messageTarget.className = 'cart-message error';
      }
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  async loadCart() {
    const maskedId = api.cartId();
    if (!maskedId) {
      if (this.hasLoadingTarget) this.loadingTarget.style.display = 'none';
      if (this.hasEmptyTarget) this.emptyTarget.style.display = '';
      return;
    }

    let cart;
    try {
      cart = await api.get(`/api/guest-carts/${maskedId}`);
    } catch (e) {
      if (this.hasLoadingTarget) this.loadingTarget.style.display = 'none';
      if (this.hasEmptyTarget) this.emptyTarget.style.display = '';
      // Only clear cart ID if definitively gone (404). Transient errors (500, network)
      // should not permanently destroy the cart reference.
      if (e.status === 404) {
        localStorage.removeItem('maho_cart_id');
        localStorage.removeItem('maho_cart_qty');
        updateCartBadge();
      }
      return;
    }
    if (this.hasLoadingTarget) this.loadingTarget.style.display = 'none';
    this._renderCart(cart);
  }

  _renderCart(cart) {
    if (!cart.items || cart.items.length === 0) {
      if (this.hasContentTarget) this.contentTarget.style.display = 'none';
      if (this.hasEmptyTarget) this.emptyTarget.style.display = '';
      if (this.hasRecommendationsTarget) this.recommendationsTarget.style.display = 'none';
      localStorage.setItem('maho_cart_qty', '0');
      updateCartBadge();
      return;
    }

    if (this.hasEmptyTarget) this.emptyTarget.style.display = 'none';
    if (this.hasContentTarget) this.contentTarget.style.display = '';

    let hasOos = false;
    if (this.hasItemsTarget) {
      this.itemsTarget.innerHTML = '';
      cart.items.forEach(item => {
        const isOos = item.stockStatus === 'out_of_stock';
        if (isOos) hasOos = true;
        const productUrl = item.urlKey ? `/${item.urlKey}` : '#';

        const el = hydrateTemplate('tpl-cart-item', {
          image: item.thumbnailUrl,
          name: item.name,
          qty: String(item.qty),
          price: formatPrice(item.rowTotalInclTax),
        });

        el.dataset.itemId = item.id;
        if (isOos) el.classList.add('opacity-50');

        // Set links and image alt
        setSlotAttributes(el, {
          'image-link': { href: productUrl },
          'name-link': { href: productUrl },
          'image': { alt: item.name || '' },
        });

        // SKU
        const skuSlot = el.querySelector('[data-slot="sku"]');
        if (skuSlot) skuSlot.textContent = `SKU: ${item.sku}`;

        // Options
        if (item.options?.length) {
          const optSlot = el.querySelector('[data-slot="options"]');
          if (optSlot) optSlot.textContent = item.options.map(o => `${o.label}: ${o.value}`).join(', ');
        }

        // OOS badge
        if (isOos) showSlot(el, 'oos-badge');

        // Qty controls
        const qtyControls = el.querySelector('[data-slot="qty-controls"]');
        if (isOos && qtyControls) {
          qtyControls.style.display = 'none';
        } else {
          setSlotAttributes(el, {
            'qty-minus': { 'data-action': 'click->cart#decrementQty', 'data-item-id': String(item.id), 'data-current-qty': String(item.qty) },
            'qty-plus': { 'data-action': 'click->cart#incrementQty', 'data-item-id': String(item.id), 'data-current-qty': String(item.qty) },
          });
        }

        // Remove button
        setSlotAttributes(el, {
          'remove': { 'data-action': 'cart#removeItem', 'data-item-id': String(item.id) },
        });

        this.itemsTarget.appendChild(el);
      });
    }

    // Update totals
    const prices = cart.prices || {};
    if (this.hasSubtotalTarget) this.subtotalTarget.textContent = formatPrice(prices.subtotal || 0);
    if (this.hasTaxTarget) this.taxTarget.textContent = formatPrice(prices.taxAmount || 0);
    if (this.hasTotalTarget) this.totalTarget.textContent = formatPrice(prices.grandTotal || 0);

    if (this.hasDiscountRowTarget) {
      if (prices.discountAmount && prices.discountAmount !== 0) {
        this.discountRowTarget.style.display = '';
        if (this.hasDiscountTarget) this.discountTarget.textContent = `-${formatPrice(prices.discountAmount)}`;
      } else {
        this.discountRowTarget.style.display = 'none';
      }
    }

    if (this.hasShippingRowTarget) {
      if (prices.shippingAmount != null && prices.shippingAmount > 0) {
        this.shippingRowTarget.style.display = '';
        if (this.hasShippingTarget) this.shippingTarget.textContent = formatPrice(prices.shippingAmount);
      } else {
        this.shippingRowTarget.style.display = 'none';
      }
    }

    // Coupon
    if (cart.couponCode) {
      if (this.hasCouponFormTarget) this.couponFormTarget.style.display = 'none';
      if (this.hasCouponAppliedTarget) {
        this.couponAppliedTarget.style.display = '';
        if (this.hasCouponBadgeTarget) this.couponBadgeTarget.textContent = cart.couponCode;
      }
    } else {
      if (this.hasCouponFormTarget) this.couponFormTarget.style.display = '';
      if (this.hasCouponAppliedTarget) this.couponAppliedTarget.style.display = 'none';
    }

    // Gift cards
    if (this.hasGiftcardsAppliedTarget) {
      this.giftcardsAppliedTarget.innerHTML = '';
      if (cart.appliedGiftcards?.length > 0) {
        this.giftcardsAppliedTarget.style.display = '';
        cart.appliedGiftcards.forEach(gc => {
          const el = hydrateTemplate('tpl-giftcard-badge', {
            label: `${gc.code} (-${formatPrice(gc.appliedAmount)})`,
          });
          setSlotAttributes(el, {
            'remove': { 'data-action': 'click->cart#removeGiftcard', 'data-gc-code': gc.code },
          });
          this.giftcardsAppliedTarget.appendChild(el);
        });
      } else {
        this.giftcardsAppliedTarget.style.display = 'none';
      }
    }

    if (this.hasGiftcardRowTarget) {
      const gcTotal = prices.giftcardAmount || (cart.appliedGiftcards?.reduce((sum, gc) => sum + gc.appliedAmount, 0) || 0);
      if (gcTotal > 0) {
        this.giftcardRowTarget.style.display = '';
        if (this.hasGiftcardTotalTarget) this.giftcardTotalTarget.textContent = `-${formatPrice(gcTotal)}`;
      } else {
        this.giftcardRowTarget.style.display = 'none';
      }
    }

    // Smart promo tab defaulting (DaisyUI radio tabs — CSS handles show/hide)
    if (this.hasPromoTabsTarget) {
      const hasGc = cart.appliedGiftcards?.length > 0;
      const hasCoupon = !!cart.couponCode;
      const showGiftcard = hasGc && !hasCoupon;
      if (showGiftcard && this.hasGiftcardTabTarget) {
        this.giftcardTabTarget.checked = true;
      } else if (this.hasCouponTabTarget) {
        this.couponTabTarget.checked = true;
      }
    }

    // Checkout button OOS handling
    if (this.hasCheckoutBtnTarget) {
      if (hasOos) {
        this.checkoutBtnTarget.classList.add('btn-disabled');
        this.checkoutBtnTarget.style.pointerEvents = 'none';
        if (this.hasCheckoutMessageTarget) {
          this.checkoutMessageTarget.style.display = '';
          this.checkoutMessageTarget.textContent = 'Remove out-of-stock items to proceed';
        }
      } else {
        this.checkoutBtnTarget.classList.remove('btn-disabled');
        this.checkoutBtnTarget.style.pointerEvents = '';
        if (this.hasCheckoutMessageTarget) this.checkoutMessageTarget.style.display = 'none';
      }
    }

    localStorage.setItem('maho_cart_qty', String(cart.itemsQty || 0));
    updateCartBadge();

    // Fetch cross-sell recommendations for cart page
    this._loadRecommendations(cart.items);

    // Render recently viewed products
    this._renderRecentlyViewed(cart.items);
  }

  async _loadRecommendations(items) {
    if (!this.hasRecommendationsTarget || !this.hasRecsListTarget) return;

    const ids = items
      .map(item => item.productId)
      .filter(Boolean)
      .slice(0, 10);

    if (ids.length === 0) {
      this.recommendationsTarget.style.display = 'none';
      return;
    }

    try {
      const resp = await fetch(`/api/cart-recommendations?ids=${ids.join(',')}`);
      const data = await resp.json();
      if (!data.products || data.products.length === 0) {
        this.recommendationsTarget.style.display = 'none';
        return;
      }

      // Show up to 8 on the full cart page
      const recs = data.products.slice(0, 8);
      this.recsListTarget.innerHTML = '';
      recs.forEach(p => {
        const url = p.urlKey ? `/${p.urlKey}` : '#';
        const price = p.finalPrice ?? p.price ?? 0;
        const hasDiscount = p.specialPrice && p.finalPrice && p.price && p.finalPrice < p.price;

        const el = hydrateTemplate('tpl-product-card', {
          link: url,
          image: p.thumbnailUrl,
          name: p.name,
        });
        el.classList.add('min-w-[180px]', 'max-w-[220px]', 'shrink-0', 'snap-start');
        setSlotAttributes(el, { 'image': { alt: p.name || '' } });

        // Price with optional discount
        const priceHtml = hasDiscount
          ? `<span class="line-through text-base-content/40 text-xs">${formatPrice(p.price)}</span> <span class="text-error font-semibold">${formatPrice(price)}</span>`
          : `<span class="font-semibold">${formatPrice(price)}</span>`;
        setSlotHtml(el, 'price', priceHtml);

        this.recsListTarget.appendChild(el);
      });

      this.recommendationsTarget.style.display = '';
    } catch {
      this.recommendationsTarget.style.display = 'none';
    }
  }

  _renderRecentlyViewed(cartItems) {
    if (!this.hasRecentlyViewedTarget || !this.hasRecentlyViewedListTarget) return;

    const cartSkus = (cartItems || []).map(i => i.sku).filter(Boolean);
    const items = getRecentlyViewed(cartSkus, 8);
    if (items.length === 0) {
      this.recentlyViewedTarget.style.display = 'none';
      return;
    }

    this.recentlyViewedListTarget.innerHTML = '';
    items.forEach(p => {
      const url = `/${p.urlKey}`;
      const price = p.finalPrice || p.price || 0;
      const hasDiscount = p.finalPrice && p.price && p.finalPrice < p.price;

      const el = hydrateTemplate('tpl-product-card', {
        link: url,
        image: p.thumbnailUrl,
        name: p.name,
      });
      el.classList.add('min-w-[180px]', 'max-w-[220px]', 'shrink-0', 'snap-start');
      setSlotAttributes(el, { 'image': { alt: p.name || '' } });

      const priceHtml = hasDiscount
        ? `<span class="line-through text-base-content/40 text-xs">${formatPrice(p.price)}</span> <span class="text-error font-semibold">${formatPrice(price)}</span>`
        : `<span class="font-semibold">${formatPrice(price)}</span>`;
      setSlotHtml(el, 'price', priceHtml);

      this.recentlyViewedListTarget.appendChild(el);
    });

    this.recentlyViewedTarget.style.display = '';
  }

  async incrementQty(event) {
    if (this._busy) return;
    const itemId = event.currentTarget.dataset.itemId;
    const currentQty = parseInt(event.currentTarget.dataset.currentQty, 10);
    await this._updateItemQty(itemId, currentQty + 1);
  }

  async decrementQty(event) {
    if (this._busy) return;
    const itemId = event.currentTarget.dataset.itemId;
    const currentQty = parseInt(event.currentTarget.dataset.currentQty, 10);
    if (currentQty <= 1) {
      await this.removeItem(event);
    } else {
      await this._updateItemQty(itemId, currentQty - 1);
    }
  }

  async updateQty(event) {
    if (this._busy) return;
    const itemId = event.target.dataset.itemId;
    const qty = parseInt(event.target.value, 10);
    if (qty < 1) return;
    await this._updateItemQty(itemId, qty);
  }

  async _updateItemQty(itemId, qty) {
    const maskedId = api.cartId();
    if (!maskedId) return;
    this._busy = true;

    const itemEl = this.hasItemsTarget && this.itemsTarget.querySelector(`[data-item-id="${itemId}"]`);
    if (itemEl) {
      const qtyVal = itemEl.querySelector('[data-slot="qty"]');
      if (qtyVal) qtyVal.textContent = qty;
      const minus = itemEl.querySelector('[data-slot="qty-minus"]');
      const plus = itemEl.querySelector('[data-slot="qty-plus"]');
      if (minus) minus.disabled = true;
      if (plus) plus.disabled = true;
    }

    try {
      const response = await api.put(`/api/guest-carts/${maskedId}/items/${itemId}`, { qty });
      if (response.ok) {
        const cart = await response.json();
        this._renderCart(cart);
        dispatchCartEvent();
      } else {
        this.loadCart();
      }
    } catch {
      this.loadCart();
    } finally {
      this._busy = false;
    }
  }

  async removeItem(event) {
    if (this._busy) return;
    const itemId = event.currentTarget.dataset.itemId;
    const maskedId = api.cartId();
    if (!maskedId) return;
    this._busy = true;

    const itemEl = this.hasItemsTarget && this.itemsTarget.querySelector(`[data-item-id="${itemId}"]`);
    if (itemEl) itemEl.style.opacity = '0.3';

    try {
      const response = await api.del(`/api/guest-carts/${maskedId}/items/${itemId}`);
      if (response.ok) {
        const cart = await response.json();
        this._renderCart(cart);
      } else {
        this.loadCart();
      }
      dispatchCartEvent();
    } catch {
      this.loadCart();
    } finally {
      this._busy = false;
    }
  }


  async applyCoupon() {
    const code = this.hasCouponInputTarget ? this.couponInputTarget.value.trim() : '';
    if (!code) return;
    const maskedId = api.cartId();
    if (!maskedId) return;
    try {
      const response = await api.post(`/api/guest-carts/${maskedId}/coupon`, { code });
      if (!response.ok) {
        const err = await response.json();
        alert(err.message || 'Invalid coupon');
        return;
      }
      const cart = await response.json();
      this._renderCart(cart);
      dispatchCartEvent();
    } catch {}
  }

  async removeCoupon() {
    const maskedId = api.cartId();
    if (!maskedId) return;
    try {
      const response = await api.del(`/api/guest-carts/${maskedId}/coupon`);
      if (response.ok) {
        const cart = await response.json();
        this._renderCart(cart);
      } else {
        this.loadCart();
      }
      dispatchCartEvent();
    } catch {}
  }

  async applyGiftcard() {
    const code = this.hasGiftcardInputTarget ? this.giftcardInputTarget.value.trim() : '';
    if (!code) return;
    const maskedId = api.cartId();
    if (!maskedId) return;
    try {
      const response = await api.post(`/api/guest-carts/${maskedId}/giftcard`, { code });
      if (!response.ok) {
        const err = await response.json();
        alert(err.message || 'Invalid gift card');
        return;
      }
      if (this.hasGiftcardInputTarget) this.giftcardInputTarget.value = '';
      const cart = await response.json();
      this._renderCart(cart);
      dispatchCartEvent();
    } catch {}
  }

  async removeGiftcard(event) {
    const code = event.currentTarget.dataset.gcCode;
    const maskedId = api.cartId();
    if (!maskedId || !code) return;
    try {
      const response = await api.del(`/api/guest-carts/${maskedId}/giftcard/${encodeURIComponent(code)}`);
      if (response.ok) {
        const cart = await response.json();
        this._renderCart(cart);
      } else {
        this.loadCart();
      }
      dispatchCartEvent();
    } catch {}
  }
}