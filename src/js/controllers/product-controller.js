/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart, trackRecentlyViewed, getRecentlyViewed } from '../utils.js';
import { analytics } from '../analytics.js';
import { hydrateTemplate, setSlotHtml, setSlotAttributes } from '../template-helpers.js';

export default class ProductController extends Controller {
  static targets = ['price', 'stock', 'addButton', 'mainImage', 'galleryThumb', 'optionGroup', 'qty', 'message', 'sku', 'optionLabel',
    'carousel', 'galleryTrack', 'slideCounter', 'fullscreen', 'fullscreenTrack', 'fullscreenCounter', 'optionsPanel', 'stickyPrice', 'actionsSticky',
    'bundleConfiguredPrice', 'bundleTotal'];
  static values = { variants: String, type: String, productId: String, sku: String, currency: { type: String, default: 'USD' }, bundleOptions: { type: String, default: '' }, swatchMap: { type: String, default: '' }, colorImages: { type: String, default: '' } };

  connect() {
    this.selectedOptions = {};
    if (this.hasVariantsValue && this.variantsValue) {
      try { this.variantData = JSON.parse(this.variantsValue); } catch { this.variantData = []; }
    } else {
      this.variantData = [];
    }
    // Parse color-to-images map for gallery swapping on color select
    // Must be before _autoSelectSingleOptions which may trigger selectOption -> _swapGalleryForColor
    this._colorImagesMap = {};
    if (this.colorImagesValue) {
      try { this._colorImagesMap = JSON.parse(this.colorImagesValue); } catch { /* ignore */ }
    }

    if (this.variantData.length) {
      this._markOutOfStock();
      this._autoSelectSingleOptions();
    }

    // Store original gallery images for reset
    this._originalGalleryImages = null;

    // Gallery carousel init
    this._currentSlide = 0;
    if (this.hasGalleryTrackTarget) {
      this._slideCount = this.galleryTrackTarget.children.length;
      this._initSwipe(this.carouselTarget, 'main');
    } else if (this.hasFullscreenTrackTarget) {
      // Masonry layout: no carousel track, derive count from fullscreen track
      this._slideCount = this.fullscreenTrackTarget.children.length;
    }

    // Sticky actions: observe price block visibility for sticky price row
    this._isMobile = () => window.matchMedia('(max-width: 768px)').matches;
    if (this.hasStickyPriceTarget) {
      const priceBlock = this.element.querySelector('.product-price-block');
      if (priceBlock && 'IntersectionObserver' in window) {
        this._priceObserver = new IntersectionObserver(([entry]) => {
          if (this._isMobile()) {
            this.stickyPriceTarget.classList.toggle('visible', !entry.isIntersecting);
          } else {
            this.stickyPriceTarget.classList.remove('visible');
          }
        }, { threshold: 0 });
        this._priceObserver.observe(priceBlock);
      }
    }

    // Mobile: collapse configurable options by default
    if (this.hasOptionsPanelTarget && this._isMobile()) {
      this.optionsPanelTarget.classList.remove('expanded');
    }

    // Keyboard navigation: Escape closes fullscreen, arrows navigate gallery
    this._onKeyDown = (e) => {
      if (e.key === 'Escape') this.closeFullscreen();
      else if (e.key === 'ArrowLeft') {
        this._fullscreenOpen ? this.prevFullscreenSlide() : this.prevSlide();
      } else if (e.key === 'ArrowRight') {
        this._fullscreenOpen ? this.nextFullscreenSlide() : this.nextSlide();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);

    // Track recently viewed product
    const productData = this.element.dataset;
    if (productData.productUrlKey) {
      trackRecentlyViewed({
        id: parseInt(this.productIdValue, 10),
        name: productData.productName || "",
        urlKey: productData.productUrlKey,
        thumbnailUrl: productData.productThumbnail || null,
        price: parseFloat(productData.productPrice || 0),
        finalPrice: parseFloat(productData.productFinalPrice || 0),
      });
    }

    // Render recently viewed products
    this._renderRecentlyViewed(productData.productUrlKey);

    // Store product info for analytics events (add to cart, etc.)
    this._analyticsProduct = {
      sku: this.skuValue,
      name: productData.productName || "",
      price: parseFloat(productData.productPrice || 0),
      finalPrice: parseFloat(productData.productFinalPrice || 0),
    };

    // Analytics: track product view
    analytics.viewItem(this._analyticsProduct, this.currencyValue);

    // Bundle pricing: parse options and calculate initial configured price
    if (this.bundleOptionsValue) {
      try { this._bundleOptions = JSON.parse(this.bundleOptionsValue); } catch { this._bundleOptions = []; }
      if (this._bundleOptions.length) this.updateBundlePrice();
    }
  }

  groupedQtyIncrement(e) {
    const input = e.target.closest('.qty-stepper').querySelector('.qty-input');
    if (input && !input.disabled) input.value = Math.min(99, (parseInt(input.value) || 0) + 1);
  }

  groupedQtyDecrement(e) {
    const input = e.target.closest('.qty-stepper').querySelector('.qty-input');
    if (input && !input.disabled) input.value = Math.max(0, (parseInt(input.value) || 0) - 1);
  }

  bundleQtyIncrement(e) {
    const input = e.target.closest('.qty-stepper').querySelector('.qty-input');
    if (input) { input.value = Math.min(99, (parseInt(input.value) || 1) + 1); this.updateBundlePrice(); }
  }

  bundleQtyDecrement(e) {
    const input = e.target.closest('.qty-stepper').querySelector('.qty-input');
    if (input) { input.value = Math.max(1, (parseInt(input.value) || 1) - 1); this.updateBundlePrice(); }
  }

  updateBundlePrice() {
    if (!this._bundleOptions) return;
    // Build a price lookup: selectionId -> price
    const priceLookup = {};
    for (const opt of this._bundleOptions) {
      for (const sel of opt.selections) {
        priceLookup[sel.id] = sel.price;
      }
    }
    // Sum up prices from selected options * their qty
    let total = 0;
    const selects = this.element.querySelectorAll('[data-bundle-option-id]');
    const seen = new Set();
    selects.forEach(el => {
      const optId = el.dataset.bundleOptionId;
      if (seen.has(optId)) return; // skip radio/checkbox dupes handled below
      seen.add(optId);
      const tag = el.tagName;
      let selectedId = null;
      if (tag === 'SELECT') {
        selectedId = el.value;
      } else if (tag === 'INPUT' && el.type === 'radio') {
        const checked = this.element.querySelector(`input[name="${el.name}"]:checked`);
        selectedId = checked?.value;
      }
      if (selectedId && priceLookup[selectedId] !== undefined) {
        // Find qty input for this option
        const qtyInput = this.element.querySelector(`[data-bundle-qty-option="${optId}"]`);
        const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value) || 1) : 1;
        total += priceLookup[selectedId] * qty;
      }
    });
    // Also handle checkboxes (multi-select)
    const checkboxes = this.element.querySelectorAll('input[type="checkbox"][data-bundle-option-id]:checked');
    checkboxes.forEach(cb => {
      if (priceLookup[cb.value] !== undefined) {
        total += priceLookup[cb.value];
      }
    });
    // Update display
    if (this.hasBundleTotalTarget) {
      const formatted = new Intl.NumberFormat('en-AU', { style: 'currency', currency: this.currencyValue }).format(total);
      this.bundleTotalTarget.textContent = formatted;
      this.bundleConfiguredPriceTarget.style.display = total > 0 ? '' : 'none';
    }
  }

  _renderRecentlyViewed(currentUrlKey) {
    const section = document.getElementById("recently-viewed");
    const grid = document.getElementById("recently-viewed-grid");
    if (!section || !grid) return;

    const items = getRecentlyViewed(currentUrlKey ? [currentUrlKey] : []);
    if (items.length === 0) return;

    grid.innerHTML = '';
    items.forEach(p => {
      const url = `/${p.urlKey}`;
      const price = p.finalPrice || p.price || 0;
      const hasDiscount = p.finalPrice && p.price && p.finalPrice < p.price;

      const el = hydrateTemplate('tpl-product-card', {
        link: url,
        image: p.thumbnailUrl,
        name: p.name,
      });
      setSlotAttributes(el, { 'image': { alt: p.name || '' } });

      const priceHtml = hasDiscount
        ? `<span class="line-through text-base-content/40 text-xs">${formatPrice(p.price)}</span> <span class="text-error font-semibold">${formatPrice(price)}</span>`
        : `<span class="font-semibold">${formatPrice(price)}</span>`;
      setSlotHtml(el, 'price', priceHtml);

      grid.appendChild(el);
    });

    section.style.display = "";
  }

  disconnect() {
    document.removeEventListener('keydown', this._onKeyDown);
    if (this._priceObserver) this._priceObserver.disconnect();
  }

  // Mark out-of-stock option values
  _markOutOfStock() {
    const optionGroups = this.element.querySelectorAll('.option-group');
    optionGroups.forEach(group => {
      const buttons = group.querySelectorAll('.swatch-btn');
      buttons.forEach(btn => {
        const code = btn.dataset.attributeCode;
        const value = parseInt(btn.dataset.value, 10);
        // Check if ANY variant with this attribute value is in stock
        const hasStock = this.variantData.some(v =>
          v.attributes[code] === value && v.inStock
        );
        if (!hasStock) {
          btn.classList.add('out-of-stock');
          btn.disabled = true;
        }
      });
    });
  }

  // Auto-select if only one option value is available (in stock)
  _autoSelectSingleOptions() {
    const optionGroups = this.element.querySelectorAll('.option-group');
    optionGroups.forEach(group => {
      const availableButtons = group.querySelectorAll('.swatch-btn:not(.out-of-stock)');
      if (availableButtons.length === 1) {
        availableButtons[0].click();
      }
    });
  }

  // Gallery: click thumbnail to swap main image + sync carousel
  selectImage(event) {
    const thumb = event.currentTarget;
    const src = thumb.dataset.fullImage || thumb.src;
    if (this.hasMainImageTarget) {
      this.mainImageTarget.src = src;
    }
    this.galleryThumbTargets.forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
    // Sync carousel to this thumbnail index
    const idx = this.galleryThumbTargets.indexOf(thumb);
    if (idx >= 0) this._goToSlide(idx, 'main');
  }

  // Carousel: swipe/arrow navigation
  _initSwipe(container, mode) {
    let startX = 0, startY = 0, deltaX = 0, tracking = false;
    container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      deltaX = 0;
      tracking = true;
      const track = mode === 'main' ? this.galleryTrackTarget : this.fullscreenTrackTarget;
      track.style.transition = 'none';
    }, { passive: true });
    container.addEventListener('touchmove', (e) => {
      if (!tracking) return;
      deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      // If primarily vertical, don't interfere
      if (Math.abs(deltaY) > Math.abs(deltaX)) { tracking = false; return; }
      const track = mode === 'main' ? this.galleryTrackTarget : this.fullscreenTrackTarget;
      const current = mode === 'main' ? this._currentSlide : this._fsCurrentSlide;
      const offset = -(current * 100) + (deltaX / container.offsetWidth * 100);
      track.style.transform = `translateX(${offset}%)`;
    }, { passive: true });
    container.addEventListener('touchend', () => {
      if (!tracking) return;
      tracking = false;
      const track = mode === 'main' ? this.galleryTrackTarget : this.fullscreenTrackTarget;
      track.style.transition = '';
      if (Math.abs(deltaX) > 50) {
        if (deltaX < 0) this._nextSlide(mode);
        else this._prevSlide(mode);
      } else {
        this._goToSlide(mode === 'main' ? this._currentSlide : this._fsCurrentSlide, mode);
      }
    }, { passive: true });
  }

  _goToSlide(index, mode) {
    const count = this._slideCount || 0;
    if (!count) return;
    index = Math.max(0, Math.min(index, count - 1));
    if (mode === 'main' && !this.hasGalleryTrackTarget) return;
    if (mode === 'fullscreen' && !this.hasFullscreenTrackTarget) return;
    const track = mode === 'main' ? this.galleryTrackTarget : this.fullscreenTrackTarget;
    track.style.transform = `translateX(-${index * 100}%)`;
    if (mode === 'main') {
      this._currentSlide = index;
      if (this.hasSlideCounterTarget) this.slideCounterTarget.textContent = `${index + 1} / ${count}`;
      // Sync thumbnails
      this.galleryThumbTargets.forEach((t, i) => t.classList.toggle('active', i === index));
    } else {
      this._fsCurrentSlide = index;
      if (this.hasFullscreenCounterTarget) this.fullscreenCounterTarget.textContent = `${index + 1} / ${count}`;
    }
  }

  _prevSlide(mode) {
    const current = mode === 'main' ? this._currentSlide : this._fsCurrentSlide;
    this._goToSlide(current - 1, mode);
  }

  _nextSlide(mode) {
    const current = mode === 'main' ? this._currentSlide : this._fsCurrentSlide;
    this._goToSlide(current + 1, mode);
  }

  prevSlide() { this._prevSlide('main'); }
  nextSlide() { this._nextSlide('main'); }
  prevFullscreenSlide() { this._prevSlide('fullscreen'); }
  nextFullscreenSlide() { this._nextSlide('fullscreen'); }

  // Fullscreen gallery
  openFullscreen(event) {
    if (!this.hasFullscreenTarget) return;
    // Support opening at a specific slide (masonry grid click)
    const clickedIndex = event?.currentTarget?.dataset?.slideIndex;
    this._fsCurrentSlide = clickedIndex != null ? parseInt(clickedIndex, 10) : this._currentSlide;
    this._fullscreenOpen = true;
    this.fullscreenTarget.classList.add('active');
    document.body.style.overflow = 'hidden';
    this._goToSlide(this._fsCurrentSlide, 'fullscreen');
    if (!this._fsSwipeInit) {
      this._initSwipe(this.fullscreenTarget.querySelector('.fullscreen-viewport'), 'fullscreen');
      this._fsSwipeInit = true;
    }
  }

  closeFullscreen() {
    if (!this.hasFullscreenTarget) return;
    this._fullscreenOpen = false;
    this.fullscreenTarget.classList.remove('active');
    document.body.style.overflow = '';
    // Sync main carousel to fullscreen position (only if carousel exists)
    if (this.hasGalleryTrackTarget) {
      this._goToSlide(this._fsCurrentSlide, 'main');
    }
  }

  // Configurable: select an option value
  selectOption(event) {
    const el = event.currentTarget;
    const attrCode = el.dataset.attributeCode;
    const value = el.dataset.value || el.value;

    // Don't allow selecting disabled out-of-stock options
    if (el.classList.contains('out-of-stock')) {
      return;
    }

    if (el.tagName === 'BUTTON') {
      const container = el.closest('.option-values') || el.parentElement;
      if (container) {
        container.querySelectorAll('.swatch-btn').forEach(s => s.classList.remove('selected'));
      }
      el.classList.add('selected');
    }

    // Update the selected label
    this.optionLabelTargets.forEach(lbl => {
      if (lbl.dataset.optionCode === attrCode) {
        lbl.textContent = el.dataset.label || el.textContent;
      }
    });

    this.selectedOptions[attrCode] = value;
    this._updateAvailability();
    this.resolveVariant();

    // Swap gallery images when color is selected
    if (attrCode === 'color') {
      this._swapGalleryForColor(value);
    }

  }

  // Sticky add: on mobile, expand options first if configurable and not all selected
  stickyAdd(event) {
    event.preventDefault();
    if (this._isMobile && this._isMobile() && this.typeValue === 'configurable' && this.hasOptionsPanelTarget) {
      const selectedCount = Object.keys(this.selectedOptions).length;
      const totalOptions = this.variantData.length ? Object.keys(this.variantData[0]?.attributes || {}).length : 0;
      if (selectedCount < totalOptions) {
        // Expand options panel so user can select
        this.optionsPanelTarget.classList.add('expanded');
        this.optionsPanelTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
    }
    this.add(event);
  }

  // Hover over out-of-stock swatch: show "Out of Stock" on add button
  swatchEnter(event) {
    const el = event.currentTarget;
    if (!el.classList.contains('out-of-stock') || !this.hasAddButtonTarget) return;
    this._savedButtonText = this._savedButtonText || this.addButtonTarget.textContent;
    this.addButtonTarget.textContent = 'Out of Stock';
    this.addButtonTarget.classList.add('btn-out-of-stock');
  }

  swatchLeave(event) {
    if (!this.hasAddButtonTarget || !this._savedButtonText) return;
    this.addButtonTarget.textContent = this._savedButtonText;
    this.addButtonTarget.classList.remove('btn-out-of-stock');
  }

  // Disable options that can't combine with current selections
  _updateAvailability() {
    const optionGroups = this.element.querySelectorAll('.option-group');
    optionGroups.forEach(group => {
      const buttons = group.querySelectorAll('.swatch-btn');
      buttons.forEach(btn => {
        const code = btn.dataset.attributeCode;
        const value = parseInt(btn.dataset.value, 10);
        // Build a hypothetical selection with this value
        const test = { ...this.selectedOptions, [code]: String(value) };
        const hasMatch = this.variantData.some(v => {
          return Object.entries(test).every(([k, val]) => String(v.attributes[k]) === String(val)) && v.inStock;
        });
        if (!hasMatch) {
          btn.classList.add('out-of-stock');
        } else {
          btn.classList.remove('out-of-stock');
        }
      });
    });
  }

  resolveVariant() {
    if (!this.variantData.length) return;
    const selectedCount = Object.keys(this.selectedOptions).length;
    const totalOptions = Object.keys(this.variantData[0]?.attributes || {}).length;

    // Find matching variant (partial or full)
    const match = this.variantData.find(v => {
      const attrs = v.attributes || {};
      return Object.entries(this.selectedOptions).every(([key, val]) => String(attrs[key]) === String(val));
    });

    // Swap image on partial match (e.g. just color selected)
    if (match && match.imageUrl && this.hasMainImageTarget) {
      this.mainImageTarget.src = match.imageUrl;
    }

    if (match && selectedCount === totalOptions) {
      // Full match: update price, stock, SKU
      if (this.hasPriceTarget && (match.finalPrice || match.price)) {
        const priceHtml = formatPrice(match.finalPrice ?? match.price, this.currencyValue);
        this.priceTarget.innerHTML = priceHtml;
        if (this.hasStickyPriceTarget) this.stickyPriceTarget.innerHTML = `<span class="price-current">${priceHtml}</span>`;
      }
      if (this.hasStockTarget) {
        const inStock = match.inStock;
        this.stockTarget.innerHTML = inStock
          ? '<span class="in-stock">In Stock</span>'
          : '<span class="out-of-stock">Out of Stock</span>';
      }
      if (this.hasSkuTarget) {
        this.skuTarget.textContent = `SKU: ${match.sku}`;
      }
      if (this.hasAddButtonTarget) {
        if (!match.inStock) {
          this.addButtonTarget.textContent = 'Out of Stock';
          this.addButtonTarget.disabled = true;
          this.addButtonTarget.classList.add('btn-out-of-stock');
        } else {
          this.addButtonTarget.textContent = 'Add to Cart';
          this.addButtonTarget.disabled = false;
          this.addButtonTarget.classList.remove('btn-out-of-stock');
        }
        this._savedButtonText = this.addButtonTarget.textContent;
      }
      this._resolvedSku = match.sku;
    }
  }

  // Swap gallery images when a color swatch is selected
  _swapGalleryForColor(colorValueId) {
    const colorImages = this._colorImagesMap[colorValueId];
    if (!colorImages || !colorImages.length) return;

    // Masonry layout: swap images in the grid
    const galleryGrid = this.element.querySelector('.grid.grid-cols-2');
    if (galleryGrid) {
      // Save original images on first swap
      if (!this._originalGalleryImages) {
        this._originalGalleryImages = galleryGrid.innerHTML;
      }

      // Build new gallery HTML
      const html = colorImages.map((url, i) =>
        `<div class="relative bg-base-200 rounded-lg overflow-hidden cursor-zoom-in ${i === 0 ? 'col-span-2' : ''}"
              data-action="click->product#openFullscreen" data-slide-index="${i}">
          <img src="${url}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}"
               class="w-full object-contain mix-blend-multiply ${i === 0 ? 'aspect-[4/3]' : 'aspect-square'}" />
        </div>`
      ).join('');
      galleryGrid.innerHTML = html;

      // Update fullscreen slides too
      if (this.hasFullscreenTrackTarget) {
        this.fullscreenTrackTarget.innerHTML = colorImages.map((url) =>
          `<div class="fullscreen-slide"><img src="${url}" alt="" /></div>`
        ).join('');
        this._slideCount = colorImages.length;
      }

      // Also update the mainImage target (first image) for resolveVariant
      const firstImg = galleryGrid.querySelector('img');
      if (firstImg) this._currentMainSrc = firstImg.src;
    }

    // Carousel layout: swap images in the track
    if (this.hasGalleryTrackTarget) {
      if (!this._originalGalleryImages) {
        this._originalGalleryImages = this.galleryTrackTarget.innerHTML;
      }
      this.galleryTrackTarget.innerHTML = colorImages.map((url) =>
        `<div class="carousel-slide"><img src="${url}" alt="" class="w-full h-full object-contain mix-blend-multiply" /></div>`
      ).join('');
      this._slideCount = colorImages.length;
      this._currentSlide = 0;
      this._goToSlide(0, 'main');

      // Update thumbnails
      const thumbContainer = this.element.querySelector('.gallery-thumbs');
      if (thumbContainer) {
        thumbContainer.innerHTML = colorImages.map((url, i) =>
          `<button class="gallery-thumb ${i === 0 ? 'active' : ''}" data-action="click->product#goToSlide" data-slide="${i}">
            <img src="${url}" alt="" class="w-full h-full object-cover" />
          </button>`
        ).join('');
      }

      // Update fullscreen
      if (this.hasFullscreenTrackTarget) {
        this.fullscreenTrackTarget.innerHTML = colorImages.map((url) =>
          `<div class="fullscreen-slide"><img src="${url}" alt="" /></div>`
        ).join('');
      }
    }
  }

  // Add to cart — handles all product types
  async add(event) {
    event.preventDefault();
    const button = this.hasAddButtonTarget ? this.addButtonTarget : event.currentTarget;
    const originalText = button.textContent;
    button.textContent = 'Adding...';
    button.disabled = true;

    try {
      const maskedId = await ensureCart();
      const qty = this.hasQtyTarget ? parseInt(this.qtyTarget.value, 10) : 1;
      const type = this.typeValue;
      const body = { qty };

      if (type === 'configurable') {
        body.sku = this._resolvedSku || this.skuValue;
        if (!this._resolvedSku) {
          throw new Error('Please select all options');
        }
      } else if (type === 'grouped') {
        body.sku = this.skuValue;
        const superGroup = {};
        this.element.querySelectorAll('[data-grouped-id]').forEach(input => {
          const gQty = parseInt(input.value, 10);
          if (gQty > 0) superGroup[input.dataset.groupedId] = gQty;
        });
        if (Object.keys(superGroup).length === 0) throw new Error('Please select at least one product');
        body.super_group = superGroup;
      } else if (type === 'bundle') {
        body.sku = this.skuValue;
        const bundleOption = {};
        const bundleOptionQty = {};
        const seenOpts = new Set();
        this.element.querySelectorAll('[data-bundle-option-id]').forEach(el => {
          const optId = el.dataset.bundleOptionId;
          if (el.type === 'checkbox') {
            if (el.checked) {
              if (!bundleOption[optId]) bundleOption[optId] = [];
              bundleOption[optId].push(el.value);
            }
          } else if (el.type === 'radio') {
            if (el.checked) bundleOption[optId] = el.value;
          } else if (el.tagName === 'SELECT') {
            if (el.value) bundleOption[optId] = el.value;
          }
          // Collect qty per option (once per option)
          if (!seenOpts.has(optId)) {
            seenOpts.add(optId);
            const qtyInput = this.element.querySelector(`[data-bundle-qty-option="${optId}"]`);
            if (qtyInput) bundleOptionQty[optId] = parseInt(qtyInput.value, 10) || 1;
          }
        });
        // Validate required options
        if (this._bundleOptions) {
          const bundleData = JSON.parse(this.element.dataset.productBundleOptionsValue || '[]');
          // We don't have required flag in the JS data, but if any select has value="" it means placeholder
          const requiredSelects = this.element.querySelectorAll('select[data-bundle-option-id]');
          for (const sel of requiredSelects) {
            if (!sel.value) throw new Error('Please select all required options');
          }
        }
        body.bundle_option = bundleOption;
        body.bundle_option_qty = bundleOptionQty;
      } else if (type === 'downloadable') {
        body.sku = this.skuValue;
        const links = [];
        this.element.querySelectorAll('[data-download-link-id]:checked').forEach(el => {
          links.push(parseInt(el.dataset.downloadLinkId, 10));
        });
        if (links.length === 0) throw new Error('Please select at least one link');
        body.links = links;
      } else {
        // Simple / virtual
        body.sku = this.skuValue;
      }

      // Custom options (applies to any type)
      const options = {};
      this.element.querySelectorAll('[data-custom-option-id]').forEach(el => {
        const optId = el.dataset.customOptionId;
        if (el.type === 'checkbox') {
          if (el.checked) {
            if (!options[optId]) options[optId] = [];
            options[optId].push(el.value);
          }
        } else if (el.value) {
          options[optId] = el.value;
        }
      });
      if (Object.keys(options).length > 0) body.options = options;

      const response = await api.post(`/api/guest-carts/${maskedId}/items`, body);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error['hydra:description'] || error.detail || error.message || 'Failed to add item');
      }

      const cart = await response.json();
      localStorage.setItem('maho_cart_qty', String(cart.itemsQty || 0));
      updateCartBadge();
      dispatchCartEvent(cart);
      document.dispatchEvent(new CustomEvent('cart:open'));

      // Analytics: track add to cart
      analytics.addToCart(this._analyticsProduct || { sku: this.skuValue, name: '', price: 0, finalPrice: 0 }, qty, this.currencyValue);

      // Collapse options on mobile after successful add
      if (this.hasOptionsPanelTarget && this._isMobile && this._isMobile()) {
        this.optionsPanelTarget.classList.remove('expanded');
      }

      if (this.hasMessageTarget) {
        this.messageTarget.textContent = 'Added to cart!';
        this.messageTarget.className = 'cart-message success';
        setTimeout(() => { this.messageTarget.textContent = ''; this.messageTarget.className = 'cart-message'; }, 3000);
      }
    } catch (e) {
      if (this.hasMessageTarget) {
        this.messageTarget.textContent = e.message;
        this.messageTarget.className = 'cart-message error';
      }
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  incrementQty() {
    if (!this.hasQtyTarget) return;
    const v = parseInt(this.qtyTarget.value, 10) || 1;
    this.qtyTarget.value = Math.min(v + 1, 99);
  }

  decrementQty() {
    if (!this.hasQtyTarget) return;
    const v = parseInt(this.qtyTarget.value, 10) || 1;
    this.qtyTarget.value = Math.max(v - 1, 1);
  }
}