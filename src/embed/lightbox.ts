/**
 * Maho Storefront — Embeddable Widget
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { EmbedProduct } from './api';
import type { EmbedApi } from './api';
import type { CartManager } from './cart-manager';
import { CheckoutFlow } from './checkout-flow';
import { lightboxStyles } from './styles';
import { resolveVariant, getAvailableValues, getDisplayPrice, type SelectedOptions } from './variant-resolver';

interface CountryOption {
  id: string;
  name: string;
  regions?: Array<{ id: number; code: string; name: string }>;
}

export class MahoLightbox extends HTMLElement {
  private product: EmbedProduct | null = null;
  private cart: CartManager | null = null;
  private api: EmbedApi | null = null;
  private currency = 'USD';
  private storeOrigin = '';
  private defaultCountry = 'US';
  private countries: CountryOption[] = [];
  private googleMapsKey = '';
  private detectedCountry = '';
  private selected: SelectedOptions = {};
  private shadow: ShadowRoot;
  private lightDomOverlay: HTMLDivElement | null = null;
  private checkoutFlow: CheckoutFlow | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  setContext(api: EmbedApi, defaultCountry: string, countries: CountryOption[], googleMapsKey: string = '', detectedCountry: string = '') {
    this.api = api;
    this.defaultCountry = defaultCountry;
    this.countries = countries;
    this.googleMapsKey = googleMapsKey;
    this.detectedCountry = detectedCountry;
  }

  open(product: EmbedProduct, cart: CartManager, currency: string, storeOrigin: string) {
    this.product = product;
    this.cart = cart;
    this.currency = currency;
    this.storeOrigin = storeOrigin;
    this.selected = {};
    this.render();
    document.body.style.overflow = 'hidden';
  }

  openCheckout(cart: CartManager, currency: string, storeOrigin: string) {
    this.cart = cart;
    this.currency = currency;
    this.storeOrigin = storeOrigin;
    this.startCheckout();
  }

  close() {
    this.shadow.innerHTML = '';
    // Hide the checkout overlay instead of destroying it (preserves state)
    if (this.lightDomOverlay) {
      this.lightDomOverlay.style.display = 'none';
    }
    document.body.style.overflow = '';
  }

  /** Fully destroy checkout state (called after order confirmation) */
  resetCheckout() {
    this.checkoutFlow = null;
    if (this.lightDomOverlay) {
      this.lightDomOverlay.remove();
      this.lightDomOverlay = null;
    }
  }

  private startCheckout() {
    if (!this.cart || !this.api) return;
    // Clear shadow DOM product view
    this.shadow.innerHTML = '';

    // If we have an existing checkout flow, just show it again
    if (this.checkoutFlow && this.lightDomOverlay) {
      this.lightDomOverlay.style.display = '';
      document.body.style.overflow = 'hidden';
      // Re-render to refresh cart state
      this.checkoutFlow.render();
      return;
    }

    // Create a light DOM overlay for checkout (Stripe Elements requires light DOM)
    if (this.lightDomOverlay) {
      this.lightDomOverlay.remove();
      this.lightDomOverlay = null;
    }
    const overlay = document.createElement('div');
    overlay.id = 'maho-checkout-overlay';
    document.body.appendChild(overlay);
    this.lightDomOverlay = overlay;
    document.body.style.overflow = 'hidden';
    const flow = new CheckoutFlow(
      overlay, this.api, this.cart, this.currency,
      this.storeOrigin, this.defaultCountry, this.countries,
      this.googleMapsKey, this.detectedCountry,
    );
    this.checkoutFlow = flow;
    flow.start();
  }

  private formatPrice(amount: number | null): string {
    if (amount == null) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: this.currency }).format(amount);
  }

  private render() {
    if (!this.product) return;
    const p = this.product;
    const { price, oldPrice } = getDisplayPrice(p, this.selected);
    const inStock = p.stockStatus !== 'out_of_stock';
    const imageUrl = p.imageUrl || p.smallImageUrl || '';
    const gallery = p.mediaGallery?.length ? p.mediaGallery.sort((a, b) => a.position - b.position) : [];
    const variant = resolveVariant(p, this.selected);
    const variantImage = variant?.imageUrl;
    const mainImage = variantImage || imageUrl;
    const hasOptions = p.configurableOptions?.length > 0;
    const allSelected = hasOptions ? p.configurableOptions.every(o => this.selected[o.code] != null) : true;
    const variantInStock = variant ? variant.inStock : inStock;
    const canAdd = inStock && allSelected && variantInStock;

    this.shadow.innerHTML = `
      <style>${lightboxStyles}</style>
      <div class="maho-overlay">
        <div class="maho-lightbox">
          <button class="maho-lb-close" type="button">&times;</button>

          ${mainImage ? `<img class="maho-lb-image" src="${this.esc(mainImage)}" alt="${this.esc(p.name)}" />` : ''}

          ${gallery.length > 1 ? `
            <div class="maho-lb-gallery">
              ${gallery.map((img, i) => `
                <img class="maho-lb-thumb ${(variantImage ? img.url === variantImage : i === 0) ? 'active' : ''}"
                  src="${this.esc(img.url)}" alt="${this.esc(img.label || '')}" data-url="${this.esc(img.url)}" />
              `).join('')}
            </div>
          ` : ''}

          <div class="maho-lb-body">
            <div class="maho-lb-name">${this.escapeHtml(p.name)}</div>
            <div class="maho-lb-price" data-price>
              ${this.formatPrice(price)}
              ${oldPrice ? `<span class="maho-lb-price-old">${this.formatPrice(oldPrice)}</span>` : ''}
            </div>

            ${p.shortDescription ? `<div class="maho-lb-desc">${p.shortDescription}</div>` : ''}

            ${hasOptions ? `
              <div class="maho-lb-options">
                ${p.configurableOptions.map(opt => {
                  const available = getAvailableValues(p, opt.code, this.selected);
                  return `
                    <div>
                      <div class="maho-lb-option-label">${this.escapeHtml(opt.label)}</div>
                      <div class="maho-lb-option-values">
                        ${opt.values.map(v => {
                          const isSelected = this.selected[opt.code] === v.id;
                          const isAvailable = available.has(v.id);
                          return `<button type="button"
                            class="maho-lb-swatch ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}"
                            data-option="${this.esc(opt.code)}" data-value="${v.id}"
                            ${!isAvailable ? 'disabled' : ''}>
                            ${this.escapeHtml(v.label)}
                          </button>`;
                        }).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}

            <div class="maho-lb-qty">
              <label>Qty</label>
              <input type="number" value="1" min="1" max="99" data-qty />
            </div>
          </div>

          <div class="maho-lb-actions">
            <button class="maho-lb-add" type="button" ${!canAdd ? 'disabled' : ''} data-add>
              ${inStock ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <div class="maho-lb-error" data-error></div>
            <div class="maho-lb-success" data-success></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    // Close
    this.shadow.querySelector('.maho-lb-close')?.addEventListener('click', () => this.close());
    this.shadow.querySelector('.maho-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('maho-overlay')) this.close();
    });

    // Escape key
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Gallery thumbnails
    this.shadow.querySelectorAll('.maho-lb-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const url = (thumb as HTMLElement).dataset.url;
        if (!url) return;
        const mainImg = this.shadow.querySelector('.maho-lb-image') as HTMLImageElement;
        if (mainImg) mainImg.src = url;
        this.shadow.querySelectorAll('.maho-lb-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });

    // Option swatches
    this.shadow.querySelectorAll('.maho-lb-swatch:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = (btn as HTMLElement).dataset.option!;
        const valueId = parseInt((btn as HTMLElement).dataset.value!, 10);
        if (this.selected[code] === valueId) {
          delete this.selected[code];
        } else {
          this.selected[code] = valueId;
        }
        this.render();
      });
    });

    // Add to cart → then transition to checkout flow
    this.shadow.querySelector('[data-add]')?.addEventListener('click', async () => {
      if (!this.product || !this.cart) return;
      const addBtn = this.shadow.querySelector('[data-add]') as HTMLButtonElement;
      const errorEl = this.shadow.querySelector('[data-error]') as HTMLElement;
      const successEl = this.shadow.querySelector('[data-success]') as HTMLElement;
      const qtyInput = this.shadow.querySelector('[data-qty]') as HTMLInputElement;
      const qty = parseInt(qtyInput?.value || '1', 10);

      addBtn.disabled = true;
      addBtn.textContent = 'Adding...';
      errorEl.classList.remove('visible');
      successEl.classList.remove('visible');

      try {
        const options = this.product.configurableOptions?.length
          ? Object.fromEntries(
              Object.entries(this.selected).map(([code, valId]) => {
                const opt = this.product!.configurableOptions.find(o => o.code === code);
                return [opt?.id ?? code, valId];
              })
            )
          : undefined;

        await this.cart.addItem(this.product.sku, qty, options);

        // Transition to checkout flow
        this.startCheckout();
      } catch (err: any) {
        errorEl.textContent = err.message || 'Failed to add to cart';
        errorEl.classList.add('visible');
        addBtn.textContent = 'Add to Cart';
        addBtn.disabled = false;
      }
    });
  }

  private escapeHtml(text: string): string {
    const el = document.createElement('span');
    el.textContent = text;
    return el.innerHTML;
  }

  private esc(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
