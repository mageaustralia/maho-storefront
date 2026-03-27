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
  static values = {
    backend: { type: String, default: 'default' },       // 'default' | 'lucene' | 'meilisearch'
    meilisearchHost: { type: String, default: '' },       // e.g. 'https://ms.example.com'
    meilisearchApiKey: { type: String, default: '' },     // public search API key
    meilisearchIndexPrefix: { type: String, default: '' }, // e.g. 'dev_picklewarehouse'
    currency: { type: String, default: 'AUD' },
  };

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
      // Delayed focus for mobile browsers that need the overlay to be visible first
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

  async performSearch(query) {
    try {
      const data = await this._fetchResults(query);
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
              ${blogAndCms.map(p => `<a href="${escapeHtml(p.url)}" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200 text-sm" data-turbo-prefetch="true">
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
              ${products.map(p => `<a href="/${escapeHtml(p.urlKey)}" class="group text-center" data-turbo-prefetch="true">
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
    } catch {
      if (this.hasResultsTarget) this.resultsTarget.style.display = 'none';
      if (this.hasEmptyTarget) this.emptyTarget.style.display = '';
    }
  }

  // --- Search backend strategies ---

  async _fetchResults(query) {
    switch (this.backendValue) {
      case 'meilisearch':
        return this._fetchMeilisearch(query);
      case 'lucene':
        return this._fetchLucene(query);
      default:
        return this._fetchDefault(query);
    }
  }

  /** Default: calls the Worker-side /api/search/suggest proxy */
  async _fetchDefault(query) {
    return api.get(`/api/search/suggest?q=${encodeURIComponent(query)}`);
  }

  /** Lucene: calls the Maho API /api/search/suggest endpoint directly (single request) */
  async _fetchLucene(query) {
    const data = await api.get(`/api/search/suggest?q=${encodeURIComponent(query)}`);
    // Lucene response is already in the expected format
    return {
      products: (data.products || []).map(p => ({
        ...p,
        urlKey: p.urlKey || '',
        thumbnailUrl: p.thumbnailUrl || null,
        finalPrice: p.finalPrice ?? p.price,
      })),
      totalItems: data.totalItems || 0,
      categories: (data.categories || []).map(c => ({
        name: c.name,
        urlKey: c.urlKey || '',
      })),
      blogPosts: data.blogPosts || [],
      cmsPages: (data.cmsPages || []).map(p => ({
        title: p.title,
        identifier: p.identifier,
      })),
    };
  }

  /** Meilisearch: calls Meilisearch HTTP API directly (3 parallel index queries) */
  async _fetchMeilisearch(query) {
    const host = this.meilisearchHostValue;
    const apiKey = this.meilisearchApiKeyValue;
    const prefix = this.meilisearchIndexPrefixValue;
    const currency = this.currencyValue;

    if (!host || !prefix) {
      return this._fetchDefault(query);
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const searchBody = JSON.stringify({
      q: query,
      limit: 10,
      attributesToHighlight: ['name'],
      attributesToCrop: ['description'],
      cropLength: 80,
    });

    const [productsRes, categoriesRes, pagesRes] = await Promise.all([
      fetch(`${host}/indexes/${prefix}_products/search`, { method: 'POST', headers, body: searchBody }).then(r => r.json()).catch(() => ({ hits: [] })),
      fetch(`${host}/indexes/${prefix}_categories/search`, { method: 'POST', headers, body: JSON.stringify({ q: query, limit: 5 }) }).then(r => r.json()).catch(() => ({ hits: [] })),
      fetch(`${host}/indexes/${prefix}_pages/search`, { method: 'POST', headers, body: JSON.stringify({ q: query, limit: 5 }) }).then(r => r.json()).catch(() => ({ hits: [] })),
    ]);

    // Normalize Meilisearch response to common format
    const products = (productsRes.hits || []).map(hit => {
      const priceData = hit.price?.[currency] || hit.price?.[Object.keys(hit.price || {})[0]] || {};
      return {
        id: hit.objectID || hit.id,
        sku: hit.sku || '',
        name: hit._formatted?.name || hit.name || '',
        urlKey: (hit.url || '').replace(/^https?:\/\/[^/]+\//, '').replace(/\.html$/, ''),
        price: priceData.default || hit.sort_price || 0,
        finalPrice: priceData.default || hit.sort_price || 0,
        thumbnailUrl: hit.image_url || hit.thumbnail_url || hit.small_image_url || null,
      };
    });

    const categories = (categoriesRes.hits || []).map(hit => ({
      name: hit._formatted?.name || hit.name || '',
      urlKey: (hit.url || '').replace(/^https?:\/\/[^/]+\//, '').replace(/\.html$/, ''),
    }));

    const cmsPages = (pagesRes.hits || []).map(hit => ({
      title: hit._formatted?.name || hit.name || hit.title || '',
      identifier: hit.slug || hit.identifier || (hit.url || '').replace(/^https?:\/\/[^/]+\//, ''),
    }));

    return {
      products,
      totalItems: productsRes.estimatedTotalHits || productsRes.totalHits || products.length,
      categories,
      blogPosts: [],
      cmsPages,
    };
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