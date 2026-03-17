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
      const data = await api.get(`/api/search/suggest?q=${encodeURIComponent(query)}`);
      let hasResults = false;

      // Render category results
      if (this.hasCategoryResultsTarget) {
        if (data.categories?.length) {
          hasResults = true;
          this.categoryResultsTarget.innerHTML = `
            <h4 class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">Categories</h4>
            <div class="flex flex-col gap-0.5">
              ${data.categories.map(c => `<a href="/${escapeHtml(c.urlKey)}" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200 text-sm" data-turbo-prefetch="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-base-content/40"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
                ${escapeHtml(c.name)}
              </a>`).join('')}
            </div>`;
        } else {
          this.categoryResultsTarget.innerHTML = '';
        }
      }

      // Render blog results
      if (this.hasPageResultsTarget) {
        const blogAndCms = [
          ...(data.blogPosts || []).map(p => ({ title: p.title, url: `/blog/${p.urlKey}`, type: 'blog' })),
          ...(data.cmsPages || []).map(p => ({ title: p.title, url: `/page/${p.identifier}`, type: 'page' })),
        ];
        if (blogAndCms.length) {
          hasResults = true;
          this.pageResultsTarget.innerHTML = `
            <h4 class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">Pages</h4>
            <div class="flex flex-col gap-0.5">
              ${blogAndCms.map(p => `<a href="${escapeHtml(p.url)}" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200 text-sm" data-turbo-prefetch="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-base-content/40"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 6h6M5 9h4"/></svg>
                ${escapeHtml(p.title)}
              </a>`).join('')}
            </div>`;
        } else {
          this.pageResultsTarget.innerHTML = '';
        }
      }

      // Render product results
      const products = data.products || [];
      if (this.hasProductResultsTarget) {
        if (products.length > 0) {
          hasResults = true;
          this.productResultsTarget.innerHTML = '';

          const heading = document.createElement('h4');
          heading.className = 'text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2';
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