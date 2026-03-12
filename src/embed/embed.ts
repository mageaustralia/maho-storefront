/**
 * Maho Storefront — Embeddable Product Widget
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Usage on external sites:
 *   <script src="https://your-store.com/embed.js" data-store="https://your-store.com"></script>
 *   <div data-maho-product="SKU-001"></div>
 *   <div data-maho-product="SKU-002"></div>
 *
 * Optional attributes on the script tag:
 *   data-store       — Store origin URL (required)
 *   data-store-code  — Multi-store code (optional)
 *   data-currency    — Currency code, default "USD"
 *   data-accent      — Accent color hex, e.g. "#2563eb"
 *   data-country     — Default country code, e.g. "US"
 */

import { EmbedApi, type EmbedProduct } from './api';
import { MahoProductCard } from './product-card';
import { MahoLightbox } from './lightbox';
import { CartManager } from './cart-manager';
import { lightboxStyles } from './styles';

// Register custom elements
if (!customElements.get('maho-product-card')) {
  customElements.define('maho-product-card', MahoProductCard);
}
if (!customElements.get('maho-lightbox')) {
  customElements.define('maho-lightbox', MahoLightbox);
}

// Cart badge custom element
class MahoCartBadge extends HTMLElement {
  private shadow: ShadowRoot;
  private _onClick: (() => void) | null = null;
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }
  setClickHandler(handler: () => void) {
    this._onClick = handler;
  }
  render(count: number, accentColor: string) {
    this.shadow.innerHTML = `
      <style>${lightboxStyles}
        :host { --maho-accent: ${accentColor}; }
      </style>
      <div class="maho-cart-badge ${count > 0 ? 'visible' : ''}" data-badge>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <span class="maho-cart-count">${count}</span>
      </div>
    `;
    const badge = this.shadow.querySelector('[data-badge]');
    if (badge) {
      badge.addEventListener('click', () => {
        if (this._onClick) this._onClick();
      });
    }
  }
}
if (!customElements.get('maho-cart-badge')) {
  customElements.define('maho-cart-badge', MahoCartBadge);
}

// Main initialization
(function() {
  const scriptTag = document.currentScript as HTMLScriptElement
    || document.querySelector('script[data-store]');

  if (!scriptTag) {
    console.error('[Maho Embed] No script tag found with data-store attribute');
    return;
  }

  const storeOrigin = scriptTag.getAttribute('data-store') || scriptTag.src.replace(/\/embed\.js.*$/, '');
  const storeCode = scriptTag.getAttribute('data-store-code') || undefined;
  const currency = scriptTag.getAttribute('data-currency') || 'USD';
  const accentColor = scriptTag.getAttribute('data-accent') || '#2563eb';
  const defaultCountry = scriptTag.getAttribute('data-country') || 'US';
  const googleMapsKeyAttr = scriptTag.getAttribute('data-google-maps-key') || '';

  if (!storeOrigin) {
    console.error('[Maho Embed] data-store attribute is required');
    return;
  }

  const api = new EmbedApi(storeOrigin, storeCode);

  // Create lightbox (single shared instance)
  const lightbox = document.createElement('maho-lightbox') as MahoLightbox;
  document.body.appendChild(lightbox);

  // Create cart badge
  const cartBadge = document.createElement('maho-cart-badge') as MahoCartBadge;
  document.body.appendChild(cartBadge);

  // Cart manager
  const cart = new CartManager(api, (count) => {
    cartBadge.render(count, accentColor);
  });

  // Cart badge opens checkout flow
  cartBadge.setClickHandler(() => {
    lightbox.openCheckout(cart, currency, storeOrigin);
  });

  // Fetch countries for checkout form (async, non-blocking)
  let countries: Array<{ id: string; name: string; regions?: any[] }> = [];
  (async () => {
    try {
      const storeParam = storeCode ? `?store=${storeCode}` : '';
      const res = await fetch(`${storeOrigin}/api/countries${storeParam}`, {
        headers: { 'Accept': 'application/ld+json' },
      });
      if (res.ok) {
        const data = await res.json();
        countries = (data.member ?? data ?? []).map((c: any) => ({
          id: c.id || c.iso2Code,
          name: c.name,
          regions: c.availableRegions,
        }));
      }
    } catch {}
    // Pass context to lightbox once countries are loaded
    const gmKey = googleMapsKeyAttr || api.googleMapsKey || '';
    const detected = api.detectedCountry || '';
    lightbox.setContext(api, defaultCountry, countries, gmKey, detected);
  })();

  // Also set context immediately (countries will be empty until fetched)
  lightbox.setContext(api, defaultCountry, countries, googleMapsKeyAttr);

  // Open lightbox for a product
  function openProduct(product: EmbedProduct) {
    lightbox.open(product, cart, currency, storeOrigin);
  }

  // Scan DOM for product placeholders
  async function init() {
    const placeholders = document.querySelectorAll<HTMLElement>('[data-maho-product]');
    if (!placeholders.length) return;

    const skus = Array.from(new Set(
      Array.from(placeholders).map(el => el.dataset.mahoProduct!).filter(Boolean)
    ));

    let products: EmbedProduct[];
    try {
      products = await api.fetchProducts(skus);
    } catch (err) {
      console.error('[Maho Embed] Failed to fetch products:', err);
      return;
    }

    const productMap = new Map(products.map(p => [p.sku, p]));

    placeholders.forEach(el => {
      const sku = el.dataset.mahoProduct!;
      const product = productMap.get(sku);
      if (!product) {
        el.style.display = 'none';
        return;
      }

      const card = document.createElement('maho-product-card') as MahoProductCard;
      card.setCurrency(currency);
      card.setClickHandler(openProduct);
      card.setProduct(product);

      if (accentColor !== '#2563eb') {
        card.style.setProperty('--maho-accent', accentColor);
      }

      el.replaceWith(card);
    });

    await cart.refreshCount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API for programmatic use
  (window as any).MahoEmbed = {
    api,
    cart,
    openProduct,
    openCheckout() {
      lightbox.openCheckout(cart, currency, storeOrigin);
    },
    addProduct(sku: string, container: HTMLElement) {
      api.fetchProducts([sku]).then(products => {
        if (!products.length) return;
        const card = document.createElement('maho-product-card') as MahoProductCard;
        card.setCurrency(currency);
        card.setClickHandler(openProduct);
        card.setProduct(products[0]);
        container.appendChild(card);
      });
    }
  };
})();
