/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * GA4-compatible dataLayer for e-commerce tracking.
 * Push events to window.dataLayer for GTM to consume.
 */

function push(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null }); // Clear previous ecommerce data
  window.dataLayer.push({ event, ...params });
}

function mapItem(product, index = 0, listName = '') {
  return {
    item_id: product.sku || product.id,
    item_name: product.name,
    price: product.finalPrice || product.price || 0,
    index,
    ...(listName && { item_list_name: listName }),
  };
}

export const analytics = {
  /** Track page view — called on Turbo navigation */
  pageView(url, title) {
    push('page_view', {
      page_location: url || window.location.href,
      page_title: title || document.title,
    });
  },

  /** Track product detail view */
  viewItem(product, currency = 'AUD') {
    push('view_item', {
      ecommerce: {
        currency,
        value: product.finalPrice || product.price || 0,
        items: [mapItem(product)],
      },
    });
  },

  /** Track product list view (category page) */
  viewItemList(products, listName, currency = 'AUD') {
    push('view_item_list', {
      ecommerce: {
        currency,
        item_list_name: listName,
        items: products.slice(0, 20).map((p, i) => mapItem(p, i, listName)),
      },
    });
  },

  /** Track add to cart */
  addToCart(product, qty = 1, currency = 'AUD') {
    push('add_to_cart', {
      ecommerce: {
        currency,
        value: (product.finalPrice || product.price || 0) * qty,
        items: [{ ...mapItem(product), quantity: qty }],
      },
    });
  },

  /** Track remove from cart */
  removeFromCart(product, qty = 1, currency = 'AUD') {
    push('remove_from_cart', {
      ecommerce: {
        currency,
        value: (product.price || 0) * qty,
        items: [{ ...mapItem(product), quantity: qty }],
      },
    });
  },

  /** Track checkout begin */
  beginCheckout(items, total, currency = 'AUD') {
    push('begin_checkout', {
      ecommerce: {
        currency,
        value: total,
        items: items.map((item, i) => ({
          item_id: item.sku,
          item_name: item.name,
          price: item.rowTotalInclTax / item.qty,
          quantity: item.qty,
          index: i,
        })),
      },
    });
  },

  /** Track purchase */
  purchase(orderId, items, total, tax, shipping, currency = 'AUD') {
    push('purchase', {
      ecommerce: {
        transaction_id: orderId,
        currency,
        value: total,
        tax,
        shipping,
        items: items.map((item, i) => ({
          item_id: item.sku,
          item_name: item.name,
          price: item.price,
          quantity: item.qty,
          index: i,
        })),
      },
    });
  },
};