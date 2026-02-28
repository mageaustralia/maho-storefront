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