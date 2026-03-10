/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';
import { hydrateTemplate, setSlotHtml, setSlotAttributes, showSlot } from '../template-helpers.js';
import { analytics } from '../analytics.js';

export default class CategoryFilterController extends Controller {
  static targets = ['grid', 'sort', 'perPage', 'count',
    'topPagination', 'topPageInfo', 'bottomPagination', 'bottomPageInfo',
    'priceMin', 'priceMax', 'priceMinLabel', 'priceMaxLabel', 'priceClear', 'priceFilter', 'productsData',
    'filtersContainer', 'activeFilters', 'filterDrawer', 'filterDrawerBody', 'drawerClearBtn'];
  static values = { categoryId: Number, categoryUrl: { type: String, default: '' }, categoryName: { type: String, default: '' }, currency: { type: String, default: 'USD' }, totalItems: Number, currentPage: Number, totalPages: Number, swatchLabels: { type: Boolean, default: true } };

  connect() {
    this._products = [];
    this._loading = false;
    this._page = this.currentPageValue || 1;
    this._totalPages = this.totalPagesValue || 1;
    // Parse initial products data from embedded JSON
    if (this.hasProductsDataTarget) {
      try { this._products = JSON.parse(this.productsDataTarget.textContent); } catch {}
    }
    // Analytics: track product list view
    if (this._products.length > 0) {
      analytics.viewItemList(this._products, this.categoryNameValue || 'Category', this.currencyValue);
    }
    // Store category context for product breadcrumbs (sessionStorage keeps URLs clean)
    if (this.categoryUrlValue) {
      try { sessionStorage.setItem('maho_cat', JSON.stringify({ url: this.categoryUrlValue, name: this.categoryNameValue })); } catch {}
    }
    // Layered filter state
    this._activeFilters = {};

    // Restore sort from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const urlSort = urlParams.get("sort");
    if (urlSort && this.hasSortTarget) {
      this.sortTarget.value = urlSort;
    }
    this._filtersData = [];
    this._loadFilters();
  }

  onSortChange() {
    const sort = this.hasSortTarget ? this.sortTarget.value : '';
    if (!sort) return;
    this._page = 1;
    this._fetchProducts(sort);
    // Persist sort in URL
    const url = new URL(window.location);
    url.searchParams.set("sort", sort);
    url.searchParams.delete("page");
    history.replaceState(null, "", url.toString());
  }

  onPerPageChange() {
    const perPage = this.hasPerPageTarget ? parseInt(this.perPageTarget.value, 10) : 12;
    const sort = this.hasSortTarget ? this.sortTarget.value : '';
    this._page = 1;
    this._fetchProducts(sort, 1, perPage);
  }

  prevPage() {
    if (this._page <= 1) return;
    this._page--;
    const sort = this.hasSortTarget ? this.sortTarget.value : '';
    const perPage = this.hasPerPageTarget ? parseInt(this.perPageTarget.value, 10) : 12;
    this._fetchProducts(sort, this._page, perPage);
  }

  nextPage() {
    if (this._page >= this._totalPages) return;
    this._page++;
    const sort = this.hasSortTarget ? this.sortTarget.value : '';
    const perPage = this.hasPerPageTarget ? parseInt(this.perPageTarget.value, 10) : 12;
    this._fetchProducts(sort, this._page, perPage);
  }

  onPriceChange() {
    if (!this.hasPriceMinTarget || !this.hasPriceMaxTarget) return;
    let min = parseInt(this.priceMinTarget.value, 10);
    let max = parseInt(this.priceMaxTarget.value, 10);
    // Prevent crossing
    if (min > max) { const tmp = min; min = max; max = tmp; }
    if (this.hasPriceMinLabelTarget) this.priceMinLabelTarget.textContent = `$${min}`;
    if (this.hasPriceMaxLabelTarget) this.priceMaxLabelTarget.textContent = max >= 500 ? '$500+' : `$${max}`;
    if (this.hasPriceClearTarget) this.priceClearTarget.style.display = (min > 0 || max < 500) ? '' : 'none';
    // Debounce API call for price filter
    clearTimeout(this._priceDebounce);
    this._priceDebounce = setTimeout(() => this._applyPriceFilter(min, max), 400);
  }

  clearPriceFilter() {
    if (this.hasPriceMinTarget) this.priceMinTarget.value = 0;
    if (this.hasPriceMaxTarget) this.priceMaxTarget.value = 500;
    if (this.hasPriceMinLabelTarget) this.priceMinLabelTarget.textContent = '$0';
    if (this.hasPriceMaxLabelTarget) this.priceMaxLabelTarget.textContent = '$500+';
    if (this.hasPriceClearTarget) this.priceClearTarget.style.display = 'none';
    this._priceMin = null;
    this._priceMax = null;
    this._page = 1;
    const sort = this.hasSortTarget ? this.sortTarget.value : '';
    const perPage = this.hasPerPageTarget ? parseInt(this.perPageTarget.value, 10) : 12;
    this._fetchProducts(sort, 1, perPage);
  }

  _applyPriceFilter(min, max) {
    this._priceMin = min > 0 ? min : null;
    this._priceMax = max < 500 ? max : null;
    this._page = 1;
    const sort = this.hasSortTarget ? this.sortTarget.value : '';
    const perPage = this.hasPerPageTarget ? parseInt(this.perPageTarget.value, 10) : 12;
    this._fetchProducts(sort, 1, perPage);
  }

  // ---- Layered Navigation Filters ----

  async _loadFilters() {
    try {
      const data = await api.get(`/api/layered-filters?categoryId=${this.categoryIdValue}`);
      this._filtersData = data.member || data['hydra:member'] || [];
      this._renderFilters();
    } catch (e) {
      console.error('Failed to load filters:', e);
    }
  }

  _buildFilterGroups() {
    const fragment = document.createDocumentFragment();
    this._filtersData.filter(f => f.options && f.options.length > 1).forEach(filter => {
      const group = hydrateTemplate('tpl-filter-group', {
        label: filter.label,
      });
      group.dataset.filterCode = filter.code;

      const optionsList = group.querySelector('[data-slot="options"]');
      if (optionsList) {
        filter.options.forEach(opt => {
          const isActive = this._activeFilters[filter.code] === String(opt.value);
          const optEl = hydrateTemplate('tpl-filter-option', {
            label: opt.label,
          });
          setSlotAttributes(optEl, {
            'button': {
              'data-action': 'click->category-filter#toggleFilter',
              'data-filter-code': filter.code,
              'data-filter-value': String(opt.value),
              'data-filter-label': opt.label,
            },
          });
          // Insert visual swatch replacing the checkbox
          const hasSwatch = opt.swatch && opt.swatch.value;
          if (hasSwatch) {
            const check = optEl.querySelector('[data-slot="check"]');
            if (check) {
              const swatch = document.createElement('span');
              swatch.dataset.slot = 'swatch';
              const activeRing = isActive ? 'border-primary ring-2 ring-primary/30' : 'border-base-content/15';

              if (opt.swatch.type === 'text') {
                // Text swatch: small box with label text (e.g. "S", "M", "XL")
                swatch.textContent = opt.swatch.value;
                swatch.className = `inline-flex items-center justify-center min-w-6 h-6 px-1 shrink-0 rounded text-xs font-semibold border-2 transition-colors ${activeRing}`;
              } else if (opt.swatch.type === 'image') {
                swatch.innerHTML = `<img src="${escapeHtml(opt.swatch.value)}" alt="" class="w-full h-full object-cover rounded-full">`;
                swatch.className = `inline-block w-5 h-5 shrink-0 rounded-full border-2 overflow-hidden transition-colors ${activeRing}`;
              } else {
                // Color swatch: colored dot
                swatch.style.backgroundColor = opt.swatch.value;
                swatch.className = `inline-block w-5 h-5 shrink-0 rounded-full border-2 transition-colors ${activeRing}`;
              }
              check.replaceWith(swatch);

              // Hide text label if swatchLabels is off — keep swatch only with tooltip
              if (!this.swatchLabelsValue) {
                const label = optEl.querySelector('[data-slot="label"]');
                if (label) label.classList.add('sr-only');
                swatch.title = opt.label;
              }
            }
            const btn = optEl.querySelector('[data-slot="button"]');
            if (btn && isActive) btn.classList.add('font-semibold', 'text-base-content');
          } else if (isActive) {
            // Show checkmark if active (non-swatch options)
            const check = optEl.querySelector('[data-slot="check"]');
            if (check) {
              check.classList.remove('text-transparent', 'border-base-content/15');
              check.classList.add('bg-primary', 'border-primary', 'text-primary-content');
            }
            const btn = optEl.querySelector('[data-slot="button"]');
            if (btn) btn.classList.add('font-semibold', 'text-base-content');
          }
          // optEl is an <li> from the template — append directly
          optionsList.appendChild(optEl);
        });
      }
      fragment.appendChild(group);
    });
    return fragment;
  }

  // Collect which filter <details> are currently open, by filter code
  _getOpenFilters(container) {
    const open = new Set();
    if (!container) return open;
    container.querySelectorAll('details.filter-details[open]').forEach(d => {
      const code = d.dataset.filterCode || d.querySelector('[data-filter-code]')?.dataset.filterCode;
      if (code) open.add(code);
      // Price filter has no code — use sentinel
      const summary = d.querySelector('.filter-summary');
      if (summary && summary.textContent.trim() === 'Price') open.add('__price__');
    });
    return open;
  }

  // Restore open state on newly rendered <details> + open any with active filters
  _restoreOpenFilters(container, openSet) {
    if (!container) return;
    container.querySelectorAll('details.filter-details').forEach(d => {
      const code = d.dataset.filterCode || d.querySelector('[data-filter-code]')?.dataset.filterCode;
      const summary = d.querySelector('.filter-summary');
      const isPrice = summary && summary.textContent.trim() === 'Price';
      if (isPrice && openSet.has('__price__')) { d.open = true; return; }
      if (!code) return;
      // Open if it was open before, or if it has an active filter selection
      if (openSet.has(code) || this._activeFilters[code]) d.open = true;
    });
  }

  _renderFilters() {
    // Desktop sidebar
    if (this.hasFiltersContainerTarget) {
      const openFilters = this._getOpenFilters(this.filtersContainerTarget);
      this.filtersContainerTarget.innerHTML = '';
      if (this._filtersData.length) {
        this.filtersContainerTarget.appendChild(this._buildFilterGroups());
      }
      this._restoreOpenFilters(this.filtersContainerTarget, openFilters);
    }

    // Mobile drawer body — includes price filter clone + attribute filters
    if (this.hasFilterDrawerBodyTarget) {
      const activeCount = Object.keys(this._activeFilters).length;
      const hasPriceFilter = this._priceMin != null || this._priceMax != null;
      const openFilters = this._getOpenFilters(this.filterDrawerBodyTarget);

      this.filterDrawerBodyTarget.innerHTML = '';

      // Price filter section (still inline — not a reusable template)
      const priceSection = document.createElement('div');
      priceSection.className = 'filter-drawer-section';
      priceSection.innerHTML = `
        <details class="filter-details mb-4">
          <summary class="filter-summary">Price</summary>
          <div class="filter-details-content">
            <div class="price-range-labels">
              <span>${this._priceMin > 0 ? '$' + this._priceMin : '$0'}</span>
              <span>${this._priceMax != null && this._priceMax < 500 ? '$' + this._priceMax : '$500+'}</span>
            </div>
            <div class="price-range-slider">
              <label class="sr-only">Minimum price</label>
              <input type="range" min="0" max="500" value="${this._priceMin || 0}" step="10" class="range-min"
                data-action="input->category-filter#onDrawerPriceChange" data-bound="min" />
              <label class="sr-only">Maximum price</label>
              <input type="range" min="0" max="500" value="${this._priceMax || 500}" step="10" class="range-max"
                data-action="input->category-filter#onDrawerPriceChange" data-bound="max" />
            </div>
            ${hasPriceFilter ? '<button class="price-filter-clear" data-action="category-filter#clearPriceFilter">Clear price</button>' : ''}
          </div>
        </details>`;
      this.filterDrawerBodyTarget.appendChild(priceSection);

      // Attribute filters
      if (this._filtersData.length) {
        const attrSection = document.createElement('div');
        attrSection.className = 'filter-drawer-section';
        attrSection.appendChild(this._buildFilterGroups());
        this.filterDrawerBodyTarget.appendChild(attrSection);
      }

      this._restoreOpenFilters(this.filterDrawerBodyTarget, openFilters);

      // Show/hide "Clear All" in drawer header
      if (this.hasDrawerClearBtnTarget) {
        this.drawerClearBtnTarget.style.display = (activeCount + (hasPriceFilter ? 1 : 0)) > 0 ? '' : 'none';
      }

      // Update filter button badge
      const btn = this.element.querySelector('.toolbar-filter-btn');
      if (btn) {
        const total = activeCount + (hasPriceFilter ? 1 : 0);
        const badge = btn.querySelector('.filter-btn-badge');
        if (total > 0) {
          if (badge) { badge.textContent = total; }
          else { btn.insertAdjacentHTML('beforeend', ` <span class="filter-btn-badge">${total}</span>`); }
        } else if (badge) {
          badge.remove();
        }
      }
    }
  }

  openFilterDrawer() {
    if (!this.hasFilterDrawerTarget) return;
    this._renderFilters(); // Ensure drawer is up to date
    this.filterDrawerTarget.style.display = '';
    document.body.style.overflow = 'hidden';
  }

  closeFilterDrawer() {
    if (!this.hasFilterDrawerTarget) return;
    this.filterDrawerTarget.style.display = 'none';
    document.body.style.overflow = '';
  }

  onDrawerPriceChange(e) {
    const input = e.currentTarget;
    const bound = input.dataset.bound;
    const section = input.closest('.filter-drawer-section');
    const minInput = section.querySelector('.range-min');
    const maxInput = section.querySelector('.range-max');
    let min = parseInt(minInput.value, 10);
    let max = parseInt(maxInput.value, 10);
    if (min > max) { const tmp = min; min = max; max = tmp; }

    // Update labels in drawer
    const labels = section.querySelector('.price-range-labels');
    if (labels) {
      labels.children[0].textContent = `$${min}`;
      labels.children[1].textContent = max >= 500 ? '$500+' : `$${max}`;
    }

    // Sync to sidebar sliders
    if (this.hasPriceMinTarget) this.priceMinTarget.value = min;
    if (this.hasPriceMaxTarget) this.priceMaxTarget.value = max;
    if (this.hasPriceMinLabelTarget) this.priceMinLabelTarget.textContent = `$${min}`;
    if (this.hasPriceMaxLabelTarget) this.priceMaxLabelTarget.textContent = max >= 500 ? '$500+' : `$${max}`;
    if (this.hasPriceClearTarget) this.priceClearTarget.style.display = (min > 0 || max < 500) ? '' : 'none';

    // Debounce the actual filter
    clearTimeout(this._priceDebounce);
    this._priceDebounce = setTimeout(() => this._applyPriceFilter(min, max), 400);
  }

  toggleFilterGroup(e) {
    const group = e.currentTarget.closest('.filter-group');
    group.classList.toggle('collapsed');
  }

  toggleFilter(e) {
    const btn = e.currentTarget;
    const code = btn.dataset.filterCode;
    const value = btn.dataset.filterValue;

    if (this._activeFilters[code] === value) {
      delete this._activeFilters[code];
    } else {
      this._activeFilters[code] = value;
    }

    this._page = 1;
    this._renderFilters();
    this._renderActiveFilters();
    const sort = this.hasSortTarget ? this.sortTarget.value : '';
    const perPage = this.hasPerPageTarget ? parseInt(this.perPageTarget.value, 10) : 12;
    this._fetchProducts(sort, 1, perPage);
  }

  _renderActiveFilters() {
    if (!this.hasActiveFiltersTarget) return;
    const entries = Object.entries(this._activeFilters);
    if (entries.length === 0) {
      this.activeFiltersTarget.style.display = 'none';
      return;
    }
    this.activeFiltersTarget.style.display = '';

    this.activeFiltersTarget.innerHTML = '';
    entries.forEach(([code, value]) => {
      const filter = this._filtersData.find(f => f.code === code);
      const option = filter?.options.find(o => String(o.value) === value);
      const label = option ? `${filter.label}: ${option.label}` : `${code}: ${value}`;

      const el = hydrateTemplate('tpl-active-filter', { label });
      setSlotAttributes(el, {
        'chip': {
          'data-action': 'click->category-filter#removeFilter',
          'data-filter-code': code,
        },
      });
      this.activeFiltersTarget.appendChild(el);
    });
    if (entries.length > 1) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'badge badge-ghost badge-lg cursor-pointer hover:bg-base-200 transition-colors';
      clearBtn.textContent = 'Clear All';
      clearBtn.dataset.action = 'click->category-filter#clearAllFilters';
      this.activeFiltersTarget.appendChild(clearBtn);
    }
  }

  removeFilter(e) {
    delete this._activeFilters[e.currentTarget.dataset.filterCode];
    this._page = 1;
    this._renderFilters();
    this._renderActiveFilters();
    const sort = this.hasSortTarget ? this.sortTarget.value : '';
    const perPage = this.hasPerPageTarget ? parseInt(this.perPageTarget.value, 10) : 12;
    this._fetchProducts(sort, 1, perPage);
  }

  clearAllFilters() {
    this._activeFilters = {};
    // Also reset price filter
    this._priceMin = null;
    this._priceMax = null;
    if (this.hasPriceMinTarget) this.priceMinTarget.value = 0;
    if (this.hasPriceMaxTarget) this.priceMaxTarget.value = 500;
    if (this.hasPriceMinLabelTarget) this.priceMinLabelTarget.textContent = '$0';
    if (this.hasPriceMaxLabelTarget) this.priceMaxLabelTarget.textContent = '$500+';
    if (this.hasPriceClearTarget) this.priceClearTarget.style.display = 'none';
    this._page = 1;
    this._renderFilters();
    this._renderActiveFilters();
    const sort = this.hasSortTarget ? this.sortTarget.value : '';
    const perPage = this.hasPerPageTarget ? parseInt(this.perPageTarget.value, 10) : 12;
    this._fetchProducts(sort, 1, perPage);
  }

  async _fetchProducts(sort = '', page = 1, perPage = 12) {
    if (this._loading) return;
    this._loading = true;
    if (this.hasGridTarget) this.gridTarget.style.opacity = '0.5';

    try {
      let url = `${api.url()}/api/products?categoryId=${this.categoryIdValue}&page=${page}&pageSize=${perPage}`;
      if (sort) {
        const [field, dir] = sort.split('-');
        url += `&sortBy=${field}&sortDir=${dir}`;
      }
      if (this._priceMin != null) url += `&priceMin=${this._priceMin}`;
      if (this._priceMax != null) url += `&priceMax=${this._priceMax}`;
      for (const [code, value] of Object.entries(this._activeFilters || {})) {
        url += `&attr_${encodeURIComponent(code)}=${encodeURIComponent(value)}`;
      }
      // Add store code if set (multi-store support)
      const storeCode = window.MAHO_STORE_CODE;
      if (storeCode) url += `&store=${storeCode}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/ld+json' } });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const products = data.member || [];
      const totalItems = data.totalItems || 0;

      // Re-render product grid
      if (this.hasGridTarget) {
        this.gridTarget.innerHTML = '';
        products.forEach(p => {
          const hasDiscount = p.specialPrice != null && p.specialPrice < (p.price || 0);
          const displayPrice = p.finalPrice || p.price;
          const isOos = p.stockStatus === 'out_of_stock';
          const needsOpts = ['configurable','grouped','bundle','downloadable'].includes(p.type) || p.hasRequiredOptions;
          const pUrl = `/${p.urlKey}`;

          const el = hydrateTemplate('tpl-product-card', {
            link: pUrl,
            image: p.thumbnailUrl,
            name: p.name,
          });

          el.dataset.productId = p.id;
          el.dataset.productSku = p.sku;
          setSlotAttributes(el, { 'image': { alt: p.name || '' } });

          // Wire hover-swatch controller for configurable products
          if (p.type === 'configurable' && !isOos) {
            el.dataset.controller = 'hover-swatch';
            el.dataset.hoverSwatchProductIdValue = String(p.id);
            el.dataset.hoverSwatchProductUrlValue = pUrl;
          }

          // Badges
          if (hasDiscount) showSlot(el, 'badge-sale');
          if (isOos) showSlot(el, 'badge-oos');

          // Price
          const priceHtml = hasDiscount
            ? `<span class="line-through text-base-content/40 text-xs">${formatPrice(p.price, this.currencyValue)}</span> <span class="text-error font-semibold">${formatPrice(p.specialPrice, this.currencyValue)}</span>`
            : `<span class="font-semibold">${formatPrice(displayPrice, this.currencyValue)}</span>`;
          setSlotHtml(el, 'price', priceHtml);

          // Rating
          if (p.reviewCount > 0) {
            const ratingSlot = el.querySelector('[data-slot="rating"]');
            if (ratingSlot) {
              ratingSlot.classList.remove('hidden');
              ratingSlot.innerHTML = `<span class="text-warning" style="--rating: ${p.averageRating || 0}">★★★★★</span><span>(${p.reviewCount})</span>`;
            }
          }

          // Actions
          const actionsSlot = el.querySelector('[data-slot="actions"]');
          if (actionsSlot) {
            if (isOos) {
              const btn = document.createElement('button');
              btn.className = 'btn btn-sm btn-disabled w-full';
              btn.disabled = true;
              btn.textContent = 'Out of Stock';
              actionsSlot.appendChild(btn);
            } else if (needsOpts) {
              const a = document.createElement('a');
              a.href = pUrl;
              a.className = 'btn btn-sm btn-primary btn-outline w-full';
              a.dataset.turboPrefetch = 'true';
              a.textContent = 'Select Options';
              actionsSlot.appendChild(a);
            } else {
              const btn = document.createElement('button');
              btn.className = 'btn btn-sm btn-primary w-full';
              btn.textContent = 'Add to Cart';
              btn.dataset.sku = p.sku;
              btn.addEventListener('click', async function() {
                try {
                  const m = await ensureCart();
                  const r = await api.post(`/api/guest-carts/${m}/items`, { sku: p.sku, qty: 1 });
                  if (r.ok) {
                    document.dispatchEvent(new CustomEvent('cart:updated'));
                    document.dispatchEvent(new CustomEvent('cart:open'));
                    this.textContent = 'Added!';
                    setTimeout(() => this.textContent = 'Add to Cart', 2000);
                  } else {
                    this.textContent = 'Error';
                    setTimeout(() => this.textContent = 'Add to Cart', 2000);
                  }
                } catch {
                  this.textContent = 'Error';
                  setTimeout(() => this.textContent = 'Add to Cart', 2000);
                }
              });
              actionsSlot.appendChild(btn);
            }
          }

          this.gridTarget.appendChild(el);
        });
      }

      // Update pagination state
      this._totalPages = Math.ceil(totalItems / perPage);
      this._page = page;
      this._updatePagination();

      // Scroll to top of product grid
      if (this.hasGridTarget) {
        this.gridTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {
      console.error('Category filter error:', e);
    } finally {
      this._loading = false;
      if (this.hasGridTarget) this.gridTarget.style.opacity = '';
    }
  }

  _updatePagination() {
    const page = this._page;
    const total = this._totalPages;
    const show = total > 1;

    // Top pagination (hidden on mobile via CSS)
    if (this.hasTopPaginationTarget) {
      this.topPaginationTarget.style.display = show ? '' : 'none';
      if (show) {
        const buttons = this.topPaginationTarget.querySelectorAll('button.btn');
        if (buttons[0]) buttons[0].disabled = page <= 1;
        if (buttons[1]) buttons[1].disabled = page >= total;
      }
    }
    if (this.hasTopPageInfoTarget) this.topPageInfoTarget.textContent = `${page}/${total}`;

    // Bottom pagination
    if (this.hasBottomPaginationTarget) {
      this.bottomPaginationTarget.style.display = show ? '' : 'none';
      if (show) {
        const buttons = this.bottomPaginationTarget.querySelectorAll('button.btn');
        if (buttons[0]) buttons[0].disabled = page <= 1;
        if (buttons[1]) buttons[1].disabled = page >= total;
      }
    }
    if (this.hasBottomPageInfoTarget) this.bottomPageInfoTarget.textContent = `Page ${page} of ${total}`;
  }
}