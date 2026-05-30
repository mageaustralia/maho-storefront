/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { api } from './api.js';

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} [currency] - Currency code (defaults to window.MAHO_CURRENCY or 'USD')
 */
export function formatPrice(amount, currency) {
  if (amount == null) return '';
  const curr = currency || window.MAHO_CURRENCY || 'USD';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: curr }).format(amount);
}

/**
 * Update cart badge count in header
 */
export function updateCartBadge() {
  const qty = parseInt(localStorage.getItem('maho_cart_qty') || '0', 10);
  document.querySelectorAll('[data-cart-target="count"]').forEach(el => {
    el.textContent = String(qty);
    el.style.display = qty > 0 ? 'inline-flex' : 'none';
  });
}

let _lastBadgeReconcile = 0;
/**
 * Reconcile the header cart badge against the REAL backend cart.
 *
 * The badge otherwise renders a cached number (`maho_cart_qty`) that can drift
 * from the server — guest carts expire, get emptied at checkout in another tab,
 * etc. — which produced the "badge says 4 but the cart is empty" mismatch.
 * Running this on every page load makes the badge self-healing: it can never
 * stay wrong past the next navigation.
 *
 * Safe on failure: any 4xx means the stored cart reference is dead — gone (404),
 * invalid, or no longer ours (401/403, e.g. a guest cart that got attached to a
 * customer account after login and is now inaccessible once the token expires).
 * We clear it and zero the badge. 5xx / network / parse errors are transient, so
 * we leave the cached value untouched and retry on the next load.
 */
export async function reconcileCartBadge({ force = false } = {}) {
  const cartId = localStorage.getItem('maho_cart_id');
  if (!cartId) {
    localStorage.setItem('maho_cart_qty', '0');
    updateCartBadge();
    return;
  }
  const now = Date.now();
  if (!force && now - _lastBadgeReconcile < 10000) return; // throttle rapid Turbo navigations
  _lastBadgeReconcile = now;
  try {
    const cart = await api.get(`/api/guest-carts/${cartId}`);
    const qty = Number(cart?.itemsQty) || (Array.isArray(cart?.items) ? cart.items.length : 0);
    localStorage.setItem('maho_cart_qty', String(qty));
  } catch (e) {
    if (e && e.status >= 400 && e.status < 500) {
      // Dead reference (gone / invalid / inaccessible) — drop it so we stop
      // re-requesting it (the recurring 401) and the badge stops lying.
      localStorage.removeItem('maho_cart_id');
      localStorage.setItem('maho_cart_qty', '0');
    }
    // else: transient (5xx / network) — keep the cached value, retry next load.
  }
  updateCartBadge();
}

/**
 * Dispatch cart updated event
 */
export function dispatchCartEvent(detail = {}) {
  document.dispatchEvent(new CustomEvent('cart:updated', { detail }));
}

/**
 * Ensure a cart exists, creating one if needed
 */
export async function ensureCart() {
  const existing = api.cartId();
  if (existing) return existing;
  const response = await api.post('/api/guest-carts', {});
  if (!response.ok) throw new Error('Failed to create cart');
  const data = await response.json();
  api.setCartId(data.maskedId);
  return data.maskedId;
}

const RECENTLY_VIEWED_KEY = "maho_recently_viewed";
const RECENTLY_VIEWED_MAX = 20;

/**
 * Track a product view in localStorage.
 * @param {{id: number, name: string, urlKey: string, thumbnailUrl: string, price: number, finalPrice: number}} product
 */
export function trackRecentlyViewed(product) {
  if (!product?.urlKey) return;
  try {
    let items = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
    items = items.filter(p => p.urlKey !== product.urlKey);
    items.unshift({
      id: product.id, name: product.name, urlKey: product.urlKey,
      thumbnailUrl: product.thumbnailUrl || null,
      price: product.price || 0, finalPrice: product.finalPrice || 0,
    });
    if (items.length > RECENTLY_VIEWED_MAX) items.length = RECENTLY_VIEWED_MAX;
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items));
  } catch {}
}

/**
 * Get recently viewed products, excluding given URL keys.
 * @param {string[]} excludeKeys - URL keys to exclude (e.g. current product)
 * @param {number} limit
 * @returns {Array}
 */
export function getRecentlyViewed(excludeKeys = [], limit = 8) {
  try {
    const items = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
    return items.filter(p => !excludeKeys.includes(p.urlKey)).slice(0, limit);
  } catch { return []; }
}

// The Customer/Address DTOs from /api/customers/me use lowercase `firstname`/
// `lastname` (preserving Magento DB convention), while every other DTO and
// all client code uses camelCase. Mutate in place so downstream reads of
// data.firstName / addr.firstName resolve to the lowercase fallback.
export function normalizeCustomer(data) {
  if (!data || typeof data !== 'object') return data;
  if (data.firstname && !data.firstName) data.firstName = data.firstname;
  if (data.lastname && !data.lastName) data.lastName = data.lastname;
  if (Array.isArray(data.addresses)) data.addresses.forEach(normalizeAddress);
  return data;
}

export function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'object') return addr;
  if (addr.firstname && !addr.firstName) addr.firstName = addr.firstname;
  if (addr.lastname && !addr.lastName) addr.lastName = addr.lastname;
  return addr;
}