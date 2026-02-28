/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';
import { hydrateTemplate, setSlotHtml, setSlotAttributes, showSlot } from '../template-helpers.js';

export default class CartDrawerController extends Controller {
  static targets = ['panel', 'count', 'loading', 'empty', 'items', 'footer',
    'subtotal', 'tax', 'total', 'discount', 'discountRow',
    'couponTab', 'giftcardTab', 'promoTabs',
    'couponForm', 'couponApplied', 'couponInput', 'couponBadge',
    'giftcardInput', 'giftcardsApplied', 'giftcardRow', 'giftcardTotal',
    'checkoutBtn', 'checkoutMessage',
    'recommendations', 'recsList'];

  connect() {
    this._open = false;
    this._busy = false;
    this._boundOpen = () => this.open();
    this._boundUpdate = (e) => {
      if (e.detail?._fromDrawer) return;
      if (this._open) this.refreshCart();
    };
    document.addEventListener('cart:open', this._boundOpen);
    document.addEventListener('cart:updated', this._boundUpdate);
  }

  disconnect() {
    document.removeEventListener('cart:open', this._boundOpen);
    document.removeEventListener('cart:updated', this._boundUpdate);
  }

  open() {
    this._open = true;
    this.element.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.refreshCart();
  }

  close() {
    this._open = false;
    this.element.classList.remove('open');
    document.body.style.overflow = '';
  }

  backdropClick(event) {
    if (!this.panelTarget.contains(event.target) &&
        (!this.hasRecommendationsTarget || !this.recommendationsTarget.contains(event.target))) {
      this.close();
    }
  }

  // Tab switching handled natively by DaisyUI radio tabs (CSS :checked)

  async refreshCart() {
    const maskedId = api.cartId();
    if (!maskedId) {
      this.showEmpty();
      return;
    }

    if (this.hasLoadingTarget) this.loadingTarget.style.display = '';
    if (this.hasEmptyTarget) this.emptyTarget.style.display = 'none';
    if (this.hasItemsTarget) this.itemsTarget.innerHTML = '';
    if (this.hasFooterTarget) this.footerTarget.style.display = 'none';
    if (this.hasRecommendationsTarget) this.recommendationsTarget.style.display = 'none';

    try {
      const cart = await api.get(`/api/guest-carts/${maskedId}`);
      if (this.hasLoadingTarget) this.loadingTarget.style.display = 'none';
      this._renderCartFromData(cart);
    } catch (e) {
      if (this.hasLoadingTarget) this.loadingTarget.style.display = 'none';
      if (e.status === 404) {
        localStorage.removeItem('maho_cart_id');
      }
      this.showEmpty();
    }
  }

  _renderCartFromData(cart) {
    if (!cart.items || cart.items.length === 0) {
      this.showEmpty();
      return;
    }

    if (this.hasLoadingTarget) this.loadingTarget.style.display = 'none';

    if (this.hasCountTarget) {
      this.countTarget.textContent = `(${cart.itemsQty || cart.items.length})`;
    }

    let hasOos = false;
    if (this.hasItemsTarget) {
      this.itemsTarget.innerHTML = '';
      cart.items.forEach(item => {
        const isOos = item.stockStatus === 'out_of_stock';
        if (isOos) hasOos = true;
        const productUrl = item.urlKey ? `/${item.urlKey}` : '#';

        const el = hydrateTemplate('tpl-drawer-item', {
          image: item.thumbnailUrl,
          name: item.name,
          price: formatPrice(item.rowTotalInclTax),
          qty: String(item.qty),
        });

        el.dataset.itemId = item.id;
        if (isOos) el.classList.add('opacity-50');

        // Set links
        setSlotAttributes(el, {
          'image-link': { href: productUrl },
          'name-link': { href: productUrl },
          'image': { alt: item.name || '' },
        });

        // Options text
        if (item.options?.length) {
          const optSlot = el.querySelector('[data-slot="options"]');
          if (optSlot) optSlot.textContent = item.options.map(o => `${o.label}: ${o.value}`).join(', ');
        }

        // OOS badge
        if (isOos) showSlot(el, 'oos-badge');

        // Qty controls: wire up Stimulus actions + hide if OOS
        const qtyControls = el.querySelector('[data-slot="qty-controls"]');
        if (isOos && qtyControls) {
          qtyControls.style.display = 'none';
        } else {
          setSlotAttributes(el, {
            'qty-minus': { 'data-action': 'click->cart-drawer#decrementQty', 'data-item-id': String(item.id), 'data-current-qty': String(item.qty) },
            'qty-plus': { 'data-action': 'click->cart-drawer#incrementQty', 'data-item-id': String(item.id), 'data-current-qty': String(item.qty) },
          });
        }

        // Remove button
        setSlotAttributes(el, {
          'remove': { 'data-action': 'click->cart-drawer#removeItem', 'data-item-id': String(item.id) },
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
        if (this.hasDiscountTarget) this.discountTarget.textContent = formatPrice(prices.discountAmount);
      } else {
        this.discountRowTarget.style.display = 'none';
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
            'remove': { 'data-action': 'click->cart-drawer#removeGiftcard', 'data-gc-code': gc.code },
          });
          this.giftcardsAppliedTarget.appendChild(el);
        });
      } else {
        this.giftcardsAppliedTarget.style.display = 'none';
      }
    }

    // Gift card total row
    if (this.hasGiftcardRowTarget) {
      const gcTotal = prices.giftcardAmount || (cart.appliedGiftcards?.reduce((sum, gc) => sum + gc.appliedAmount, 0) || 0);
      if (gcTotal > 0) {
        this.giftcardRowTarget.style.display = '';
        if (this.hasGiftcardTotalTarget) this.giftcardTotalTarget.textContent = `-${formatPrice(gcTotal)}`;
      } else {
        this.giftcardRowTarget.style.display = 'none';
      }
    }

    // Smart promo tab defaulting — check the appropriate radio input
    const hasGc = cart.appliedGiftcards?.length > 0;
    const hasCoupon = !!cart.couponCode;
    const showGiftcard = hasGc && !hasCoupon;
    if (showGiftcard && this.hasGiftcardTabTarget) {
      this.giftcardTabTarget.checked = true;
    } else if (this.hasCouponTabTarget) {
      this.couponTabTarget.checked = true;
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

    if (this.hasFooterTarget) this.footerTarget.style.display = '';

    localStorage.setItem('maho_cart_qty', String(cart.itemsQty || 0));
    updateCartBadge();

    // Fetch cross-sell recommendations
    this._loadRecommendations(cart.items);
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

      // Show max 4 in drawer (compact view)
      const recs = data.products.slice(0, 4);
      this.recsListTarget.innerHTML = '';
      recs.forEach(p => {
        const url = p.urlKey ? `/${p.urlKey}` : '#';
        const price = p.finalPrice ?? p.price ?? 0;
        const hasDiscount = p.specialPrice && p.finalPrice && p.price && p.finalPrice < p.price;

        const el = hydrateTemplate('tpl-drawer-rec-card', {
          link: url,
          image: p.thumbnailUrl,
          name: p.name,
        });
        setSlotAttributes(el, { 'image': { alt: p.name || '' } });

        // Price with optional discount
        const priceHtml = hasDiscount
          ? `<span class="line-through text-base-content/40">${formatPrice(p.price)}</span> ${formatPrice(price)}`
          : formatPrice(price);
        setSlotHtml(el, 'price', priceHtml);

        // Wire add-to-cart button
        const addBtn = el.querySelector('[data-slot="add-btn"]');
        if (addBtn && p.sku) {
          if (p.typeId === 'configurable') {
            // Configurable products — navigate to product page
            addBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = url;
            });
            addBtn.title = 'Select Options';
          } else {
            addBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this._addRecToCart(p.sku, addBtn);
            });
          }
        } else if (addBtn) {
          addBtn.style.display = 'none';
        }

        this.recsListTarget.appendChild(el);
      });

      this.recommendationsTarget.style.display = '';
    } catch {
      this.recommendationsTarget.style.display = 'none';
    }
  }

  async _addRecToCart(sku, btn) {
    if (this._busy) return;
    const maskedId = await ensureCart();
    if (!maskedId) return;

    const origText = btn.textContent;
    btn.textContent = '…';
    btn.classList.add('btn-disabled');

    try {
      await api.post(`/api/guest-carts/${maskedId}/items`, {
        cartItem: { sku, qty: 1, quote_id: maskedId }
      });
      btn.textContent = '✓';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-success');
      dispatchCartEvent(null, '_fromDrawer');
      this.refreshCart();
      setTimeout(() => {
        btn.textContent = origText;
        btn.classList.remove('btn-success', 'btn-disabled');
        btn.classList.add('btn-primary');
      }, 1500);
    } catch {
      btn.textContent = '!';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-error');
      setTimeout(() => {
        btn.textContent = origText;
        btn.classList.remove('btn-error', 'btn-disabled');
        btn.classList.add('btn-primary');
      }, 1500);
    }
  }

  showEmpty() {
    if (this.hasEmptyTarget) this.emptyTarget.style.display = '';
    if (this.hasItemsTarget) this.itemsTarget.innerHTML = '';
    if (this.hasFooterTarget) this.footerTarget.style.display = 'none';
    if (this.hasCountTarget) this.countTarget.textContent = '';
    if (this.hasRecommendationsTarget) this.recommendationsTarget.style.display = 'none';
    // Sync badge — if we're showing empty state, badge should reflect 0
    localStorage.setItem('maho_cart_qty', '0');
    updateCartBadge();
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
      await this._removeItem(itemId);
    } else {
      await this._updateItemQty(itemId, currentQty - 1);
    }
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
        this._renderCartFromData(cart);
      } else {
        await this.refreshCart();
      }
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { _fromDrawer: true } }));
    } catch {
      await this.refreshCart();
    } finally {
      this._busy = false;
    }
  }

  async removeItem(event) {
    if (this._busy) return;
    await this._removeItem(event.currentTarget.dataset.itemId);
  }

  async _removeItem(itemId) {
    const maskedId = api.cartId();
    if (!maskedId || !itemId) return;
    this._busy = true;

    const itemEl = this.hasItemsTarget && this.itemsTarget.querySelector(`[data-item-id="${itemId}"]`);
    if (itemEl) itemEl.style.opacity = '0.3';

    try {
      await api.del(`/api/guest-carts/${maskedId}/items/${itemId}`);
      await this.refreshCart();
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { _fromDrawer: true } }));
    } catch {
      await this.refreshCart();
    } finally {
      this._busy = false;
    }
  }

  async applyCoupon() {
    if (this._busy) return;
    const code = this.hasCouponInputTarget ? this.couponInputTarget.value.trim() : '';
    if (!code) return;
    const maskedId = api.cartId();
    if (!maskedId) return;
    this._busy = true;
    try {
      const response = await api.put(`/api/guest-carts/${maskedId}/coupon`, { code });
      if (!response.ok) {
        const err = await response.json();
        alert(err.message || 'Invalid coupon');
        return;
      }
      const cart = await response.json();
      this._renderCartFromData(cart);
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { _fromDrawer: true } }));
    } catch {} finally {
      this._busy = false;
    }
  }

  async removeCoupon() {
    if (this._busy) return;
    const maskedId = api.cartId();
    if (!maskedId) return;
    this._busy = true;
    try {
      const response = await api.del(`/api/guest-carts/${maskedId}/coupon`);
      if (response.ok) {
        const cart = await response.json();
        this._renderCartFromData(cart);
      } else {
        await this.refreshCart();
      }
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { _fromDrawer: true } }));
    } catch {} finally {
      this._busy = false;
    }
  }

  async applyGiftcard() {
    if (this._busy) return;
    const code = this.hasGiftcardInputTarget ? this.giftcardInputTarget.value.trim() : '';
    if (!code) return;
    const maskedId = api.cartId();
    if (!maskedId) return;
    this._busy = true;
    try {
      const response = await api.post(`/api/guest-carts/${maskedId}/giftcard`, { code });
      if (!response.ok) {
        const err = await response.json();
        alert(err.message || 'Invalid gift card');
        return;
      }
      if (this.hasGiftcardInputTarget) this.giftcardInputTarget.value = '';
      const cart = await response.json();
      this._renderCartFromData(cart);
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { _fromDrawer: true } }));
    } catch {} finally {
      this._busy = false;
    }
  }

  async removeGiftcard(event) {
    if (this._busy) return;
    const code = event.currentTarget.dataset.gcCode;
    const maskedId = api.cartId();
    if (!maskedId || !code) return;
    this._busy = true;
    try {
      const response = await api.del(`/api/guest-carts/${maskedId}/giftcard/${encodeURIComponent(code)}`);
      if (response.ok) {
        const cart = await response.json();
        this._renderCartFromData(cart);
      } else {
        await this.refreshCart();
      }
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { _fromDrawer: true } }));
    } catch {} finally {
      this._busy = false;
    }
  }
}