/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { escapeHtml, formatPrice } from '../utils.js';
import { analytics } from '../analytics.js';

/**
 * Meilisearch search controller — queries Meilisearch indexes directly from the browser.
 *
 * Sends parallel requests to separate indexes (products, categories, pages)
 * for fastest possible search-as-you-type experience.
 *
 * Configure via data attributes on the controller element:
 *   data-search-meilisearch-host-value="https://ms.example.com"
 *   data-search-meilisearch-api-key-value="public-search-key"
 *   data-search-meilisearch-index-prefix-value="store_code"
 *   data-search-meilisearch-currency-value="AUD"
 */
export default class SearchMeilisearchController extends Controller {
  static targets = ['input', 'results', 'empty', 'productResults', 'categoryResults', 'pageResults'];
  static values = {
    host: String,             // Meilisearch host URL
    apiKey: { type: String, default: '' },  // Public search API key
    indexPrefix: String,      // Index name prefix (e.g. 'dev_picklewarehouse')
    currency: { type: String, default: 'AUD' },
    trackUrl: { type: String, default: '' },  // Maho backend base URL for click tracking
  };

  connect() {
    this._debounceTimer = null;
    this._open = false;
    this._currentQuery = '';
    this._boundOpen = () => this.open();
    this._boundTrackClick = (e) => this._onResultClick(e);
    document.addEventListener('search:open', this._boundOpen);
    this.element.addEventListener('click', this._boundTrackClick);
  }

  disconnect() {
    document.removeEventListener('search:open', this._boundOpen);
    this.element.removeEventListener('click', this._boundTrackClick);
  }

  open() {
    this._open = true;
    this.element.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (this.hasInputTarget) {
      this.inputTarget.focus();
      setTimeout(() => this.inputTarget.focus(), 50);
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

  _onResultClick(e) {
    const link = e.target.closest('a[data-track-type]');
    if (!link) return;
    const trackUrl = this.trackUrlValue;
    if (!trackUrl) return;
    const payload = JSON.stringify({
      query: link.dataset.trackQuery || '',
      type: link.dataset.trackType || '',
      object_id: link.dataset.trackId || '',
      object_name: link.dataset.trackName || '',
      position: parseInt(link.dataset.trackPosition || '0', 10),
    });
    navigator.sendBeacon(`${trackUrl}/msearchtrack/ajax/trackclick`, new Blob([payload], { type: 'application/json' }));
  }

  async performSearch(query) {
    this._currentQuery = query;
    const host = this.hostValue;
    const prefix = this.indexPrefixValue;

    if (!host || !prefix) {
      console.warn('Meilisearch search controller: missing host or indexPrefix');
      return;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKeyValue) headers['Authorization'] = `Bearer ${this.apiKeyValue}`;

    try {
      const [productsRes, categoriesRes, pagesRes] = await Promise.all([
        this._searchIndex(host, headers, `${prefix}_products`, query, {
          limit: 10,
        }),
        this._searchIndex(host, headers, `${prefix}_categories`, query, {
          limit: 5,
        }),
        this._searchIndex(host, headers, `${prefix}_pages`, query, {
          limit: 5,
        }),
      ]);

      const data = {
        products: this._normalizeProducts(productsRes.hits || []),
        totalItems: productsRes.estimatedTotalHits || productsRes.totalHits || (productsRes.hits || []).length,
        categories: this._normalizeCategories(categoriesRes.hits || []),
        blogPosts: [],
        cmsPages: this._normalizePages(pagesRes.hits || []),
      };

      this._renderResults(query, data);
    } catch {
      if (this.hasResultsTarget) this.resultsTarget.style.display = 'none';
      if (this.hasEmptyTarget) this.emptyTarget.style.display = '';
    }
  }

  async _searchIndex(host, headers, index, query, params = {}) {
    try {
      const res = await fetch(`${host}/indexes/${index}/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ q: query, ...params }),
      });
      return await res.json();
    } catch {
      return { hits: [] };
    }
  }

  _normalizeProducts(hits) {
    const currency = this.currencyValue;
    return hits.map(hit => {
      const priceData = hit.price?.[currency] || hit.price?.[Object.keys(hit.price || {})[0]] || {};
      return {
        id: hit.objectID || hit.id,
        sku: hit.sku || '',
        name: hit.name || '',
        urlKey: this._extractUrlKey(hit.url || ''),
        price: priceData.default || hit.sort_price || 0,
        finalPrice: priceData.default || hit.sort_price || 0,
        thumbnailUrl: hit.image_url || hit.thumbnail_url || hit.small_image_url || null,
      };
    });
  }

  _normalizeCategories(hits) {
    return hits.map(hit => ({
      name: hit.name || '',
      urlKey: this._extractUrlKey(hit.url || ''),
    }));
  }

  _normalizePages(hits) {
    return hits.map(hit => ({
      title: hit.name || hit.title || '',
      identifier: hit.slug || hit.identifier || this._extractUrlKey(hit.url || ''),
    }));
  }

  /**
   * Extract a clean URL key from various Maho URL formats:
   *   https://host/product-slug.html → product-slug
   *   https://host/catalog/product/view/id/123/s/product-slug/ → product-slug
   *   https://host/catalog/category/view/id/45/s/cat-slug/ → cat-slug
   */
  _extractUrlKey(url) {
    // Strip domain
    let path = url.replace(/^https?:\/\/[^/]+\//, '');
    // Handle catalog/product/view/id/X/s/slug/ format (missing URL rewrite)
    const catalogMatch = path.match(/catalog\/(?:product|category)\/view\/id\/\d+\/s\/([^/]+)/);
    if (catalogMatch) return catalogMatch[1];
    // Normal SEO URL — strip .html
    return path.replace(/\.html$/, '').replace(/\/$/, '');
  }

  _renderResults(query, data) {
    let hasResults = false;

    // Render category results
    if (this.hasCategoryResultsTarget) {
      if (data.categories?.length) {
        hasResults = true;
        this.categoryResultsTarget.innerHTML = `
          <h4 class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">Categories</h4>
          <div class="flex flex-col gap-0.5">
            ${data.categories.map((c, i) => `<a href="/${escapeHtml(c.urlKey)}" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200 text-sm" data-turbo-prefetch="true" data-track-type="category" data-track-query="${escapeHtml(query)}" data-track-id="${escapeHtml(c.urlKey)}" data-track-name="${escapeHtml(c.name)}" data-track-position="${i + 1}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-base-content/40"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
              ${escapeHtml(c.name)}
            </a>`).join('')}
          </div>`;
      } else {
        this.categoryResultsTarget.innerHTML = '';
      }
    }

    // Render blog/CMS results
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
            ${blogAndCms.map((p, i) => `<a href="${escapeHtml(p.url)}" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200 text-sm" data-turbo-prefetch="true" data-track-type="${escapeHtml(p.type)}" data-track-query="${escapeHtml(query)}" data-track-id="${escapeHtml(p.url)}" data-track-name="${escapeHtml(p.title)}" data-track-position="${i + 1}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-base-content/40"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 6h6M5 9h4"/></svg>
              ${escapeHtml(p.title)}
            </a>`).join('')}
          </div>`;
      } else {
        this.pageResultsTarget.innerHTML = '';
      }
    }

    // Render product results as grid
    const products = data.products || [];
    if (this.hasProductResultsTarget) {
      if (products.length > 0) {
        hasResults = true;
        const totalItems = data.totalItems || products.length;
        this.productResultsTarget.innerHTML = `
          <h4 class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3">Products</h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            ${products.map((p, i) => `<a href="/${escapeHtml(p.urlKey)}" class="group text-center" data-turbo-prefetch="true" data-track-type="product" data-track-query="${escapeHtml(query)}" data-track-id="${escapeHtml(String(p.id || p.sku))}" data-track-name="${escapeHtml(p.name)}" data-track-position="${i + 1}">
              <div class="aspect-square bg-base-200/50 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                ${p.thumbnailUrl
                  ? `<img src="${escapeHtml(p.thumbnailUrl)}" alt="${escapeHtml(p.name)}" class="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" loading="lazy" />`
                  : `<svg class="w-10 h-10 text-base-content/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15l5-5 4 4 4-6 5 7"/></svg>`
                }
              </div>
              <p class="text-xs leading-tight line-clamp-2 group-hover:text-primary transition-colors">${escapeHtml(p.name)}</p>
              <p class="text-sm font-semibold text-primary mt-0.5">${formatPrice(p.finalPrice ?? p.price)}</p>
            </a>`).join('')}
          </div>
          ${totalItems > products.length ? `<div class="text-center mt-4">
            <a href="/search?q=${encodeURIComponent(query)}" class="btn btn-sm btn-outline">See all products (${totalItems})</a>
          </div>` : ''}`;
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
