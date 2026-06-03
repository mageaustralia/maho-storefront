/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Base (en) message catalog — the source of truth for UI copy.
 *
 * This is the FALLBACK catalog: every key the storefront uses should exist
 * here. Other languages (added under ./<lang>.ts and registered in ../index.ts)
 * may be partial — any missing key falls back to the value here, then to the
 * key itself, so a half-translated locale degrades gracefully.
 *
 * Keys are dot-namespaced by domain (common.*, cart.*, product.*, …). Use
 * {placeholders} for interpolation — see `t()` in ../index.ts. Keep this object
 * flat (string → string); nesting is not resolved.
 *
 * Migration is incremental: hard-coded copy in templates can be moved here a
 * few strings at a time. There is no requirement to translate everything at
 * once — the groundwork just makes each string addressable by a stable key.
 */
export const en = {
  // Generic UI
  'common.add_to_cart': 'Add to Cart',
  'common.buy_now': 'Buy Now',
  'common.search': 'Search',
  'common.menu': 'Menu',
  'common.close': 'Close',
  'common.loading': 'Loading…',
  'common.home': 'Home',
  'common.continue_shopping': 'Continue Shopping',
  'common.view_all': 'View All',
  'common.read_more': 'Read More',

  // Product
  'product.in_stock': 'In Stock',
  'product.out_of_stock': 'Out of Stock',
  'product.sku': 'SKU: {sku}',
  'product.quantity': 'Quantity',
  'product.related': 'You may also like',
  'product.reviews_count': '{count} reviews',
  'product.review_one': '{count} review',

  // Cart
  'cart.title': 'Your Cart',
  'cart.empty': 'Your cart is empty',
  'cart.subtotal': 'Subtotal',
  'cart.checkout': 'Checkout',
  'cart.remove': 'Remove',
  'cart.item_count': '{count} items',
  'cart.item_count_one': '{count} item',

  // Account / auth
  'account.sign_in': 'Sign In',
  'account.sign_out': 'Sign Out',
  'account.register': 'Create Account',
  'account.my_account': 'My Account',
  'account.email': 'Email',
  'account.password': 'Password',
} as const;

export type MessageKey = keyof typeof en;
