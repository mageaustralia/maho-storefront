/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category as CategoryType, Product, StoreConfig, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';
import { ProductCard } from './components/product-display/card/index';
import { SubcategoryTiles } from './components/SubcategoryTiles';
import { getSection } from '../page-config';
import { rewriteContentUrls } from '../content-rewriter';
import { djb2 } from '../utils/hash';

interface CategoryPageProps {
  config: StoreConfig;
  categories: CategoryType[];
  category: CategoryType;
  products: Product[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  parentCategory?: CategoryType | null;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  featuredBlockHtml?: string | null;
  devData?: DevData | null;
}


export const CategoryPage: FC<CategoryPageProps> = ({ config, categories, category, products, currentPage, totalPages, totalItems, parentCategory, stores, currentStoreCode, featuredBlockHtml, devData }) => {
  const currency = config.baseCurrencyCode;
  const displayMode = category.displayMode ?? 'PRODUCTS';
  const showProducts = displayMode !== 'PAGE';
  const showCmsBlock = displayMode !== 'PRODUCTS' && !!category.cmsBlock;

  // Determine sidebar categories: if this category has children, show them. Otherwise show siblings.
  const activeChildren = category.children?.filter(c => c.includeInMenu) ?? [];
  const isParentCategory = activeChildren.length > 0;
  const sidebarParent = parentCategory ?? (isParentCategory ? category : null);
  const sidebarChildren = sidebarParent?.children?.filter(c => c.includeInMenu) ?? [];

  const canonicalUrl = `${config.baseUrl}/${category.urlPath ?? category.urlKey}`;

  const breadcrumbItems: { name: string; url?: string }[] = [{ name: 'Home', url: config.baseUrl }];
  if (parentCategory) {
    breadcrumbItems.push({ name: parentCategory.name, url: `${config.baseUrl}/${parentCategory.urlPath ?? parentCategory.urlKey}` });
  }
  breadcrumbItems.push({ name: category.name });

  const collectionLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description,
    url: canonicalUrl,
    numberOfItems: totalItems,
  };

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

  // Serialize products for client-side re-rendering
  const productsJson = JSON.stringify(products.map(p => ({
    id: p.id, sku: p.sku, name: p.name, urlKey: p.urlKey, type: p.type,
    price: p.price, finalPrice: p.finalPrice, specialPrice: p.specialPrice,
    thumbnailUrl: p.thumbnailUrl, stockStatus: p.stockStatus,
    reviewCount: p.reviewCount, averageRating: p.averageRating,
    hasRequiredOptions: p.hasRequiredOptions,
  })));

  // Process CMS block HTML — fix links for storefront
  const cmsBlockHtml = category.cmsBlock
    ? rewriteContentUrls(category.cmsBlock)
    : null;

  return (
    <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
      <Seo
        title={category.metaTitle ?? `${category.name} | ${config.storeName}`}
        description={category.metaDescription ?? category.description ?? undefined}
        canonicalUrl={canonicalUrl}
        siteName={config.storeName}
        jsonLd={[collectionLd, breadcrumbLd]}
      />
      {/* Freshness metadata — client JS checks both category AND products */}
      <div hidden
        data-freshness-type="category"
        data-freshness-key={`category:${category.urlPath ?? category.urlKey}`}
        data-freshness-api={`/api/categories/${category.id}`}
        data-freshness-category-id={String(category.id)}
        data-freshness-checked={(category as any)._lastChecked ?? '0'}
        data-freshness-version={djb2(`${category.updatedAt}|${category.name}|${category.cmsBlock ?? ''}|${totalItems}|${products.map(p => `${p.id}:${p.name}:${p.finalPrice ?? p.price}:${p.specialPrice ?? ''}:${p.thumbnailUrl ?? ''}:${p.stockStatus}:${p.reviewCount ?? 0}`).join(',')}`)}
      />

      <div class="py-6">
        {/* Breadcrumbs */}
        <nav class="breadcrumbs flex items-center gap-2 text-sm text-base-content/70 mb-5" aria-label="Breadcrumb">
          <a href="/" data-turbo-prefetch="true" class="hover:text-base-content transition-colors shrink-0">Home</a>
          {parentCategory && (
            <>
              <span class="shrink-0">/</span>
              <a href={`/${parentCategory.urlKey}`} data-turbo-prefetch="true" class="hover:text-base-content transition-colors shrink-0">{parentCategory.name}</a>
            </>
          )}
          <span class="shrink-0">/</span>
          <span class="text-base-content font-medium truncate min-w-0">{category.name}</span>
        </nav>

        <h1 class="text-3xl font-bold tracking-tight mb-6">{category.categoryHeading || category.name}</h1>

        {category.description && (
          <div class="prose prose-sm max-w-none mb-4 text-base-content/80" dangerouslySetInnerHTML={{ __html: rewriteContentUrls(category.description!) }} />
        )}

        {/* Two-column layout with sidebar */}
        <div
          data-controller={showProducts ? 'category-filter' : undefined}
          data-category-filter-category-id-value={showProducts ? String(category.id) : undefined}
          data-category-filter-category-url-value={showProducts ? (category.urlPath ?? category.urlKey) : undefined}
          data-category-filter-category-name-value={showProducts ? category.name : undefined}
          data-category-filter-currency-value={showProducts ? currency : undefined}
          data-category-filter-total-items-value={showProducts ? String(totalItems) : undefined}
          data-category-filter-current-page-value={showProducts ? String(currentPage) : undefined}
          data-category-filter-total-pages-value={showProducts ? String(totalPages) : undefined}
        >
          {/* Toolbar — only when showing products */}
          {showProducts && (
            <div class="flex items-center gap-2 mb-4">
              <button class="btn btn-sm btn-outline gap-2 lg:hidden shrink-0" data-action="click->category-filter#openFilterDrawer">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M2 4h12M4 8h8M6 12h4"/>
                </svg>
                Filters
              </button>
              {totalPages > 1 && (
                <div class="hidden sm:flex items-center gap-1 shrink-0" data-category-filter-target="topPagination">
                  <button class="btn btn-xs btn-ghost" disabled={currentPage <= 1}
                    data-action="click->category-filter#prevPage">Prev</button>
                  <span class="text-xs text-base-content/60" data-category-filter-target="topPageInfo">{currentPage}/{totalPages}</span>
                  <button class="btn btn-xs btn-ghost" disabled={currentPage >= totalPages}
                    data-action="click->category-filter#nextPage">Next</button>
                </div>
              )}
              <div class="ml-auto flex items-center gap-2">
                <label for="perpage-select" class="sr-only">Products per page</label>
                <select id="perpage-select" class="select select-xs sm:select-sm hidden sm:inline-flex" data-category-filter-target="perPage" data-action="change->category-filter#onPerPageChange">
                  <option value="12">12 per page</option>
                  <option value="24">24 per page</option>
                  <option value="48">48 per page</option>
                  <option value="96">96 per page</option>
                </select>
                <label for="sort-select" class="sr-only">Sort order</label>
                <select id="sort-select" class="select select-xs sm:select-sm" data-category-filter-target="sort" data-action="change->category-filter#onSortChange">
                  <option value="">Sort by</option>
                  <option value="position-asc">Featured</option>
                  <option value="created_at-desc">Newest</option>
                  <option value="name-asc">Name: A-Z</option>
                  <option value="name-desc">Name: Z-A</option>
                  <option value="price-asc">Price: Low-High</option>
                  <option value="price-desc">Price: High-Low</option>
                </select>
              </div>
            </div>
          )}

          <div class="grid grid-cols-[220px_1fr] gap-8 max-lg:grid-cols-1">
            {/* Sidebar */}
            <aside class="max-lg:hidden">
              {sidebarChildren.length > 0 && (
                <div class="mb-8">
                  <h2 class="font-bold uppercase tracking-wider mb-3">{sidebarParent!.name}</h2>
                  <ul class="flex flex-col">
                    {sidebarChildren.map((child) => (
                      <li key={child.id}>
                        <a
                          href={`/${child.urlPath ?? child.urlKey}`}
                          data-turbo-prefetch="true"
                          class={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-colors ${child.id === category.id ? 'bg-primary/10 text-primary font-semibold' : 'text-base-content/80 hover:bg-base-content/10 hover:text-base-content'}`}
                        >
                          {child.name}
                          {child.productCount > 0 && <span class="text-base-content/50">({child.productCount})</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Price Filter — only when showing products */}
              {showProducts && (
                <div class="mb-8">
                  <h2 class="font-bold uppercase tracking-wider mb-3">Price</h2>
                  <div data-category-filter-target="priceFilter">
                    <div class="flex justify-between text-xs text-base-content/60 mb-1">
                      <span data-category-filter-target="priceMinLabel">$0</span>
                      <span data-category-filter-target="priceMaxLabel">$500+</span>
                    </div>
                    <div class="price-range-slider">
                      <label for="price-range-min" class="sr-only">Minimum price</label>
                      <input id="price-range-min" type="range" min="0" max="500" value="0" step="10" class="range-min"
                        data-category-filter-target="priceMin"
                        data-action="input->category-filter#onPriceChange" />
                      <label for="price-range-max" class="sr-only">Maximum price</label>
                      <input id="price-range-max" type="range" min="0" max="500" value="500" step="10" class="range-max"
                        data-category-filter-target="priceMax"
                        data-action="input->category-filter#onPriceChange" />
                    </div>
                    <button class="btn btn-xs btn-ghost text-error mt-1" data-action="category-filter#clearPriceFilter" style="display:none" data-category-filter-target="priceClear">Clear</button>
                  </div>
                </div>
              )}

              {/* Layered navigation filters (populated dynamically via /api/layered-filters) */}
              {showProducts && (
                <div data-category-filter-target="filtersContainer"></div>
              )}
            </aside>

            {/* Mobile filter drawer (hidden on desktop, slide-in on mobile) */}
            {showProducts && (
              <div class="fixed inset-0 z-50" style="display:none" data-category-filter-target="filterDrawer">
                <div class="absolute inset-0 bg-black/40" data-action="click->category-filter#closeFilterDrawer"></div>
                <div class="absolute left-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-base-100 shadow-xl flex flex-col">
                  <div class="flex items-center justify-between p-4 border-b border-base-200">
                    <h3 class="font-bold">Filters</h3>
                    <div class="flex items-center gap-2">
                      <button class="btn btn-xs btn-ghost text-error" data-action="click->category-filter#clearAllFilters" data-category-filter-target="drawerClearBtn" style="display:none">Clear All</button>
                      <button class="btn btn-ghost btn-sm btn-circle" data-action="click->category-filter#closeFilterDrawer" aria-label="Close filters">&times;</button>
                    </div>
                  </div>
                  <div class="flex-1 overflow-y-auto p-4" data-category-filter-target="filterDrawerBody"></div>
                  <div class="p-4 border-t border-base-200">
                    <button class="btn btn-primary w-full" data-action="click->category-filter#closeFilterDrawer">Show Results</button>
                  </div>
                </div>
              </div>
            )}

            {/* Main content area (right of sidebar) */}
            <div>
              {/* Category image — hidden on mobile to save space */}
              {category.image && (
                <div class="mb-4 rounded-lg overflow-hidden hidden sm:block max-h-48 lg:max-h-64">
                  <img src={category.image} alt={category.name} class="w-full h-full object-cover" fetchpriority="high" loading="eager" />
                </div>
              )}

              {/* CMS block content (rendered static block from Maho — may include hero + .catblocks) */}
              {showCmsBlock && cmsBlockHtml && (
                <div class="prose max-w-none mb-6" dangerouslySetInnerHTML={{ __html: cmsBlockHtml }} />
              )}

              {/* Subcategory tiles — below hero, above products (only when no CMS block provides its own) */}
              {!showCmsBlock && <SubcategoryTiles categories={activeChildren} />}

              {/* Active filter chips */}
              {showProducts && (
                <div class="flex flex-wrap gap-2 mb-4" data-category-filter-target="activeFilters" style="display:none"></div>
              )}

              {/* Product Grid with optional CMS block insertion */}
              {showProducts && (() => {
                const cmsMode = getSection<string>('category', 'cmsInsertion', 'none');
                const cmsPosition = getSection<number>('category', 'cmsInsertPosition', 3);
                const hasFeatured = !!featuredBlockHtml && cmsMode !== 'none';
                const processedFeaturedHtml = hasFeatured ? rewriteContentUrls(featuredBlockHtml!) : null;

                return (
                <>
                  {cmsMode === 'row' && hasFeatured ? (
                    <>
                      {/* Row mode: split grid, insert CMS block as full-width row between product rows */}
                      <div class="grid grid-cols-2 md:grid-cols-3 gap-4" data-category-filter-target="grid">
                        {products.slice(0, cmsPosition).map((product, i) => (
                          <ProductCard key={product.id} product={product} currency={currency} priority={i < 4} />
                        ))}
                      </div>
                      <div class="my-6 rounded-xl overflow-hidden" dangerouslySetInnerHTML={{ __html: processedFeaturedHtml! }} />
                      {products.length > cmsPosition && (
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {products.slice(cmsPosition).map((product, i) => (
                            <ProductCard key={product.id} product={product} currency={currency} priority={false} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4" data-category-filter-target="grid">
                      {products.map((product, i) => {
                        const items = [];
                        {/* Cell mode: insert CMS block as a grid cell at the specified position */}
                        if (cmsMode === 'cell' && hasFeatured && i === cmsPosition) {
                          items.push(
                            <div key="cms-featured" class="col-span-1 rounded-xl overflow-hidden bg-base-200" dangerouslySetInnerHTML={{ __html: processedFeaturedHtml! }} />
                          );
                        }
                        items.push(<ProductCard key={product.id} product={product} currency={currency} priority={i < 4} />);
                        return items;
                      })}
                      {/* If position is beyond products, append at end */}
                      {cmsMode === 'cell' && hasFeatured && cmsPosition >= products.length && (
                        <div key="cms-featured" class="col-span-1 rounded-xl overflow-hidden bg-base-200" dangerouslySetInnerHTML={{ __html: processedFeaturedHtml! }} />
                      )}
                    </div>
                  )}

                  {products.length === 0 && (
                    <div class="text-center py-16 text-base-content/60">
                      <p>No products found in this category.</p>
                    </div>
                  )}

                  {totalPages > 1 && (
                    <nav class="flex items-center justify-center gap-4 mt-8" aria-label="Page navigation" data-category-filter-target="bottomPagination">
                      <button class="btn btn-sm btn-outline" disabled={currentPage <= 1}
                        data-action="click->category-filter#prevPage">Previous</button>
                      <span class="text-sm text-base-content/60" data-category-filter-target="bottomPageInfo">Page {currentPage} of {totalPages}</span>
                      <button class="btn btn-sm btn-outline" disabled={currentPage >= totalPages}
                        data-action="click->category-filter#nextPage">Next</button>
                    </nav>
                  )}
                </>
                );
              })()}
            </div>
          </div>

          {/* Products data for client-side sort/filter */}
          {showProducts && (
            <script type="application/json" data-category-filter-target="productsData" dangerouslySetInnerHTML={{ __html: productsJson }} />
          )}
        </div>
      </div>
    </Layout>
  );
};