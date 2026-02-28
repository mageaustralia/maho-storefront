/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product as ProductType } from '../../../../types';
import { ProductCard } from '../card/index';

interface LayoutMasonryProps {
  product: ProductType;
  currency: string;
  productCategory?: { name: string; urlKey: string | null } | null;
  formatPrice: (amount: number | null, currency: string) => string;
}

/**
 * Masonry Gallery + Slim Sidebar Layout
 *
 * Wide masonry image grid (~65%) with a slim right-hand panel (~35%)
 * containing product info, options, add-to-cart, and accordion sections
 * for description/reviews/related products.
 */
export const LayoutMasonry: FC<LayoutMasonryProps> = ({ product, currency, productCategory, formatPrice }) => {
  const hasDiscount = product.specialPrice !== null && product.specialPrice < (product.price ?? 0);
  const displayPrice = product.finalPrice ?? product.price;
  const isConfigurable = product.type === 'configurable' && product.configurableOptions?.length > 0;
  const isGrouped = product.type === 'grouped' && product.groupedProducts?.length;
  const isBundle = product.type === 'bundle' && product.bundleOptions?.length;
  const isDownloadable = product.type === 'downloadable' && product.downloadableLinks?.length;
  const hasCustomOptions = product.customOptions?.length > 0;
  const variantsJson = isConfigurable ? JSON.stringify(product.variants ?? []) : '';
  const hasRelated = product.relatedProducts && product.relatedProducts.length > 0;
  const hasUpsell = product.upsellProducts && product.upsellProducts.length > 0;
  const images = product.mediaGallery ?? [];

  return (
    <>
      {/* Breadcrumbs */}
      <nav class="flex items-center gap-2 text-sm text-base-content/50 py-3" aria-label="Breadcrumb" id="product-breadcrumbs">
        <a href="/" data-turbo-prefetch="true" class="hover:text-base-content transition-colors">Home</a>
        <span class="breadcrumb-sep text-base-content/25 mx-1">/</span>
        {productCategory && (
          <>
            <a href={`/${productCategory.urlKey}`} data-turbo-prefetch="true" class="hover:text-base-content transition-colors" data-breadcrumb-cat>{productCategory.name}</a>
            <span class="breadcrumb-sep text-base-content/25 mx-1">/</span>
          </>
        )}
        <span class="breadcrumb-current text-base-content font-medium">{product.name}</span>
      </nav>
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var d=sessionStorage.getItem('maho_cat');if(!d)return;var c=JSON.parse(d);if(!c.url||!c.name)return;var nav=document.getElementById('product-breadcrumbs');if(!nav)return;var existing=nav.querySelector('[data-breadcrumb-cat]');if(existing){if(existing.getAttribute('href')==='/'+c.url)return;existing.href='/'+c.url;existing.textContent=c.name;}else{var cur=nav.querySelector('.breadcrumb-current');if(!cur)return;var a=document.createElement('a');a.href='/'+c.url;a.textContent=c.name;a.setAttribute('data-turbo-prefetch','true');a.setAttribute('data-breadcrumb-cat','');a.className='hover:text-base-content transition-colors';var s=document.createElement('span');s.className='breadcrumb-sep text-base-content/25 mx-1';s.textContent='/';nav.insertBefore(a,cur);nav.insertBefore(s,cur);}}catch(e){}})()` }} />

      <div
        class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 pb-10 pt-2 items-start"
        data-controller="product"
        data-product-type-value={product.type}
        data-product-product-id-value={String(product.id)}
        data-product-sku-value={product.sku}
        data-product-currency-value={currency}
        data-product-variants-value={variantsJson}
        data-product-url-key={product.urlKey || ""}
        data-product-name={product.name}
        data-product-thumbnail={product.thumbnailUrl || ""}
        data-product-price={String(product.price || 0)}
        data-product-final-price={String(product.finalPrice || 0)}
        {...(isBundle ? { 'data-product-bundle-options-value': JSON.stringify(
          product.bundleOptions!.map(opt => ({
            id: opt.id,
            selections: opt.selections.map(sel => ({ id: sel.id, price: sel.price }))
          }))
        )} : {})}
      >
        {/* ===== LEFT: Masonry Image Gallery ===== */}
        <div class="masonry-gallery">
          {images.length > 0 ? (
            <div class="grid grid-cols-2 gap-2">
              {images.map((img, i) => (
                <div
                  key={i}
                  class={`relative bg-[var(--product-image-bg)] rounded-lg overflow-hidden cursor-zoom-in ${i === 0 ? 'col-span-2' : ''}`}
                  data-action="click->product#openFullscreen"
                  data-slide-index={String(i)}
                >
                  <img
                    src={img.url}
                    alt={img.label ?? product.name}
                    loading={i < 2 ? 'eager' : 'lazy'}
                    class={`w-full object-contain mix-blend-multiply ${i === 0 ? 'aspect-[4/3]' : 'aspect-square'}`}
                  />
                  {i === 0 && hasDiscount && (
                    <span class="badge badge-error absolute top-3 left-3 text-white">Sale</span>
                  )}
                </div>
              ))}
            </div>
          ) : product.imageUrl ? (
            <div class="bg-[var(--product-image-bg)] rounded-lg overflow-hidden aspect-square flex items-center justify-center">
              <img src={product.imageUrl} alt={product.name} class="w-full h-full object-contain mix-blend-multiply p-6" data-product-target="mainImage" />
            </div>
          ) : (
            <div class="bg-[var(--product-image-bg)] rounded-lg aspect-square flex items-center justify-center text-base-content/30">No Image</div>
          )}
        </div>

        {/* ===== RIGHT: Slim Sidebar ===== */}
        <div class="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] flex flex-col gap-5">
          {/* Title + SKU */}
          <div>
            <h1 class="text-xl font-bold leading-tight mb-1">{product.name}</h1>
            <p class="text-xs text-base-content/40" data-product-target="sku">SKU: {product.sku}</p>
          </div>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <a href="#accordion-reviews" class="flex items-center gap-2 text-sm no-underline">
              <span class="stars" style={`--rating: ${product.averageRating ?? 0}`}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span class="text-base-content/60">{product.reviewCount} reviews</span>
            </a>
          )}

          {/* Price */}
          {!isGrouped && (
            <div data-product-target="price">
              {isBundle ? (
                <div>
                  {product.minimalPrice && (
                    <div>
                      <span class="text-sm text-base-content/60">From </span>
                      <span class="text-2xl font-bold text-primary">{formatPrice(product.minimalPrice, currency)}</span>
                    </div>
                  )}
                  <div class="text-sm mt-1" data-product-target="bundleConfiguredPrice" style="display:none">
                    <span class="text-base-content/60">Price as configured: </span>
                    <span class="font-bold text-lg" data-product-target="bundleTotal"></span>
                  </div>
                </div>
              ) : hasDiscount ? (
                <div class="flex items-baseline gap-3">
                  <span class="text-2xl font-bold text-error">{formatPrice(product.specialPrice, currency)}</span>
                  <span class="text-base text-base-content/40 line-through">{formatPrice(product.price, currency)}</span>
                </div>
              ) : (
                <span class="text-2xl font-bold text-primary">{formatPrice(displayPrice, currency)}</span>
              )}
            </div>
          )}

          {/* Stock */}
          <div data-product-target="stock">
            {product.stockStatus === 'in_stock' ? (
              <span class="flex items-center gap-1.5 text-sm text-success">
                <span class="w-2 h-2 rounded-full bg-success inline-block"></span>
                In Stock
              </span>
            ) : (
              <span class="flex items-center gap-1.5 text-sm text-error">
                <span class="w-2 h-2 rounded-full bg-error inline-block"></span>
                Out of Stock
              </span>
            )}
          </div>

          {/* Short description */}
          {product.shortDescription && (
            <div class="text-sm text-base-content/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.shortDescription }} />
          )}

          {/* Configurable Options */}
          {isConfigurable && (
            <div data-product-target="optionsPanel">
              {product.configurableOptions.map((option) => (
                <div key={option.id} class="mb-4">
                  <label class="text-sm font-medium mb-2 block">
                    {option.label}: <span class="text-base-content/50" data-product-target="optionLabel" data-option-code={option.code}></span>
                  </label>
                  <div class="flex flex-wrap gap-2">
                    {option.values.map((val) => (
                      <button
                        key={val.id}
                        type="button"
                        class="swatch-btn"
                        data-action="click->product#selectOption mouseenter->product#swatchEnter mouseleave->product#swatchLeave"
                        data-attribute-code={option.code}
                        data-value={String(val.id)}
                        data-label={val.label}
                      >
                        {val.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grouped Products */}
          {isGrouped && (
            <div class="flex flex-col gap-3">
              {product.groupedProducts!.map((child) => (
                <div key={child.id} class="flex items-center gap-3 text-sm">
                  {child.thumbnailUrl && <img src={child.thumbnailUrl} alt={child.name} class="w-10 h-10 rounded object-cover" />}
                  <div class="flex-1">
                    <p class="font-medium">{child.name}</p>
                    <p class="text-primary font-semibold">{formatPrice(child.finalPrice ?? child.price, currency)}</p>
                  </div>
                  <input type="number" value={String(child.defaultQty || 0)} min="0" max="99" class="input input-sm w-16 text-center" data-grouped-id={String(child.id)} />
                </div>
              ))}
            </div>
          )}

          {/* Bundle Options */}
          {isBundle && (
            <div class="flex flex-col gap-4">
              {product.bundleOptions!.map((option, idx) => (
                <fieldset key={option.id} class="fieldset">
                  <legend class="fieldset-legend text-sm">
                    {option.title || `Option ${idx + 1}`}
                    {option.required && <span class="text-error ml-0.5">*</span>}
                  </legend>
                  {(option.type === 'select' || option.type === 'drop_down') && (
                    <select class="select select-sm w-full" data-bundle-option-id={String(option.id)} data-action="change->product#updateBundlePrice">
                      <option value="">Choose...</option>
                      {option.selections.map((sel) => (
                        <option key={sel.id} value={String(sel.id)} selected={sel.isDefault}>
                          {sel.name}{sel.price > 0 ? ` +${formatPrice(sel.price, currency)}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {option.type === 'radio' && (
                    <div class="flex flex-col gap-1.5">
                      {!option.required && (
                        <label class="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="radio" class="radio radio-xs" name={`bundle_option_${option.id}`} value="" data-bundle-option-id={String(option.id)} />
                          <span class="text-base-content/60">None</span>
                        </label>
                      )}
                      {option.selections.map((sel) => (
                        <label key={sel.id} class="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="radio" class="radio radio-xs" name={`bundle_option_${option.id}`} value={String(sel.id)} checked={sel.isDefault} data-bundle-option-id={String(option.id)} />
                          <span>{sel.name}</span>
                          {sel.price > 0 && <span class="text-base-content/50">+{formatPrice(sel.price, currency)}</span>}
                        </label>
                      ))}
                    </div>
                  )}
                  {(option.type === 'checkbox' || option.type === 'multi') && (
                    <div class="flex flex-col gap-1.5">
                      {option.selections.map((sel) => (
                        <label key={sel.id} class="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox" class="checkbox checkbox-xs" value={String(sel.id)} checked={sel.isDefault} data-bundle-option-id={String(option.id)} />
                          <span>{sel.name}</span>
                          {sel.price > 0 && <span class="text-base-content/50">+{formatPrice(sel.price, currency)}</span>}
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              ))}
            </div>
          )}

          {/* Downloadable Links */}
          {isDownloadable && (
            <div>
              <label class="text-sm font-medium mb-2 block">Available Downloads</label>
              {product.downloadableLinks!.map((link) => (
                <label key={link.id} class="flex items-center gap-2 text-sm mb-1">
                  {product.linksPurchasedSeparately && <input type="checkbox" class="checkbox checkbox-xs" data-download-link-id={String(link.id)} />}
                  <span>{link.title}</span>
                  {product.linksPurchasedSeparately && link.price > 0 && <span class="text-base-content/50">+{formatPrice(link.price, currency)}</span>}
                </label>
              ))}
            </div>
          )}

          {/* Custom Options */}
          {hasCustomOptions && (
            <div class="flex flex-col gap-3">
              {product.customOptions.map((option) => (
                <div key={option.id}>
                  <label class="text-sm font-medium mb-1 block">
                    {option.title}
                    {option.isRequired && <span class="text-error ml-0.5">*</span>}
                  </label>
                  {(option.type === 'drop_down' || option.type === 'select') ? (
                    <select class="select select-sm w-full" data-custom-option-id={String(option.id)}>
                      <option value="">Select {option.title}</option>
                      {option.values.map((val) => (
                        <option key={val.id} value={String(val.id)}>{val.title} {val.price > 0 ? `(+${formatPrice(val.price, currency)})` : ''}</option>
                      ))}
                    </select>
                  ) : (option.type === 'area' || option.type === 'textarea') ? (
                    <textarea class="textarea textarea-sm w-full" rows={3} data-custom-option-id={String(option.id)} placeholder={option.title} />
                  ) : (
                    <input type="text" class="input input-sm w-full" data-custom-option-id={String(option.id)} placeholder={option.title} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add to Cart */}
          <div data-product-target="actionsSticky">
            {product.stockStatus === 'in_stock' ? (
              <div class="flex flex-col gap-3">
                {!isGrouped && !isBundle && (
                  <div class="flex items-center gap-3">
                    <div class="join">
                      <button type="button" class="btn btn-sm join-item" data-action="product#decrementQty" aria-label="Decrease quantity">-</button>
                      <input type="number" value="1" min="1" max="99" class="input input-sm join-item w-14 text-center" data-product-target="qty" />
                      <button type="button" class="btn btn-sm join-item" data-action="product#incrementQty" aria-label="Increase quantity">+</button>
                    </div>
                    <button class="wishlist-btn" data-action="click->wishlist#toggle" data-product-id={String(product.id)} aria-label="Add to Wishlist" style="width:36px;height:36px;flex-shrink:0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                  </div>
                )}
                <button class="btn btn-primary w-full" data-action="product#stickyAdd" data-product-target="addButton">
                  Add to Cart
                </button>
                <div class="text-sm text-center" data-product-target="message"></div>
              </div>
            ) : (
              <div class="flex items-center gap-3">
                <button class="btn btn-disabled w-full" disabled>Out of Stock</button>
                <button class="wishlist-btn" data-action="click->wishlist#toggle" data-product-id={String(product.id)} aria-label="Add to Wishlist" style="width:36px;height:36px;flex-shrink:0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* ===== Accordion: Description / Reviews / Related ===== */}
          <div class="flex flex-col divide-y divide-base-300 border-t border-base-300 mt-2">
            {/* Description */}
            {product.description && (
              <details class="group" open>
                <summary class="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold select-none">
                  Description
                  <svg class="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div class="pb-4 text-sm text-base-content/70 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
              </details>
            )}

            {/* Reviews */}
            <details class="group" id="accordion-reviews"
              data-controller="review"
              data-review-product-id-value={String(product.id)}
              data-review-review-count-value={String(product.reviewCount)}
            >
              <summary class="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold select-none">
                Reviews {product.reviewCount > 0 && <span class="badge badge-sm badge-ghost ml-2">{product.reviewCount}</span>}
                <svg class="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div class="pb-4">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2 text-sm">
                    {product.reviewCount > 0 ? (
                      <>
                        <span class="stars" style={`--rating: ${product.averageRating ?? 0}`}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                        <span class="text-base-content/60">{product.averageRating?.toFixed(1)} ({product.reviewCount})</span>
                      </>
                    ) : (
                      <span class="text-base-content/50 text-sm">No reviews yet</span>
                    )}
                  </div>
                  <button class="btn btn-xs btn-outline" data-action="review#toggleForm">Write a Review</button>
                </div>
                <div class="review-form-wrap" data-review-target="formWrap" style="display:none">
                  <form data-action="submit->review#submit" class="flex flex-col gap-3">
                    <div data-review-target="ratingPicker">
                      <label class="text-sm font-medium">Your Rating</label>
                      <div class="rating-stars-input flex gap-1 mt-1">
                        {[1,2,3,4,5].map(n => (
                          <button type="button" data-action="review#setRating" data-rating={String(n)} aria-label={`${n} stars`} class="text-lg">&#9733;</button>
                        ))}
                      </div>
                      <input type="hidden" name="rating" data-review-target="ratingInput" value="" />
                    </div>
                    <input type="text" name="nickname" placeholder="Your Name" required maxLength={255} class="input input-sm w-full" data-review-target="nickname" />
                    <input type="text" name="title" placeholder="Review Title" required maxLength={255} class="input input-sm w-full" data-review-target="title" />
                    <textarea name="detail" placeholder="Your Review" required rows={3} class="textarea textarea-sm w-full" data-review-target="detail"></textarea>
                    <div class="flex gap-2">
                      <button type="submit" class="btn btn-sm btn-primary" data-review-target="submitBtn">Submit</button>
                      <button type="button" class="btn btn-sm btn-ghost" data-action="review#toggleForm">Cancel</button>
                    </div>
                    <p class="text-sm" data-review-target="message"></p>
                  </form>
                </div>
                <div data-review-target="list">
                  <p class="text-sm text-base-content/50" data-review-target="loading">Loading reviews...</p>
                </div>
                <div data-review-target="pagination" style="display:none"></div>
              </div>
            </details>

          </div>
        </div>{/* end sidebar */}
      </div>

      {/* Related Products — full width below the 2-column layout */}
      {hasRelated && (
        <div class="mt-12">
          <h2 class="text-xl font-bold mb-4">Related Products</h2>
          <div class="grid grid-cols-2 gap-4">
            {product.relatedProducts!.slice(0, 8).map((rp) => (
              <ProductCard key={rp.id} product={rp} currency={currency} />
            ))}
          </div>
        </div>
      )}

      {/* Upsell Products — full width */}
      {hasUpsell && (
        <div class="mt-12">
          <h2 class="text-xl font-bold mb-4">You Might Also Consider</h2>
          <div class="grid grid-cols-2 gap-4">
            {product.upsellProducts!.slice(0, 8).map((up) => (
              <ProductCard key={up.id} product={up} currency={currency} />
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen gallery overlay — shared with standard layout */}
      {images.length > 1 && (
        <div class="gallery-fullscreen" data-product-target="fullscreen">
          <div class="fullscreen-header">
            <span class="fullscreen-counter" data-product-target="fullscreenCounter">1 / {images.length}</span>
            <button class="fullscreen-close" data-action="product#closeFullscreen" aria-label="Close">&#10005;</button>
          </div>
          <div class="fullscreen-viewport">
            <div class="fullscreen-track" data-product-target="fullscreenTrack">
              {images.map((img, i) => (
                <div class="fullscreen-slide" key={i}>
                  <img src={img.url} alt={img.label ?? product.name} />
                </div>
              ))}
            </div>
            <button class="fullscreen-arrow fullscreen-arrow-prev" data-action="product#prevFullscreenSlide" aria-label="Previous image">&#8249;</button>
            <button class="fullscreen-arrow fullscreen-arrow-next" data-action="product#nextFullscreenSlide" aria-label="Next image">&#8250;</button>
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      <div class="mt-12" id="recently-viewed" style="display:none">
        <h2 class="text-xl font-bold mb-4">Recently Viewed</h2>
        <div class="grid grid-cols-2 gap-4" id="recently-viewed-grid"></div>
      </div>
    </>
  );
};