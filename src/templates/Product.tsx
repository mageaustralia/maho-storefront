/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product as ProductType, Category, StoreConfig, StorefrontStore } from '../types';
import { sanitizeCmsHtml } from '../utils/sanitize-html';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';
import { buildHreflangAlternates } from '../i18n/hreflang';
import { ProductCard } from './components/product-display/card/index';
import { getProductLayout } from './components/product-display/layout/index';
import { Gallery } from './components/product-display/gallery/index';
import { InfoPanel } from './components/product-display/info-panel/index';
import { ContentTabs } from './components/product-display/tabs/index';
import { ProductOptions, ConfigurableOptions } from './components/product-options';
import { GatedPrice } from './components/GatedPrice';
import { SizeGuideDrawer } from './components/product-display/size-guide/SizeGuideDrawer';
import { getVariant, getSection } from '../page-config';
import { djb2 } from '../utils/hash';
import { formatPrice, cleanUrlPath } from '../utils/format';

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
  const isGiftcard = product.type === 'giftcard';
  const hasCustomOptions = product.customOptions?.length > 0;
  const variantsJson = isConfigurable ? JSON.stringify(product.variants ?? []) : '';
  const hasRelated = product.relatedProducts && product.relatedProducts.length > 0;
  const hasUpsell = product.upsellProducts && product.upsellProducts.length > 0;

  const canonicalUrl = `${config.baseUrl}/${product.urlKey}`;

  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.description,
    sku: product.sku,
    url: canonicalUrl,
    image: product.imageUrl,
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
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

  const breadcrumbItems: { name: string; url?: string }[] = [{ name: 'Home', url: config.baseUrl }];
  if (productCategory) {
    breadcrumbItems.push({ name: productCategory.name, url: `${config.baseUrl}/${cleanUrlPath(productCategory.urlPath) || productCategory.urlKey}` });
  }
  breadcrumbItems.push({ name: product.name });

  const breadcrumbLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };

  return (
    <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
      <Seo
        title={product.metaTitle ?? `${product.name} | ${config.storeName}`}
        description={product.metaDescription ?? product.shortDescription ?? undefined}
        canonicalUrl={canonicalUrl}
        ogImage={product.imageUrl ?? undefined}
        ogType="product"
        siteName={config.storeName}
        jsonLd={[productLd, breadcrumbLd]}
        alternates={buildHreflangAlternates({ stores, path: canonicalUrl.replace(config.baseUrl, '') || '/', defaultStoreCode: currentStoreCode })}
      />

      {/* Freshness metadata — client JS checks API if _lastChecked > 60s */}
      <div hidden
        data-freshness-type="product"
        data-freshness-key={`product:${product.urlKey}`}
        data-freshness-api={`/api/products/${product.id}`}
        data-freshness-checked={(product as any)._lastChecked ?? '0'}
        data-freshness-version={djb2(`${product.updatedAt}|${product.name}|${product.finalPrice}|${product.specialPrice ?? ''}|${product.stockStatus}|${product.description ?? ''}|${product.imageUrl ?? ''}|${(product.configurableOptions || []).map(o => `${o.code}:${(o.values||[]).map((v: any)=>v.label).join(',')}`).join(';')}|${(product.variants || []).map((v: any) => `${v.sku}:${v.finalPrice ?? v.price}:${v.stockStatus}`).join(';')}|${(product.mediaGallery || []).map((m: any) => m.url).join(',')}|${(product.groupedProducts||[]).length}|${(product.bundleOptions||[]).length}|${(product.downloadableLinks||[]).length}|${(product.relatedProducts||[]).length}|${(product.crosssellProducts||[]).length}|${(product.upsellProducts||[]).length}`)}
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
                      <GatedPrice product={product} class="price-gated">
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
                      </GatedPrice>
                    </div>
                  )}

                  <div class="product-stock" data-product-target="stock">
                    {product.stockStatus === 'in_stock' ? (
                      <span class="in-stock">In Stock</span>
                    ) : (
                      <span class="out-of-stock">Out of Stock</span>
                    )}
                  </div>

                  {/* Product-type-specific options + custom options */}
                  <ProductOptions product={product} currency={currency} formatPrice={formatPrice} variant="standard" excludeConfigurable={true} />

                  <div class="product-actions-sticky" data-product-target="actionsSticky">
                    {isConfigurable && <ConfigurableOptions product={product} currency={currency} formatPrice={formatPrice} />}

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
                    <div class="product-short-desc" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(product.shortDescription) }} />
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
