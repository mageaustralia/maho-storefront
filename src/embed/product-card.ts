/**
 * Maho Storefront — Embeddable Widget
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { EmbedProduct } from './api';
import { cardStyles } from './styles';

export class MahoProductCard extends HTMLElement {
  private product: EmbedProduct | null = null;
  private currency = 'USD';
  private _onClick: ((product: EmbedProduct) => void) | null = null;

  static get observedAttributes() {
    return ['currency'];
  }

  setProduct(product: EmbedProduct) {
    this.product = product;
    this.render();
  }

  setCurrency(currency: string) {
    this.currency = currency;
  }

  setClickHandler(handler: (product: EmbedProduct) => void) {
    this._onClick = handler;
  }

  private formatPrice(amount: number | null): string {
    if (amount == null) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: this.currency }).format(amount);
  }

  private render() {
    if (!this.product) return;
    const p = this.product;

    const shadow = this.shadowRoot || this.attachShadow({ mode: 'open' });
    const finalPrice = p.finalPrice ?? p.price;
    const hasDiscount = p.price && p.finalPrice && p.price > p.finalPrice;
    const inStock = p.stockStatus !== 'out_of_stock';
    const imageUrl = p.smallImageUrl || p.imageUrl || p.thumbnailUrl || '';

    shadow.innerHTML = `
      <style>${cardStyles}</style>
      <div class="maho-card">
        ${imageUrl ? `<img class="maho-card-image" src="${this.escapeAttr(imageUrl)}" alt="${this.escapeAttr(p.name)}" loading="lazy" />` : ''}
        <div class="maho-card-body">
          <div class="maho-card-name">${this.escapeHtml(p.name)}</div>
          <div class="maho-card-price">
            ${this.formatPrice(finalPrice)}
            ${hasDiscount ? `<span class="maho-card-price-old">${this.formatPrice(p.price)}</span>` : ''}
          </div>
          ${inStock
            ? `<button class="maho-card-btn" type="button">${p.configurableOptions?.length || p.hasRequiredOptions ? 'Select Options' : 'Add to Cart'}</button>`
            : `<div class="maho-card-out">Out of Stock</div>`
          }
        </div>
      </div>
    `;

    const card = shadow.querySelector('.maho-card') as HTMLElement;
    if (card) {
      card.addEventListener('click', () => {
        if (this._onClick && this.product) this._onClick(this.product);
      });
    }
  }

  private escapeHtml(text: string): string {
    const el = document.createElement('span');
    el.textContent = text;
    return el.innerHTML;
  }

  private escapeAttr(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
