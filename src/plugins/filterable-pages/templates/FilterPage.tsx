/**
 * Maho Storefront — Filterable Pages Plugin
 * FilterPage template: renders a brand/filter page (e.g. /racquets/wilson)
 *
 * Shows brand hero (image + description), then the category layout
 * with sidebar navigation and filtered product grid.
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, Product, StoreConfig, StorefrontStore } from '../../../types';
import type { DevData } from '../../../dev-auth';
import type { FilterablePage, MenuData } from '../types';
import { Layout } from '../../../templates/Layout';
import { Seo } from '../../../templates/components/Seo';
import { ProductCard } from '../../../templates/components/product-display/card/index';
import { getSection } from '../../../page-config';
import { rewriteContentUrls } from '../../../content-rewriter';
import { cleanUrlPath } from '../../../utils/format';

/**
 * Combine brand + category names, removing overlapping words at the boundary.
 * e.g. "Acme Pro" + "Pro Widgets" → "Acme Pro Widgets"
 *      "BrandX" + "Category Name" → "BrandX Category Name"
 */
function deduplicateHeading(brand: string, category: string): string {
  if (!brand) return category;
  if (!category) return brand;

  const brandWords = brand.split(/\s+/);
  const catWords = category.split(/\s+/);

  // Find how many words at the end of brand match the start of category (case-insensitive)
  let overlap = 0;
  for (let i = 1; i <= Math.min(brandWords.length, catWords.length); i++) {
    const brandTail = brandWords.slice(-i).map(w => w.toLowerCase()).join(' ');
    const catHead = catWords.slice(0, i).map(w => w.toLowerCase()).join(' ');
    if (brandTail === catHead) overlap = i;
  }

  if (overlap > 0) {
    return [...brandWords, ...catWords.slice(overlap)].join(' ');
  }
  return `${brand} ${category}`;
}

interface FilterPageProps {
  config: StoreConfig;
  categories: Category[];
  category: Category;
  filterPage: FilterablePage;
  products: Product[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  parentCategory?: Category | null;
  cmsBlockHtml?: string | null;
  cmsBlockBottomHtml?: string | null;
  menuData?: MenuData | null;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const FilterPage: FC<FilterPageProps> = ({
  config,
  categories,
  category,
  filterPage,
  products,
  currentPage,
  totalPages,
  totalItems,
  parentCategory,
  cmsBlockHtml,
  cmsBlockBottomHtml,
  menuData,
  stores,
  currentStoreCode,
  devData,
}) => {
  const currency = config.baseCurrencyCode;

  // Build display heading: "<Brand> <Category>" with duplicate words removed
  // e.g. "Ace Pickleball" + "Pickleball Paddles" → "Ace Pickleball Paddles"
  const brandName = filterPage.title || '';
  const catName = category.name || '';
  const heading = deduplicateHeading(brandName, catName);

  const title = filterPage.metaTitle || heading;
  const description = filterPage.metaDescription || '';
  const canonicalUrl = filterPage.canonicalUrl
    ? `${config.baseUrl}${filterPage.canonicalUrl}`
    : `${config.baseUrl}/${category.urlKey}`;

  // Sidebar: show sibling categories (same as CategoryPage)
  const sidebarParent = parentCategory ?? category;
  const sidebarChildren = sidebarParent?.children?.filter(c => c.includeInMenu) ?? [];

  // Breadcrumbs: Home > Parent Category > Category > Brand
  const breadcrumbItems: { name: string; url?: string }[] = [
    { name: 'Home', url: '/' },
  ];
  if (parentCategory) {
    breadcrumbItems.push({
      name: parentCategory.name,
      url: `/${cleanUrlPath(parentCategory.urlPath) || parentCategory.urlKey}`,
    });
  }
  breadcrumbItems.push({
    name: category.name,
    url: `/${cleanUrlPath(category.urlPath) || category.urlKey}`,
  });
  if (filterPage.title) {
    breadcrumbItems.push({ name: filterPage.title });
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: `${config.baseUrl}${item.url}` } : {}),
    })),
  };

  const paginationBase = filterPage.canonicalUrl || `/${category.urlKey}`;
  const categoryBaseUrl = `/${cleanUrlPath(category.urlPath) || category.urlKey}`;

  // Build filter page URL map from menu data: { "brand_id": { "10": "/shoes/head", "4": "/shoes/wilson" } }
  const filterPageUrls: Record<string, Record<string, string>> = {};
  if (menuData?.columns) {
    for (const column of menuData.columns) {
      const urlMap: Record<string, string> = {};
      for (const item of column.items) {
        urlMap[String(item.optionId)] = `${categoryBaseUrl}/${item.urlKey}`;
      }
      if (Object.keys(urlMap).length > 0) {
        filterPageUrls[column.attributeCode] = urlMap;
      }
    }
  }

  // Resolve image URL — strip leading /media/ if baseMediaUrl already ends with /media/
  let imageUrl: string | null = null;
  if (filterPage.image) {
    const img = filterPage.image.replace(/^\/media\//, '');
    imageUrl = `${config.baseMediaUrl}${img}`;
  }

  return (
    <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
      <Seo
        title={`${title} | ${config.storeName}`}
        description={description}
        canonicalUrl={canonicalUrl}
        keywords={filterPage.metaKeywords}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div class="py-6">
        {/* Breadcrumbs */}
        <nav class="breadcrumbs flex items-center gap-2 text-sm text-base-content/70 mb-5" aria-label="Breadcrumb">
          {breadcrumbItems.map((item, i) => (
            <Fragment key={i}>
              {i > 0 && <span class="shrink-0">/</span>}
              {item.url ? (
                <a href={item.url} data-turbo-prefetch="true" class="hover:text-base-content transition-colors shrink-0">{item.name}</a>
              ) : (
                <span class="text-base-content font-medium truncate min-w-0">{item.name}</span>
              )}
            </Fragment>
          ))}
        </nav>

        {/* Brand hero */}
        <div class="flex items-start gap-5 mb-6">
          {imageUrl && (
            <div class="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-base-200 flex items-center justify-center p-2">
              <img
                src={imageUrl}
                alt={filterPage.title || ''}
                class="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <div class="flex-1 min-w-0">
            <h1 class="text-3xl font-bold tracking-tight mb-2">
              {heading}
            </h1>
            <div
              class="filter-page-description prose prose-sm max-w-none text-base-content/80"
              dangerouslySetInnerHTML={filterPage.description ? { __html: rewriteContentUrls(filterPage.description) } : undefined}
              style={filterPage.description ? undefined : 'display:none'}
            />
          </div>
        </div>

        {/* Top CMS block */}
        {cmsBlockHtml && (
          <div
            class="prose prose-sm max-w-none mb-6"
            dangerouslySetInnerHTML={{ __html: rewriteContentUrls(cmsBlockHtml) }}
          />
        )}

        {/* Two-column layout matching CategoryPage */}
        <div
          data-controller="category-filter"
          data-category-filter-category-id-value={String(category.id)}
          data-category-filter-category-url-value={cleanUrlPath(category.urlPath) || category.urlKey}
          data-category-filter-category-name-value={category.name}
          data-category-filter-currency-value={currency}
          data-category-filter-total-items-value={String(totalItems)}
          data-category-filter-current-page-value={String(currentPage)}
          data-category-filter-total-pages-value={String(totalPages)}
          data-category-filter-initial-filters-value={JSON.stringify(filterPage.filters)}
          data-category-filter-filter-page-urls-value={JSON.stringify(filterPageUrls)}
          data-category-filter-category-base-url-value={categoryBaseUrl}
        >
          {/* Active filter chips */}
          <div class="flex flex-wrap gap-2 mb-3" data-category-filter-target="activeFilters"></div>

          {/* Toolbar */}
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
              <select class="select select-xs sm:select-sm hidden sm:inline-flex" data-category-filter-target="perPage" data-action="change->category-filter#onPerPageChange">
                <option value="12">12 per page</option>
                <option value="24">24 per page</option>
                <option value="48">48 per page</option>
              </select>
              <select class="select select-xs sm:select-sm" data-category-filter-target="sort" data-action="change->category-filter#onSortChange">
                <option value="">Sort by</option>
                <option value="position-asc">Featured</option>
                <option value="name-asc">Name: A-Z</option>
                <option value="name-desc">Name: Z-A</option>
                <option value="price-asc">Price: Low-High</option>
                <option value="price-desc">Price: High-Low</option>
              </select>
            </div>
          </div>

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
                          href={`/${cleanUrlPath(child.urlPath) || child.urlKey}`}
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

              {/* Price filter */}
              <div class="mb-8">
                <h2 class="font-bold uppercase tracking-wider mb-3">Price</h2>
                <div data-category-filter-target="priceFilter">
                  <div class="flex justify-between text-xs text-base-content/60 mb-1">
                    <span data-category-filter-target="priceMinLabel">$0</span>
                    <span data-category-filter-target="priceMaxLabel">$500+</span>
                  </div>
                  <div class="price-range-slider">
                    <input type="range" min="0" max="500" value="0" step="10" class="range-min"
                      data-category-filter-target="priceMin"
                      data-action="input->category-filter#onPriceChange" />
                    <input type="range" min="0" max="500" value="500" step="10" class="range-max"
                      data-category-filter-target="priceMax"
                      data-action="input->category-filter#onPriceChange" />
                  </div>
                  <button class="btn btn-xs btn-ghost text-error mt-1" data-action="category-filter#clearPriceFilter" style="display:none" data-category-filter-target="priceClear">Clear</button>
                </div>
              </div>

              {/* Layered nav filters */}
              <div data-category-filter-target="filtersContainer"></div>
            </aside>

            {/* Mobile filter drawer */}
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

            {/* Main content — loading skeleton until controller fetches filtered products */}
            <div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4" data-category-filter-target="grid" style="opacity:0.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} class="animate-pulse">
                    <div class="bg-base-200 aspect-square rounded-lg mb-2"></div>
                    <div class="h-4 bg-base-200 rounded w-3/4 mb-1"></div>
                    <div class="h-4 bg-base-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div class="flex justify-center gap-2 mt-8" data-category-filter-target="bottomPagination">
                  {currentPage > 1 && (
                    <a href={`${paginationBase}?page=${currentPage - 1}`} class="btn btn-sm btn-ghost">Previous</a>
                  )}
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                    <a
                      key={p}
                      href={`${paginationBase}?page=${p}`}
                      class={`btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      {p}
                    </a>
                  ))}
                  {currentPage < totalPages && (
                    <a href={`${paginationBase}?page=${currentPage + 1}`} class="btn btn-sm btn-ghost">Next</a>
                  )}
                </div>
              )}

              {/* Bottom CMS block */}
              {cmsBlockBottomHtml && (
                <div
                  class="prose prose-sm max-w-none mt-8"
                  dangerouslySetInnerHTML={{ __html: rewriteContentUrls(cmsBlockBottomHtml) }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
