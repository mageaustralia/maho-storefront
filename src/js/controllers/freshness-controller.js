/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice } from '../utils.js';
import { hydrateTemplate, setSlotHtml, setSlotAttributes, showSlot, PLACEHOLDER_IMAGE } from '../template-helpers.js';

// Client-driven freshness revalidation.
// Edge cache throttle ensures at most 1 check per key per 60s across all visitors.
// Client calls Maho API directly. If stale, updates KV and patches the DOM in-place.

// Only log when dev toolbar is active
const _devToolbar = document.querySelector('.dev-toolbar');
const _log = (...args) => { if (_devToolbar) console.log(...args); };
const _warn = (...args) => { if (_devToolbar) console.warn(...args); };

export default class FreshnessController extends Controller {
  connect() {
    this._checking = false;
    this._onLoad = () => this.check();
    document.addEventListener('turbo:load', this._onLoad);
    this.check();
  }

  disconnect() {
    if (this._onLoad) {
      document.removeEventListener('turbo:load', this._onLoad);
      this._onLoad = null;
    }
  }

  async check() {
    const meta = document.querySelector('[data-freshness-type]');
    if (!meta) {
      _log('[freshness] no meta element found');
      return;
    }

    const type = meta.dataset.freshnessType;
    const kvKey = meta.dataset.freshnessKey;
    const apiPath = meta.dataset.freshnessApi;
    const renderedVersion = meta.dataset.freshnessVersion;

    _log('[freshness] check started', { type, kvKey, apiPath, renderedVersion });

    if (!type || !kvKey || !apiPath) {
      _log('[freshness] missing required data attributes');
      return;
    }

    // Prevent concurrent checks (connect + turbo:load can both fire)
    if (this._checking) return;
    this._checking = true;

    // Ask Worker if anyone checked recently (shared edge cache throttle)
    const shouldCheck = await this._shouldCheck(kvKey);
    if (!shouldCheck) { this._checking = false; return; }

    try {
      // Client fetches directly from the Maho API
      let freshData = await api.get(apiPath);

      // CMS collection endpoints return { member: [...] }
      if (type === 'cms' && freshData.member) {
        freshData = freshData.member?.[0];
        if (!freshData) return;
      }

      // Blog post: extract first item from collection response
      if (type === 'blog' && freshData.member) {
        freshData = freshData.member?.[0];
        if (!freshData) return;
      }

      // Blog listing: extract member array from collection response
      if (type === 'blog-list' && freshData.member) {
        freshData = freshData.member.map(p => ({
          identifier: p.urlKey,
          title: p.title,
          shortContent: p.excerpt,
          imageUrl: p.imageUrl,
          createdAt: p.publishDate ?? p.createdAt,
        }));
      }

      // For categories, also fetch products
      let freshProducts = null;
      if (type === 'category') {
        const catId = meta.dataset.freshnessCategoryId;
        _log('[freshness] category check, catId:', catId);
        if (catId) {
          const storeParam = window.MAHO_STORE_CODE ? `&store=${window.MAHO_STORE_CODE}` : '';
          const productsResp = await api.get(
            `/api/products?categoryId=${catId}&order[position]=asc&page=1&itemsPerPage=24${storeParam}`
          );
          freshProducts = {
            products: productsResp.member ?? [],
            totalItems: productsResp.totalItems ?? 0,
          };
          _log('[freshness] products fetched:', freshProducts.totalItems, 'items');
        }
      }

      // Build version fingerprint (mirrors server-side template logic)
      const freshVersion = this._buildVersion(type, freshData, freshProducts);

      _log('[freshness] version comparison', { renderedVersion, freshVersion, match: freshVersion === renderedVersion });

      if (freshVersion === renderedVersion) {
        // Data unchanged — nothing to do
        _log('[freshness] versions match, no update needed');
        return;
      }

      // Stale — update KV in background (fire-and-forget) so next visitor gets fresh data
      _log('[freshness] stale detected', { kvKey, renderedVersion, freshVersion });

      // KV keys are store-prefixed (e.g. "sv_2:category:audio")
      const storePrefix = window.MAHO_STORE_CODE ? `${window.MAHO_STORE_CODE}:` : '';

      fetch('/freshness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kvKey: `${storePrefix}${kvKey}`, data: freshData }),
      });

      if (type === 'category' && freshProducts) {
        const catId = meta.dataset.freshnessCategoryId;
        fetch('/cache/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: `${storePrefix}products:category:${catId}:page:1`,
            data: freshProducts,
          }),
        });

        // Also refresh the global category tree (nav menu, sidebar)
        // so structural changes (renames, moves, new categories) are picked up
        const catStoreParam = window.MAHO_STORE_CODE ? `&store=${window.MAHO_STORE_CODE}` : '';
        api.get(`/api/categories?itemsPerPage=200${catStoreParam}`).then(resp => {
          const cats = resp.member ?? resp;
          if (Array.isArray(cats) && cats.length > 0) {
            fetch('/cache/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key: `${storePrefix}categories`,
                data: cats,
              }),
            });
          }
        }).catch(() => {});
      }

      // Patch the DOM in-place with the fresh data — no reload needed
      this._patchDOM(type, freshData, freshProducts);

      // Update the freshness version so subsequent checks don't re-trigger
      meta.dataset.freshnessVersion = freshVersion;

    } catch (err) {
      _warn('[freshness] check failed:', err);
    } finally {
      this._checking = false;
    }
  }

  // ---- DOM patching per content type ----

  _patchDOM(type, data, products) {
    if (type === 'category') {
      this._patchCategory(data, products);
    } else if (type === 'product') {
      this._patchProduct(data);
    } else if (type === 'cms') {
      this._patchCms(data);
    } else if (type === 'blog') {
      this._patchBlog(data);
    } else if (type === 'blog-list') {
      this._patchBlogList(data);
    }
  }

  _patchCategory(catData, productsData) {
    // Update product grid
    const grid = document.querySelector('.product-grid');
    if (grid && productsData?.products) {
      grid.innerHTML = '';
      productsData.products.forEach(p => grid.appendChild(this._renderProductCard(p)));
      // Re-init wishlist state on new cards
      document.dispatchEvent(new CustomEvent('wishlist:refresh'));
    }

    // Update product count
    const countEl = document.querySelector('[data-category-filter-target="count"], .toolbar-amount');
    if (countEl && productsData) {
      countEl.textContent = `${productsData.totalItems} items`;
    }

    // Update CMS block if it changed
    const cmsBlock = document.querySelector('.category-cms-content');
    if (cmsBlock && catData.cmsBlock != null) {
      cmsBlock.innerHTML = catData.cmsBlock;
    }
  }

  _patchProduct(data) {
    _log('[freshness] patching product DOM with:', data.name, data.finalPrice, data.imageUrl);
    _log('[freshness] mediaGallery:', data.mediaGallery);

    // Update product images - handle both gallery and single-image layouts
    const gallery = data.mediaGallery || [];
    const galleryTrack = document.querySelector('.gallery-track');
    const mainImageContainer = document.querySelector('.product-main-image');

    _log('[freshness] DOM elements found:', {
      galleryLength: gallery.length,
      hasGalleryTrack: !!galleryTrack,
      hasMainImageContainer: !!mainImageContainer
    });

    if (gallery.length > 1 && galleryTrack) {
      // Multi-image gallery layout
      _log('[freshness] updating gallery track with', gallery.length, 'images:', gallery.map(g => g.url));
      galleryTrack.innerHTML = gallery.map((img, i) =>
        `<div class="gallery-slide"><img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.label || data.name || '')}" loading="${i === 0 ? 'eager' : 'lazy'}" /></div>`
      ).join('');
      // Update counter
      const counter = document.querySelector('[data-product-target="slideCounter"]');
      if (counter) counter.textContent = `1 / ${gallery.length}`;
      // Update thumbnails
      const thumbContainer = document.querySelector('.product-thumbnails');
      _log('[freshness] updating thumbnails, container found:', !!thumbContainer);
      if (thumbContainer) {
        thumbContainer.innerHTML = gallery.map((img, i) =>
          `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.label || data.name || '')}" loading="lazy" class="product-thumb${i === 0 ? ' active' : ''}" data-product-target="galleryThumb" data-action="click->product#selectImage" data-full-image="${escapeHtml(img.url)}" />`
        ).join('');
      }
      _log('[freshness] updated gallery with', gallery.length, 'images');
    } else if (mainImageContainer) {
      // Single image or placeholder layout
      const imgUrl = gallery[0]?.url || data.imageUrl;
      if (imgUrl) {
        mainImageContainer.innerHTML = `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(data.name || '')}" data-product-target="mainImage" />`;
        _log('[freshness] updated main image to:', imgUrl);
      } else {
        mainImageContainer.innerHTML = '<div class="product-image-placeholder">No Image</div>';
      }
    } else {
      _log('[freshness] no image container found - gallery:', !!galleryTrack, 'main:', !!mainImageContainer);
    }

    // Update price (handles both regular and sale price layouts)
    const priceBlock = document.querySelector('.product-price-block, [data-product-target="price"]');
    if (priceBlock) {
      // Get currency from product controller data attribute or global
      const productEl = document.querySelector('[data-product-currency-value]');
      const currency = productEl?.dataset.productCurrencyValue || window.MAHO_CURRENCY;

      const hasDiscount = data.specialPrice != null && data.specialPrice < (data.price ?? 0);
      if (hasDiscount) {
        priceBlock.innerHTML = `<span class="price-was">${formatPrice(data.price, currency)}</span><span class="price-now">${formatPrice(data.specialPrice, currency)}</span>`;
      } else {
        priceBlock.innerHTML = `<span class="price-current">${formatPrice(data.finalPrice ?? data.price, currency)}</span>`;
      }
      _log('[freshness] updated price to:', data.finalPrice ?? data.price, 'currency:', currency);
    }

    // Update stock status
    const stockEl = document.querySelector('.product-stock, [data-product-target="stock"]');
    if (stockEl) {
      const inStock = data.stockStatus === 'in_stock';
      stockEl.innerHTML = inStock
        ? '<span class="in-stock">In Stock</span>'
        : '<span class="out-of-stock">Out of Stock</span>';
      _log('[freshness] updated stock to:', data.stockStatus);
    }

    // Update product name
    const nameEl = document.querySelector('.product-name, h1.product-title');
    if (nameEl && data.name) {
      nameEl.textContent = data.name;
    }

    // Dispatch event for other controllers that might need to update
    document.dispatchEvent(new CustomEvent('product:freshData', { detail: data }));
  }

  _patchCms(data) {
    if (!data.content) return;

    // Homepage: CMS content is inside <section data-controller="home-carousel"><div>...</div></section>
    const homeCmsEl = document.querySelector('[data-controller="home-carousel"] > div');
    if (homeCmsEl) {
      homeCmsEl.innerHTML = data.content;
      _log('[freshness] patched homepage CMS content');
      return;
    }

    // Regular CMS pages
    const contentEl = document.querySelector('.cms-content, .cms-page-content');
    if (contentEl) {
      contentEl.innerHTML = data.content;
      _log('[freshness] patched CMS page content');
    }

    // Update title (skip for homepage which doesn't have an h1)
    const titleEl = document.querySelector('.cms-page h1, .page-title');
    if (titleEl && data.title) {
      titleEl.textContent = data.title;
    }
  }

  _patchBlog(data) {
    // Update blog post content
    const contentEl = document.querySelector('.blog-post-content');
    if (contentEl && data.content) {
      contentEl.innerHTML = data.content;
    }
    // Update title
    const titleEl = document.querySelector('.blog-post-header h1');
    if (titleEl) {
      titleEl.textContent = data.contentHeading || data.title || '';
    }
    // Update hero image
    const heroEl = document.querySelector('.blog-post-hero');
    if (heroEl && data.imageUrl) {
      heroEl.src = data.imageUrl;
      heroEl.alt = data.title || '';
    }
    // Update page title
    document.title = `${data.title} | Blog | ${document.title.split('|').pop()?.trim() || 'Store'}`;
  }

  _patchBlogList(posts) {
    const grid = document.querySelector('.blog-grid');
    const noPostsEl = document.querySelector('.blog-page .no-products');

    if (!Array.isArray(posts)) return;

    if (posts.length === 0) {
      if (grid) grid.remove();
      if (!noPostsEl) {
        const container = document.querySelector('.blog-page');
        if (container) {
          const p = document.createElement('p');
          p.className = 'no-products';
          p.textContent = 'No blog posts yet.';
          container.appendChild(p);
        }
      }
      return;
    }

    // Remove "no posts" message if present
    if (noPostsEl) noPostsEl.remove();

    const fragment = document.createDocumentFragment();
    posts.forEach(p => {
      const el = hydrateTemplate('tpl-blog-card', {
        link: `/blog/${p.identifier}`,
        title: p.title,
      });

      if (p.imageUrl) {
        setSlotAttributes(el, { 'image': { src: p.imageUrl, alt: p.title } });
      } else {
        // Hide image, show placeholder
        const img = el.querySelector('[data-slot="image"]');
        if (img) img.style.display = 'none';
        const placeholder = el.querySelector('[data-slot="placeholder"]');
        if (placeholder) placeholder.classList.remove('hidden');
      }

      if (p.createdAt) {
        const dateSlot = el.querySelector('[data-slot="date"]');
        if (dateSlot) {
          dateSlot.textContent = new Date(p.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
          dateSlot.setAttribute('datetime', p.createdAt);
          dateSlot.classList.remove('hidden');
        }
      }

      if (p.shortContent) {
        const excerptSlot = el.querySelector('[data-slot="excerpt"]');
        if (excerptSlot) {
          excerptSlot.textContent = p.shortContent;
          excerptSlot.classList.remove('hidden');
        }
      }

      fragment.appendChild(el);
    });

    if (grid) {
      grid.innerHTML = '';
      grid.appendChild(fragment);
    } else {
      const container = document.querySelector('.blog-page .category-header');
      if (container) {
        const div = document.createElement('div');
        div.className = 'blog-grid';
        div.appendChild(fragment);
        container.after(div);
      }
    }
  }

  // ---- Product card (mirrors ProductCard.tsx via tpl-product-card) ----

  _renderProductCard(p) {
    const hasDiscount = p.specialPrice != null && p.specialPrice < (p.price ?? 0);
    const displayPrice = p.finalPrice ?? p.price;
    const needsOptions = ['configurable', 'grouped', 'bundle', 'downloadable'].includes(p.type) || p.hasRequiredOptions;
    const isOOS = p.stockStatus === 'out_of_stock';
    const url = `/${p.urlKey}`;

    const el = hydrateTemplate('tpl-product-card', {
      link: url,
      image: p.thumbnailUrl,
      name: p.name,
    });

    el.dataset.productId = String(p.id);
    el.dataset.productSku = p.sku;
    setSlotAttributes(el, { 'image': { alt: p.name || '' } });

    // Badges
    if (hasDiscount) showSlot(el, 'badge-sale');
    if (isOOS) showSlot(el, 'badge-oos');

    // Price
    const priceHtml = hasDiscount
      ? `<span class="line-through text-base-content/40">${formatPrice(p.price)}</span> <span class="font-semibold text-error">${formatPrice(p.specialPrice)}</span>`
      : `<span class="font-semibold">${formatPrice(displayPrice)}</span>`;
    setSlotHtml(el, 'price', priceHtml);

    // Rating
    if (p.reviewCount > 0) {
      showSlot(el, 'rating');
      setSlotHtml(el, 'rating', `<span class="text-warning" style="--rating: ${p.averageRating ?? 0}">&#9733;&#9733;&#9733;&#9733;&#9733;</span> <span>(${p.reviewCount})</span>`);
    }

    // Action button
    let actionHtml;
    if (isOOS) {
      actionHtml = '<button class="btn btn-sm btn-disabled w-full" disabled>Out of Stock</button>';
    } else if (needsOptions) {
      actionHtml = `<a href="${url}" class="btn btn-sm btn-primary btn-outline w-full" data-turbo-prefetch="true">Select Options</a>`;
    } else {
      actionHtml = `<button class="btn btn-sm btn-primary w-full" onclick="(async()=>{const c=localStorage.getItem('maho_cart_id');if(!c){const r=await fetch(window.MAHO_API_URL+'/api/guest-carts',{method:'POST',headers:{'Accept':'application/ld+json'}});const d=await r.json();localStorage.setItem('maho_cart_id',d.maskedId)}const m=localStorage.getItem('maho_cart_id');const r=await fetch(window.MAHO_API_URL+'/api/guest-carts/'+m+'/items',{method:'POST',headers:{'Accept':'application/ld+json','Content-Type':'application/ld+json'},body:JSON.stringify({sku:'${p.sku}',qty:1})});if(r.ok){document.dispatchEvent(new CustomEvent('cart:updated'));document.dispatchEvent(new CustomEvent('cart:open'));this.textContent='Added!';setTimeout(()=>this.textContent='Add to Cart',2000)}else{this.textContent='Error';setTimeout(()=>this.textContent='Add to Cart',2000)}})()">Add to Cart</button>`;
    }
    setSlotHtml(el, 'actions', actionHtml);

    return el;
  }

  // ---- Helpers ----

  async _shouldCheck(kvKey) {
    try {
      const r = await fetch(`/freshness/should-check?key=${encodeURIComponent(kvKey)}`);
      if (!r.ok) return false;
      const data = await r.json();
      return data.check === true;
    } catch {
      return false;
    }
  }

  _buildVersion(type, d, products) {
    // Hash all data that affects page rendering — any change triggers a refresh
    if (type === 'category') {
      const p = products?.products ?? [];
      const productSig = p.map(x => `${x.id}:${x.name}:${x.finalPrice ?? x.price}:${x.specialPrice ?? ''}:${x.thumbnailUrl ?? ''}:${x.stockStatus}:${x.reviewCount ?? 0}`).join(',');
      return this._hash(`${d.updatedAt}|${d.name}|${d.cmsBlock ?? ''}|${products?.totalItems ?? 0}|${productSig}`);
    }
    if (type === 'product') {
      const opts = (d.configurableOptions || []).map(o => `${o.code}:${(o.values||[]).map(v=>v.label).join(',')}`).join(';');
      const variants = (d.variants || []).map(v => `${v.sku}:${v.finalPrice ?? v.price}:${v.stockStatus}`).join(';');
      const gallery = (d.mediaGallery || []).map(m => m.url).join(',');
      return this._hash(`${d.updatedAt}|${d.name}|${d.finalPrice}|${d.specialPrice ?? ''}|${d.stockStatus}|${d.description ?? ''}|${d.imageUrl ?? ''}|${opts}|${variants}|${gallery}|${(d.groupedProducts||[]).length}|${(d.bundleOptions||[]).length}|${(d.downloadableLinks||[]).length}|${(d.relatedProducts||[]).length}|${(d.crossSellProducts||[]).length}|${(d.upsellProducts||[]).length}`);
    }
    if (type === 'blog-list') {
      // d is an array of post summaries
      return this._hash(d.map(p => `${p.identifier}:${p.title}:${p.shortContent ?? ''}:${p.imageUrl ?? ''}:${p.createdAt ?? ''}`).join('|'));
    }
    if (type === 'blog') {
      // Blog post - hash key fields that affect rendering
      return this._hash(`${d.updatedAt}|${d.title ?? ''}|${d.content ?? ''}`);
    }
    // CMS
    return this._hash(`${d.updatedAt}|${d.title ?? ''}|${d.content ?? ''}`);
  }

  _hash(str) {
    // djb2 hash — fast, deterministic, good distribution
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
  }
}