/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';

// Global flag prevents duplicate wishlist fetches across Turbo navigations
let _wishlistFetched = false;

export default class WishlistController extends Controller {
  connect() {
    this._items = []; // array of { productId, itemId (server-side, null for guests) }
    this._loadLocal();
    this._boundUpdate = (e) => this._onWishlistUpdated(e);
    this._boundSync = () => this._syncOnLogin();
    document.addEventListener('wishlist:updated', this._boundUpdate);
    document.addEventListener('wishlist:sync', this._boundSync);
    // If logged in, fetch server wishlist (once per page session)
    if (!_wishlistFetched && localStorage.getItem('maho_token')) {
      _wishlistFetched = true;
      this._fetchServerWishlist();
    }
    // Restore UI state from localStorage on page load
    this._dispatchUpdate();
  }

  disconnect() {
    document.removeEventListener('wishlist:updated', this._boundUpdate);
    document.removeEventListener('wishlist:sync', this._boundSync);
  }

  _loadLocal() {
    try {
      const stored = localStorage.getItem('maho_wishlist');
      this._items = stored ? JSON.parse(stored) : [];
    } catch {
      this._items = [];
    }
  }

  _saveLocal() {
    localStorage.setItem('maho_wishlist', JSON.stringify(this._items));
  }

  _getProductIds() {
    return this._items.map(i => i.productId);
  }

  _isInWishlist(productId) {
    return this._items.some(i => i.productId === Number(productId));
  }

  _dispatchUpdate() {
    const productIds = this._getProductIds();
    document.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { productIds } }));
  }

  _onWishlistUpdated(e) {
    // Update all heart buttons on the page
    const productIds = e.detail?.productIds || this._getProductIds();
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      const pid = Number(btn.dataset.productId);
      btn.classList.toggle('wishlisted', productIds.includes(pid));
      btn.setAttribute('aria-label', productIds.includes(pid) ? 'Remove from Wishlist' : 'Add to Wishlist');
    });
  }

  async toggle(event) {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const productId = Number(btn.dataset.productId);
    if (!productId || this._busy) return;
    this._busy = true;

    try {
    const isLoggedIn = !!localStorage.getItem('maho_token');
    const existing = this._items.find(i => i.productId === productId);

    if (existing) {
      // Remove
      if (isLoggedIn && existing.itemId) {
        try {
          await api.del(`/api/customers/me/wishlist/${existing.itemId}`);
        } catch {}
      }
      this._items = this._items.filter(i => i.productId !== productId);
    } else {
      // Add
      if (isLoggedIn) {
        try {
          const response = await api.post('/api/customers/me/wishlist', { productId, qty: 1 });
          if (response.ok) {
            const data = await response.json();
            this._items.push({ productId, itemId: data.id || null });
          } else {
            this._items.push({ productId, itemId: null });
          }
        } catch {
          this._items.push({ productId, itemId: null });
        }
      } else {
        this._items.push({ productId, itemId: null });
      }
    }

    this._saveLocal();
    this._dispatchUpdate();
    } finally {
      this._busy = false;
    }
  }

  async _fetchServerWishlist() {
    try {
      const data = await api.get('/api/customers/me/wishlist');
      const serverItems = (data.member || data || []).map(item => ({
        productId: item.productId,
        itemId: item.id,
      }));
      // Merge: server items take precedence, add any local-only items
      const merged = [...serverItems];
      for (const local of this._items) {
        if (!merged.some(s => s.productId === local.productId)) {
          merged.push(local);
        }
      }
      this._items = merged;
      this._saveLocal();
      this._dispatchUpdate();
    } catch {
      // Use local data if server fails
      this._dispatchUpdate();
    }
  }

  async _syncOnLogin() {
    // Sync local wishlist items to server after login
    const localItems = this._items.filter(i => !i.itemId);
    if (localItems.length > 0) {
      for (const item of localItems) {
        try {
          const response = await api.post('/api/customers/me/wishlist', { productId: item.productId, qty: 1 });
          if (response.ok) {
            const data = await response.json();
            item.itemId = data.id || null;
          }
        } catch {}
      }
    }
    // Then fetch the full server list to get proper state
    _wishlistFetched = true;
    await this._fetchServerWishlist();
  }
}

// Newsletter Controller