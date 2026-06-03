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
  window.dataLayer.push({ ecommerce: null }); // Clear previous ecommerce data (GTM convention)
  // GA4 reads ecommerce fields (items/value/currency/transaction_id/…) as
  // TOP-LEVEL event params. Zaraz's dataLayer→GA4 mapping (and gtag.js) forward
  // top-level props verbatim, so we flatten the `ecommerce` block up while ALSO
  // keeping the nested object for GTM-style consumers. Without the flat copy,
  // GA4 gets the event name but no items/value — the data sits inside an
  // `ecommerce` object it never unwraps, which reads as "not registering".
  const { ecommerce, ...rest } = params;
  window.dataLayer.push(
    ecommerce ? { event, ...rest, ...ecommerce, ecommerce } : { event, ...rest },
  );
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

  /** Track site search */
  search(searchTerm) {
    push('search', { search_term: searchTerm });
  },

  /** Track product detail view */
  viewItem(product, currency = 'USD') {
    push('view_item', {
      ecommerce: {
        currency,
        value: product.finalPrice || product.price || 0,
        items: [mapItem(product)],
      },
    });
  },

  /** Track product list view (category page) */
  viewItemList(products, listName, currency = 'USD') {
    push('view_item_list', {
      ecommerce: {
        currency,
        item_list_name: listName,
        items: products.slice(0, 20).map((p, i) => mapItem(p, i, listName)),
      },
    });
  },

  /** Track add to cart */
  addToCart(product, qty = 1, currency = 'USD') {
    push('add_to_cart', {
      ecommerce: {
        currency,
        value: (product.finalPrice || product.price || 0) * qty,
        items: [{ ...mapItem(product), quantity: qty }],
      },
    });
  },

  /** Track remove from cart */
  removeFromCart(product, qty = 1, currency = 'USD') {
    push('remove_from_cart', {
      ecommerce: {
        currency,
        value: (product.price || 0) * qty,
        items: [{ ...mapItem(product), quantity: qty }],
      },
    });
  },

  /** Track add to wishlist */
  addToWishlist(product, currency = 'USD') {
    push('add_to_wishlist', {
      ecommerce: {
        currency,
        value: product.finalPrice || product.price || 0,
        items: [mapItem(product)],
      },
    });
  },

  /** Track cart view (full cart page) */
  viewCart(items, total, currency = 'USD') {
    push('view_cart', {
      ecommerce: {
        currency,
        value: total,
        items: items.map((item, i) => ({
          item_id: item.sku,
          item_name: item.name,
          price: item.priceInclTax ?? item.price ?? 0,
          quantity: item.qty,
          index: i,
        })),
      },
    });
  },

  /** Track checkout begin */
  beginCheckout(items, total, currency = 'USD') {
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

  /** Track shipping info added */
  addShippingInfo(items, total, shippingTier, currency = 'USD') {
    push('add_shipping_info', {
      ecommerce: {
        currency,
        value: total,
        shipping_tier: shippingTier,
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

  /** Track payment info added */
  addPaymentInfo(items, total, paymentType, currency = 'USD') {
    push('add_payment_info', {
      ecommerce: {
        currency,
        value: total,
        payment_type: paymentType,
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
  purchase(orderId, items, total, tax, shipping, currency = 'USD') {
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