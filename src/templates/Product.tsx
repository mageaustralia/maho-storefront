/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product as ProductType, Category, StoreConfig, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';
import { ProductCard } from './components/product-display/card/index';
import { getProductLayout } from './components/product-display/layout/index';
import { Gallery } from './components/product-display/gallery/index';
import { InfoPanel } from './components/product-display/info-panel/index';
import { ContentTabs } from './components/product-display/tabs/index';
import { SizeGuideDrawer } from './components/product-display/size-guide/SizeGuideDrawer';
import { getVariant, getSection } from '../page-config';
import { djb2 } from '../utils/hash';
import { formatPrice } from '../utils/format';

interface ProductPageProps {
  config: StoreConfig;
  categories: Category[];
  product: ProductType;
  productCategory?: Category | null;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const ProductPage: FC<ProductPageProps> = ({ config, categories, product, productCategory, stores, currentStoreCode, devData }) => {
  const hasDiscount = product.specialPrice !== null && product.specialPrice < (product.price ?? 0);
  const displayPrice = product.finalPrice ?? product.price;
  const currency = config.baseCurrencyCode;
  const isConfigurable = product.type === 'configurable' && product.configurableOptions?.length > 0;
  const isGrouped = product.type === 'grouped' && product.groupedProducts?.length;
  const isBundle = product.type === 'bundle' && product.bundleOptions?.length;
  const isDownloadable = product.type === 'downloadable' && product.downloadableLinks?.length;
  const hasCustomOptions = product.customOptions?.length > 0;
  const variantsJson = isConfigurable ? JSON.stringify(product.variants ?? []) : '';
  const hasRelated = product.relatedProducts && product.relatedProducts.length > 0;
  const hasUpsell = product.upsellProducts && product.upsellProducts.length > 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.description,
    sku: product.sku,
    image: product.imageUrl,
    offers: {
      '@type': 'Offer',
      price: displayPrice,
      priceCurrency: currency,
      availability: product.stockStatus === 'in_stock'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    ...(product.averageRating !== null && product.reviewCount > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.averageRating,
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  };

  return (
    <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
      <Seo
        title={product.metaTitle ?? `${product.name} | ${config.storeName}`}
        description={product.metaDescription ?? product.shortDescription ?? undefined}
        canonicalUrl={`${config.baseUrl}/${product.urlKey}`}
        ogImage={product.imageUrl ?? undefined}
        ogType="product"
        jsonLd={jsonLd}
      />

      {/* Freshness metadata — client JS checks API if _lastChecked > 60s */}
      <div hidden
        data-freshness-type="product"
        data-freshness-key={`product:${product.urlKey}`}
        data-freshness-api={`/api/products/${product.id}`}
        data-freshness-checked={(product as any)._lastChecked ?? '0'}
        data-freshness-version={djb2(`${product.updatedAt}|${product.name}|${product.finalPrice}|${product.specialPrice ?? ''}|${product.stockStatus}|${product.description ?? ''}|${product.imageUrl ?? ''}|${(product.configurableOptions || []).map(o => `${o.code}:${(o.values||[]).map((v: any)=>v.label).join(',')}`).join(';')}|${(product.variants || []).map((v: any) => `${v.sku}:${v.finalPrice ?? v.price}:${v.stockStatus}`).join(';')}|${(product.mediaGallery || []).map((m: any) => m.url).join(',')}|${(product.groupedProducts||[]).length}|${(product.bundleOptions||[]).length}|${(product.downloadableLinks||[]).length}|${(product.relatedProducts||[]).length}|${(product.crossSellProducts||[]).length}|${(product.upsellProducts||[]).length}`)}
      />

      {/* Breadcrumbs */}
      <nav class="breadcrumbs flex items-center gap-2 text-sm text-base-content/70 py-3" aria-label="Breadcrumb" id="product-breadcrumbs">
        <a href="/" data-turbo-prefetch="true" class="hover:text-base-content transition-colors shrink-0">Home</a>
        <span class="breadcrumb-sep text-base-content/25 mx-1 shrink-0">/</span>
        {productCategory && (
          <>
            <a href={`/${productCategory.urlKey}`} data-turbo-prefetch="true" class="hover:text-base-content transition-colors shrink-0" data-breadcrumb-cat>{productCategory.name}</a>
            <span class="breadcrumb-sep text-base-content/25 mx-1 shrink-0">/</span>
          </>
        )}
        <span class="breadcrumb-current text-base-content font-medium truncate min-w-0">{product.name}</span>
      </nav>
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var d=sessionStorage.getItem('maho_cat');if(!d)return;var c=JSON.parse(d);if(!c.url||!c.name)return;var nav=document.getElementById('product-breadcrumbs');if(!nav)return;var existing=nav.querySelector('[data-breadcrumb-cat]');if(existing){if(existing.getAttribute('href')==='/'+c.url)return;existing.href='/'+c.url;existing.textContent=c.name;}else{var cur=nav.querySelector('.breadcrumb-current');if(!cur)return;var a=document.createElement('a');a.href='/'+c.url;a.textContent=c.name;a.setAttribute('data-turbo-prefetch','true');a.setAttribute('data-breadcrumb-cat','');a.className='hover:text-base-content transition-colors';var s=document.createElement('span');s.className='breadcrumb-sep text-base-content/25 mx-1';s.textContent='/';nav.insertBefore(a,cur);nav.insertBefore(s,cur);}}catch(e){}})()` }} />

      {/* ===== COMPOSABLE PRODUCT LAYOUT ===== */}
      {(() => {
        const layout = getProductLayout();
        const isMasonry = layout === 'masonry';
        const tabsVariant = getVariant('product', 'tabs', isMasonry ? 'accordion' : 'tabbed');
        const allGalleryImages = product.mediaGallery ?? [];
        // Separate swatch images (label ends with "-swatch") from display images
        const swatchImages = allGalleryImages.filter(img => img.label?.endsWith('-swatch'));
        const galleryImages = allGalleryImages.filter(img => !img.label?.endsWith('-swatch'));
        const images = galleryImages.length > 0
          ? galleryImages
          : product.imageUrl
            ? [{ url: product.imageUrl, label: product.name }]
            : [];

        // Build swatch map: { "Khaki": "https://...swatch.webp", ... }
        const swatchMap: Record<string, string> = {};
        swatchImages.forEach(img => {
          if (img.label) {
            const colorName = img.label.replace(/-swatch$/, '');
            swatchMap[colorName] = img.url;
          }
        });

        // Build color-to-variant-images map from variants
        const colorOption = product.configurableOptions?.find(o => o.code === 'color');
        const colorImagesMap: Record<string, string[]> = {};
        if (colorOption && product.variants?.length) {
          for (const val of colorOption.values) {
            const variantImages = product.variants
              .filter(v => String(v.attributes?.color) === String(val.id) && v.imageUrl)
              .map(v => v.imageUrl!);
            // Deduplicate
            const unique = [...new Set(variantImages)];
            if (unique.length > 0) {
              colorImagesMap[String(val.id)] = unique;
            }
          }
        }

        return (
          <div
            class={isMasonry
              ? 'grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 pb-10 pt-2 items-start'
              : `product-page ${product.pageLayout ? `layout-${product.pageLayout}` : ''}`
            }
            data-controller="product"
            data-product-type-value={product.type}
            data-product-product-id-value={String(product.id)}
            data-product-sku-value={product.sku}
            data-product-currency-value={currency}
            data-product-variants-value={variantsJson}
            data-product-swatch-map-value={Object.keys(swatchMap).length > 0 ? JSON.stringify(swatchMap) : ''}
            data-product-color-images-value={Object.keys(colorImagesMap).length > 0 ? JSON.stringify(colorImagesMap) : ''}
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
            {/* Gallery — composable variant */}
            <Gallery
              images={images}
              productName={product.name}
              productImageUrl={product.imageUrl}
              showSaleBadge={hasDiscount}
            />

            {/* Sidebar / Info Panel */}
            <div class={isMasonry ? 'lg:sticky lg:top-[calc(var(--header-actual-height,var(--header-height))+1.5rem)]' : 'product-info'}>
              {isMasonry ? (
                <>
                  <InfoPanel product={product} currency={currency} formatPrice={formatPrice} swatchMap={swatchMap} />
                  {getSection('product', 'showSizeGuide', false) && (
                    <div class="mt-3">
                      <SizeGuideDrawer blockIdentifier="size-guide-apparel" />
                    </div>
                  )}
                  {/* Accordion content below info in sidebar */}
                  <div class="mt-4">
                    <ContentTabs product={product} currency={currency} />
                  </div>
                </>
              ) : (
                <>
                  {/* Standard layout: full inline info panel */}
                  <h1 class="product-name">{product.name}</h1>
                  <div class="product-sku" data-product-target="sku">SKU: {product.sku}</div>

                  {product.reviewCount > 0 && (
                    <a href="#reviews" class="product-rating">
                      <span class="stars" style={`--rating: ${product.averageRating ?? 0}`}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                      <span class="review-count">{product.reviewCount} reviews</span>
                    </a>
                  )}

                  {!isGrouped && (
                    <div class="product-price-block" data-product-target="price">
                      {isBundle ? (
                        <>
                          {product.minimalPrice && (
                            <div>
                              <span class="text-sm text-base-content/60">From </span>
                              <span class="price-current">{formatPrice(product.minimalPrice, currency)}</span>
                            </div>
                          )}
                          <div class="text-sm mt-1" data-product-target="bundleConfiguredPrice" style="display:none">
                            <span class="text-base-content/60">Price as configured: </span>
                            <span class="font-bold text-lg" data-product-target="bundleTotal"></span>
                          </div>
                        </>
                      ) : hasDiscount ? (
                        <>
                          <span class="price-was">{formatPrice(product.price, currency)}</span>
                          <span class="price-now">{formatPrice(product.specialPrice, currency)}</span>
                        </>
                      ) : (
                        <span class="price-current">{formatPrice(displayPrice, currency)}</span>
                      )}
                    </div>
                  )}

                  <div class="product-stock" data-product-target="stock">
                    {product.stockStatus === 'in_stock' ? (
                      <span class="in-stock">In Stock</span>
                    ) : (
                      <span class="out-of-stock">Out of Stock</span>
                    )}
                  </div>

                  {isGrouped && (
                    <div class="product-grouped">
                      <table class="grouped-table">
                        <thead><tr><th></th><th>Product</th><th>Price</th><th>Qty</th></tr></thead>
                        <tbody>
                          {product.groupedProducts!.map((child) => {
                            const oos = child.inStock === false;
                            return (
                            <tr key={child.id} class={oos ? 'opacity-50' : ''}>
                              <td class="grouped-thumb-cell">
                                {child.thumbnailUrl ? <img src={child.thumbnailUrl} alt={child.name} class="grouped-thumb" /> : <div class="grouped-thumb-placeholder" />}
                              </td>
                              <td class="grouped-name">
                                {child.name}
                                {oos && <span class="block text-xs text-error mt-0.5">Out of Stock</span>}
                              </td>
                              <td class="grouped-price"><span class="price-current">{formatPrice(child.finalPrice ?? child.price, currency)}</span></td>
                              <td class="grouped-qty">
                                <div class="qty-stepper">
                                  <button type="button" class="qty-btn" data-action="product#groupedQtyDecrement" disabled={oos} aria-label="Decrease quantity">-</button>
                                  <input type="number" value="0" min="0" max="99" class="qty-input" data-grouped-id={String(child.id)} disabled={oos} />
                                  <button type="button" class="qty-btn" data-action="product#groupedQtyIncrement" disabled={oos} aria-label="Increase quantity">+</button>
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {isBundle && (
                    <div class="flex flex-col gap-6">
                      {product.bundleOptions!.map((option, idx) => (
                        <fieldset key={option.id} class="fieldset">
                          <legend class="fieldset-legend">{option.title || `Option ${idx + 1}`}{option.required && <span class="text-error ml-0.5">*</span>}</legend>
                          {(option.type === 'select' || option.type === 'drop_down') && (
                            <>
                              <select class="select w-full" data-bundle-option-id={String(option.id)} data-action="change->product#updateBundlePrice">
                                <option value="">Choose a selection...</option>
                                {option.selections.map((sel) => (
                                  <option key={sel.id} value={String(sel.id)} selected={sel.isDefault}>{sel.name}{sel.price > 0 ? `  +${formatPrice(sel.price, currency)}` : ''}</option>
                                ))}
                              </select>
                              {option.selections.some(s => s.canChangeQty) && (
                                <div class="flex items-center gap-2 mt-2">
                                  <span class="text-sm text-base-content/60">Qty:</span>
                                  <div class="qty-stepper qty-stepper-sm">
                                    <button type="button" class="qty-btn" data-action="product#bundleQtyDecrement" data-option-id={String(option.id)} aria-label="Decrease quantity">-</button>
                                    <input type="number" value="1" min="1" max="99" class="qty-input" data-bundle-qty-option={String(option.id)} data-action="input->product#updateBundlePrice" />
                                    <button type="button" class="qty-btn" data-action="product#bundleQtyIncrement" data-option-id={String(option.id)} aria-label="Increase quantity">+</button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          {option.type === 'radio' && (
                            <div class="flex flex-col gap-2">
                              {!option.required && (
                                <label class="flex items-center gap-2 cursor-pointer"><input type="radio" class="radio radio-sm" name={`bundle_option_${option.id}`} value="" data-bundle-option-id={String(option.id)} /><span class="text-sm text-base-content/60">None</span></label>
                              )}
                              {option.selections.map((sel) => (
                                <label key={sel.id} class="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" class="radio radio-sm" name={`bundle_option_${option.id}`} value={String(sel.id)} checked={sel.isDefault} data-bundle-option-id={String(option.id)} />
                                  <span class="text-sm">{sel.name}</span>
                                  {sel.price > 0 && <span class="text-sm text-base-content/60">+{formatPrice(sel.price, currency)}</span>}
                                </label>
                              ))}
                            </div>
                          )}
                          {(option.type === 'checkbox' || option.type === 'multi') && (
                            <div class="flex flex-col gap-2">
                              {option.selections.map((sel) => (
                                <label key={sel.id} class="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" class="checkbox checkbox-sm" value={String(sel.id)} checked={sel.isDefault} data-bundle-option-id={String(option.id)} />
                                  <span class="text-sm">{sel.name}</span>
                                  {sel.price > 0 && <span class="text-sm text-base-content/60">+{formatPrice(sel.price, currency)}</span>}
                                </label>
                              ))}
                            </div>
                          )}
                        </fieldset>
                      ))}
                    </div>
                  )}

                  {isDownloadable && (
                    <div class="product-downloadable-links">
                      <label class="option-label">Available Downloads</label>
                      {product.downloadableLinks!.map((link) => (
                        <label key={link.id} class="download-link-option">
                          {product.linksPurchasedSeparately && <input type="checkbox" data-download-link-id={String(link.id)} />}
                          <span>{link.title}</span>
                          {product.linksPurchasedSeparately && link.price > 0 && <span class="download-link-price">+{formatPrice(link.price, currency)}</span>}
                          {link.sampleUrl && <a href={link.sampleUrl} target="_blank" rel="noopener" class="download-sample-link">Sample</a>}
                        </label>
                      ))}
                    </div>
                  )}

                  {hasCustomOptions && (
                    <div class="product-custom-options">
                      {product.customOptions.map((option) => (
                        <div key={option.id} class="option-group">
                          <label class="option-label">{option.title}{option.isRequired && <span class="required">*</span>}</label>
                          {(option.type === 'drop_down' || option.type === 'select') ? (
                            <select class="option-select" data-custom-option-id={String(option.id)}>
                              <option value="">Select {option.title}</option>
                              {option.values.map((val) => (<option key={val.id} value={String(val.id)}>{val.title} {val.price > 0 ? `(+${formatPrice(val.price, currency)})` : ''}</option>))}
                            </select>
                          ) : (option.type === 'checkbox' || option.type === 'multiple') ? (
                            <div class="custom-option-checkboxes">
                              {option.values.map((val) => (
                                <label key={val.id} class="custom-option-check"><input type="checkbox" value={String(val.id)} data-custom-option-id={String(option.id)} /><span>{val.title}</span>{val.price > 0 && <span class="option-price-add">+{formatPrice(val.price, currency)}</span>}</label>
                              ))}
                            </div>
                          ) : (option.type === 'radio') ? (
                            <div class="custom-option-radios">
                              {option.values.map((val) => (
                                <label key={val.id} class="custom-option-radio"><input type="radio" name={`custom_option_${option.id}`} value={String(val.id)} data-custom-option-id={String(option.id)} /><span>{val.title}</span>{val.price > 0 && <span class="option-price-add">+{formatPrice(val.price, currency)}</span>}</label>
                              ))}
                            </div>
                          ) : (option.type === 'area' || option.type === 'textarea') ? (
                            <textarea class="option-input" rows={4} data-custom-option-id={String(option.id)} placeholder={option.title} />
                          ) : (option.type === 'date') ? (
                            <input type="date" class="option-input" data-custom-option-id={String(option.id)} />
                          ) : (option.type === 'date_time') ? (
                            <input type="datetime-local" class="option-input" data-custom-option-id={String(option.id)} />
                          ) : (option.type === 'time') ? (
                            <input type="time" class="option-input" data-custom-option-id={String(option.id)} />
                          ) : (
                            <input type="text" class="option-input" data-custom-option-id={String(option.id)} placeholder={option.title} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div class="product-actions-sticky" data-product-target="actionsSticky">
                    {isConfigurable && (
                      <div class="product-configurable-options" data-product-target="optionsPanel">
                        {product.configurableOptions.map((option) => (
                          <div key={option.id} class="option-group">
                            <label class="option-label">{option.label}: <span class="option-selected-label" data-product-target="optionLabel" data-option-code={option.code}></span></label>
                            <div class="option-values">
                              {option.values.map((val) => (
                                <button key={val.id} type="button" class="swatch-btn" data-action="click->product#selectOption mouseenter->product#swatchEnter mouseleave->product#swatchLeave" data-attribute-code={option.code} data-value={String(val.id)} data-label={val.label}>{val.label}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {product.stockStatus === 'in_stock' ? (
                      <div class="product-add-to-cart">
                        {!isBundle && (
                          <div class="sticky-price-row" data-product-target="stickyPrice">
                            {hasDiscount ? <span class="price-now">{formatPrice(product.specialPrice, currency)}</span> : <span class="price-current">{formatPrice(displayPrice, currency)}</span>}
                          </div>
                        )}
                        {!isGrouped && !isBundle && (
                          <div class="qty-stepper">
                            <button type="button" class="qty-btn" data-action="product#decrementQty" aria-label="Decrease quantity">-</button>
                            <input type="number" value="1" min="1" max="99" class="qty-input" data-product-target="qty" />
                            <button type="button" class="qty-btn" data-action="product#incrementQty" aria-label="Increase quantity">+</button>
                          </div>
                        )}
                        <button class="btn btn-primary add-to-cart-btn" data-action="product#stickyAdd" data-product-target="addButton">Add to Cart</button>
                        <button class="wishlist-btn wishlist-btn-lg" data-action="click->wishlist#toggle" data-product-id={String(product.id)} aria-label="Add to Wishlist">
                          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        </button>
                        <div class="cart-message" data-product-target="message"></div>
                      </div>
                    ) : (
                      <div class="product-add-to-cart">
                        <button class="wishlist-btn wishlist-btn-lg" data-action="click->wishlist#toggle" data-product-id={String(product.id)} aria-label="Add to Wishlist">
                          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {product.shortDescription && (
                    <div class="product-short-desc" dangerouslySetInnerHTML={{ __html: product.shortDescription }} />
                  )}
                </>
              )}
            </div>

            {/* Fullscreen gallery overlay */}
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
          </div>
        );
      })()}

      {/* Standard layout: full-width content below the fold */}
      {getProductLayout() !== 'masonry' && (
        <ContentTabs product={product} currency={currency} />
      )}

      {/* Recently Viewed (client-side rendered from localStorage) */}
      <div class="mt-12" id="recently-viewed" style="display:none">
        <h2 class="text-xl font-bold mb-4">Recently Viewed</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="recently-viewed-grid"></div>
      </div>
    </Layout>
  );
};