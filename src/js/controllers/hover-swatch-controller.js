/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { ensureCart } from '../utils.js';

/**
 * Hover Swatch Controller
 *
 * On mouseenter for configurable products (without custom options),
 * fetches product options from API and renders size/color swatches
 * as a slide-up overlay on the card.
 */

// Module-level cache — persists across Turbo navigations, capped at 200 entries
const _optionsCache = new Map();
const CACHE_MAX = 200;

export default class HoverSwatchController extends Controller {
  static targets = ['overlay', 'swatches', 'actions'];
  static values = {
    productId: Number,
    productUrl: String,
  };

  connect() {
    this._loaded = false;
    this._aborted = false; // true if product has custom options — skip overlay
    this._selectedOptions = {};
    this._productData = null;
    this._showTimer = null;
    this._hovering = false;

    // Pre-check cache: if already known to be skippable, mark aborted immediately
    const id = this.productIdValue;
    if (id && _optionsCache.has(id) && _optionsCache.get(id) === 'skip') {
      this._aborted = true;
    }

    this.element.addEventListener('mouseenter', this._onEnter);
    this.element.addEventListener('mouseleave', this._onLeave);
  }

  disconnect() {
    clearTimeout(this._showTimer);
    this.element.removeEventListener('mouseenter', this._onEnter);
    this.element.removeEventListener('mouseleave', this._onLeave);
  }

  _onEnter = () => {
    if (!this.hasOverlayTarget || this._aborted) return;
    this._hovering = true;
    // Debounce: wait 150ms before showing overlay to prevent jitter
    clearTimeout(this._showTimer);
    this._showTimer = setTimeout(() => {
      if (!this._hovering) return; // mouse already left
      this.overlayTarget.classList.remove('hidden');
      requestAnimationFrame(() => {
        this.overlayTarget.style.transform = 'translateY(0)';
        this.overlayTarget.style.opacity = '1';
      });
      if (!this._loaded) this._fetchOptions();
    }, 150);
  };

  _onLeave = () => {
    this._hovering = false;
    clearTimeout(this._showTimer);
    this._hideOverlay();
  };

  async _fetchOptions() {
    const id = this.productIdValue;
    if (!id) return;

    if (_optionsCache.has(id)) {
      const cached = _optionsCache.get(id);
      if (cached === 'skip') { this._aborted = true; this._hideOverlay(); return; }
      this._productData = cached;
      this._renderSwatches();
      this._loaded = true;
      return;
    }

    if (this.hasSwatchesTarget) {
      this.swatchesTarget.innerHTML = '<span class="loading loading-dots loading-xs"></span>';
    }

    try {
      const data = await api.get(`/api/products/${id}`);

      // Skip if product has custom options (dropdowns, text fields etc.)
      if (data?.customOptions?.length > 0) {
        _optionsCache.set(id, 'skip');
        this._aborted = true;
        this._hideOverlay();
        return;
      }

      if (!data?.configurableOptions?.length) {
        _optionsCache.set(id, 'skip');
        this._aborted = true;
        this._hideOverlay();
        return;
      }

      this._productData = data;
      if (_optionsCache.size >= CACHE_MAX) _optionsCache.clear();
      _optionsCache.set(id, data);
      this._renderSwatches();
      this._loaded = true;
    } catch (e) {
      console.warn('hover-swatch: fetch failed', e);
      if (this.hasSwatchesTarget) this.swatchesTarget.innerHTML = '';
    }
  }

  _hideOverlay() {
    if (!this.hasOverlayTarget) return;
    this.overlayTarget.style.transform = 'translateY(100%)';
    this.overlayTarget.style.opacity = '0';
    setTimeout(() => {
      if (!this._hovering && this.overlayTarget.style.opacity === '0') {
        this.overlayTarget.classList.add('hidden');
      }
    }, 250);
  }

  _renderSwatches() {
    if (!this.hasSwatchesTarget || !this._productData) return;
    const { configurableOptions, variants } = this._productData;
    if (!configurableOptions?.length) return;

    this.swatchesTarget.innerHTML = '';
    this._selectedOptions = {};

    configurableOptions.forEach(option => {
      const row = document.createElement('div');
      row.className = 'flex flex-wrap gap-1 items-center';

      const label = document.createElement('span');
      label.className = 'text-xs font-medium text-base-content/60 w-full mb-0.5';
      label.textContent = option.label;
      row.appendChild(label);

      const isColor = option.code === 'color';
      // Filter to only in-stock values
      const inStockValues = option.values.filter(val =>
        variants?.some(v => v.attributes?.[option.code] === val.id && v.inStock)
      );
      const oosValues = option.values.filter(val =>
        !variants?.some(v => v.attributes?.[option.code] === val.id && v.inStock)
      );

      // Render in-stock values first, then OOS
      [...inStockValues, ...oosValues].forEach(val => {
        const hasStock = inStockValues.includes(val);
        const btn = document.createElement('button');
        btn.type = 'button';

        if (isColor) {
          btn.className = 'w-6 h-6 rounded-full border border-base-300 hover:border-primary transition-all hover:scale-110 shadow-sm';
          const colorMap = {
            'black': '#000', 'white': '#fff', 'red': '#ef4444', 'blue': '#3b82f6',
            'green': '#22c55e', 'yellow': '#eab308', 'orange': '#f97316', 'purple': '#a855f7',
            'pink': '#ec4899', 'gray': '#6b7280', 'grey': '#6b7280', 'brown': '#92400e',
            'navy': '#1e3a5f', 'beige': '#f5f5dc', 'cream': '#fffdd0', 'charcoal': '#36454f',
            'khaki': '#c3b091', 'olive': '#808000', 'teal': '#008080', 'coral': '#ff7f50',
            'ivory': '#fffff0', 'peach': '#ffcba4', 'mauve': '#e0b0ff', 'burgundy': '#800020',
            'tan': '#d2b48c', 'indigo': '#4b0082', 'gold': '#ffd700', 'silver': '#c0c0c0',
            'nude': '#f0d5be', 'mint': '#98ff98', 'lavender': '#e6e6fa', 'sage': '#bcb88a',
            'rust': '#b7410e', 'taupe': '#483c32', 'plum': '#8e4585', 'forest': '#228b22',
          };
          const lowerLabel = val.label.toLowerCase();
          const color = colorMap[lowerLabel] || Object.entries(colorMap).find(([k]) => lowerLabel.includes(k))?.[1] || '#94a3b8';
          btn.style.backgroundColor = color;
          btn.title = val.label;
        } else {
          btn.className = 'btn btn-xs btn-outline min-w-[2rem] h-6 px-1.5 font-normal';
          btn.textContent = val.label;
        }

        if (!hasStock) {
          btn.classList.add('opacity-25');
          btn.style.pointerEvents = 'none';
          if (isColor) {
            // Diagonal strike-through for OOS colors
            const bg = btn.style.backgroundColor;
            btn.style.background = `linear-gradient(135deg, ${bg} 40%, #ef4444 40%, #ef4444 60%, ${bg} 60%)`;
          }
        }

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._selectOption(option.code, val.id, btn, row);
        });

        row.appendChild(btn);
      });

      this.swatchesTarget.appendChild(row);

      // Auto-select if only one in-stock value
      if (inStockValues.length === 1) {
        const autoBtn = row.querySelectorAll('button')[0]; // first button after label
        this._selectOption(option.code, inStockValues[0].id, autoBtn, row);
      }
    });

    this._renderActions();
  }

  _selectOption(code, valueId, btn, row) {
    if (this._selectedOptions[code] === valueId) {
      delete this._selectedOptions[code];
    } else {
      this._selectedOptions[code] = valueId;
    }

    const isColor = code === 'color';
    row.querySelectorAll('button').forEach(b => {
      if (isColor) {
        b.classList.remove('ring-2', 'ring-primary', 'ring-offset-1');
      } else {
        b.classList.remove('btn-primary');
        if (!b.classList.contains('opacity-25')) b.classList.add('btn-outline');
      }
    });

    if (this._selectedOptions[code] === valueId) {
      if (isColor) {
        btn.classList.add('ring-2', 'ring-primary', 'ring-offset-1');
      } else {
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
      }
    }

    this._renderActions();
  }

  _renderActions() {
    if (!this.hasActionsTarget) return;
    const { configurableOptions, variants } = this._productData;
    const allSelected = configurableOptions.every(o => this._selectedOptions[o.code] !== undefined);

    this.actionsTarget.innerHTML = '';

    if (allSelected) {
      const variant = variants?.find(v =>
        configurableOptions.every(o => v.attributes?.[o.code] === this._selectedOptions[o.code])
      );

      if (variant && variant.inStock) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-primary btn-xs w-full';
        btn.textContent = 'Add to Cart';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._addToCart(variant.sku, btn);
        });
        this.actionsTarget.appendChild(btn);
      } else if (variant && !variant.inStock) {
        const span = document.createElement('span');
        span.className = 'text-xs text-error text-center block';
        span.textContent = 'Out of Stock';
        this.actionsTarget.appendChild(span);
      }
    } else {
      const remaining = configurableOptions.filter(o => this._selectedOptions[o.code] === undefined);
      const hint = document.createElement('span');
      hint.className = 'text-xs text-base-content/40 text-center block';
      hint.textContent = `Select ${remaining.map(o => o.label.toLowerCase()).join(' & ')}`;
      this.actionsTarget.appendChild(hint);
    }
  }

  async _addToCart(sku, btn) {
    const maskedId = await ensureCart();
    if (!maskedId) return;

    const origText = btn.textContent;
    btn.textContent = '…';
    btn.classList.add('btn-disabled');

    try {
      const r = await api.post(`/api/guest-carts/${maskedId}/items`, {
        sku, qty: 1
      });
      if (r.ok) {
        btn.textContent = '✓ Added';
        btn.classList.remove('btn-disabled');
        btn.classList.add('btn-success');
        document.dispatchEvent(new CustomEvent('cart:updated'));
        document.dispatchEvent(new CustomEvent('cart:open'));
        setTimeout(() => {
          btn.textContent = origText;
          btn.classList.remove('btn-success');
        }, 2000);
      } else {
        throw new Error('failed');
      }
    } catch {
      btn.textContent = 'Error';
      btn.classList.remove('btn-disabled');
      setTimeout(() => { btn.textContent = origText; }, 2000);
    }
  }
}