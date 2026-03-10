/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';
import { hydrateTemplate } from '../template-helpers.js';
import { analytics } from '../analytics.js';

export default class SearchController extends Controller {
  static targets = ['input', 'results', 'empty', 'productResults', 'categoryResults', 'pageResults'];

  connect() {
    this._debounceTimer = null;
    this._open = false;
    this._boundOpen = () => this.open();
    document.addEventListener('search:open', this._boundOpen);
  }

  disconnect() {
    document.removeEventListener('search:open', this._boundOpen);
  }

  open() {
    this._open = true;
    this.element.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (this.hasInputTarget) {
      this.inputTarget.focus();
      if (this.inputTarget.value.length >= 2) this.performSearch(this.inputTarget.value);
    }
  }

  close() {
    this._open = false;
    this.element.classList.remove('open');
    document.body.style.overflow = '';
  }

  onInput() {
    const query = this.inputTarget.value.trim();
    clearTimeout(this._debounceTimer);
    if (query.length < 2) {
      if (this.hasResultsTarget) this.resultsTarget.style.display = 'none';
      if (this.hasEmptyTarget) this.emptyTarget.style.display = 'none';
      return;
    }
    this._debounceTimer = setTimeout(() => this.performSearch(query), 300);
  }

  async performSearch(query) {
    try {
      const [productsRes] = await Promise.all([
        api.get(`/api/products?search=${encodeURIComponent(query)}&itemsPerPage=8`),
      ]);

      const products = productsRes.member || [];
      let hasResults = false;

      // Render product results
      if (this.hasProductResultsTarget) {
        if (products.length > 0) {
          hasResults = true;
          this.productResultsTarget.innerHTML = '';

          const heading = document.createElement('h4');
          heading.className = 'text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-2';
          heading.textContent = 'Products';
          this.productResultsTarget.appendChild(heading);

          const grid = document.createElement('div');
          grid.className = 'flex flex-col gap-1';
          products.forEach(p => {
            const el = hydrateTemplate('tpl-search-result', {
              link: `/${p.urlKey}`,
              image: p.thumbnailUrl,
              name: p.name,
              price: formatPrice(p.finalPrice ?? p.price),
            });
            if (p.thumbnailUrl) {
              const img = el.querySelector('[data-slot="image"]');
              if (img) img.alt = p.name;
            }
            grid.appendChild(el);
          });
          this.productResultsTarget.appendChild(grid);

          const viewAll = document.createElement('a');
          viewAll.href = `/search?q=${encodeURIComponent(query)}`;
          viewAll.className = 'block text-center text-sm font-medium text-primary mt-3 hover:underline';
          viewAll.textContent = 'View all results';
          this.productResultsTarget.appendChild(viewAll);
        } else {
          this.productResultsTarget.innerHTML = '';
        }
      }

      if (hasResults) {
        if (this.hasResultsTarget) this.resultsTarget.style.display = '';
        if (this.hasEmptyTarget) this.emptyTarget.style.display = 'none';
      } else {
        if (this.hasResultsTarget) this.resultsTarget.style.display = 'none';
        if (this.hasEmptyTarget) this.emptyTarget.style.display = '';
      }
    } catch {
      if (this.hasResultsTarget) this.resultsTarget.style.display = 'none';
      if (this.hasEmptyTarget) this.emptyTarget.style.display = '';
    }
  }

  submitSearch() {
    const query = this.hasInputTarget ? this.inputTarget.value.trim() : '';
    if (query.length >= 2) {
      analytics.search(query);
      this.close();
      window.Turbo?.visit(`/search?q=${encodeURIComponent(query)}`);
    }
  }
}