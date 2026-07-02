/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Catch-all URL resolver — the LAST routes registered. Resolves clean URLs
 * (/women, /men/shirts, /some-product, /about) to categories / products / CMS
 * pages / blog posts / filter (brand) pages, with a KV fast-path and an API
 * fallback that back-fills KV. Extracted from index.tsx (Phase 3.4) via
 * registerUrlResolverRoutes; the index.tsx-local helpers are injected as deps.
 *
 * MUST be registered after every concrete route (it greedily matches /:slug).
 */

import { jsx, Fragment } from 'hono/jsx';
import type { Hono } from 'hono';
import type { ContentStore } from '../content-store';
import type { MahoApiClient } from '../api-client';
import { normalizeProduct } from '../api-client';
import { rewriteContentUrls } from '../content-rewriter';
import { resolveFilterPage, getMenuData, FilterPage } from '../plugins/filterable-pages';
import { createDevTimer, type DevSession, type DevData } from '../dev-auth';
import { Layout } from '../templates/Layout';
import { Seo } from '../templates/components/Seo';
import { CategoryPage } from '../templates/Category';
import { ProductPage } from '../templates/Product';
import { CmsPageTemplate } from '../templates/CmsPage';
import { BlogPostPage } from '../templates/BlogPost';
import type { Env, Category, Product, CmsPage, StoreConfig, StorefrontStore } from '../types';

// Mirrors the AppEnv in index.tsx (Bindings + per-request Variables) so the
// injected `app` is fully typed — c.env is Env, not unknown.
type AppEnv = { Bindings: Env; Variables: { devSession?: DevSession; wantsMarkdown?: boolean } };

export interface UrlResolverDeps {
  createStore: (env: Env, timer?: ReturnType<typeof createDevTimer> | null) => ContentStore;
  getStoreContext: (c: any) => Promise<{ stores: StorefrontStore[]; currentStoreCode: string | undefined }>;
  getStoreData: (
    store: ContentStore,
    storeCode?: string,
    origin?: string,
  ) => Promise<{ config: StoreConfig; categories: Category[] }>;
  buildDevData: (
    c: any,
    timer: ReturnType<typeof createDevTimer>,
    storeCode: string | undefined,
    pageConfig: string | null,
    themeName: string,
  ) => DevData | null;
  createApiClient: (env: Env, stores: StorefrontStore[], storeCode?: string) => MahoApiClient;
  getSidebarBlocks: (
    store: ContentStore,
    pageType: string,
    storeCode?: string,
  ) => Promise<{ left: string | null; right: string | null }>;
  check404RateLimit: (ip: string) => Promise<boolean>;
  increment404Count: (ip: string, ctx: ExecutionContext) => void;
  getClientIP: (c: any) => string;
  withEdgeCache: (ttlSeconds: number) => any;
  cacheCategory: number;
  cacheProduct: number;
}

export function registerUrlResolverRoutes(app: Hono<AppEnv>, deps: UrlResolverDeps): void {
  const {
    createStore, getStoreContext, getStoreData, buildDevData, createApiClient,
    getSidebarBlocks, check404RateLimit, increment404Count, getClientIP,
    withEdgeCache, cacheCategory, cacheProduct,
  } = deps;

  // ====== URL RESOLVER (must be last) ======

  // Subcategory URLs: /men/new-arrivals, /women/shirts etc. (edge cached 2 hours)
  app.get('/:parent/:child', withEdgeCache(cacheCategory), async (c) => {
    const devSession = c.get('devSession') as DevSession | undefined;
    const timer = devSession ? createDevTimer() : null;
    const store = createStore(c.env, timer);
    const { stores, currentStoreCode } = await getStoreContext(c);
    const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
    const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
    const parentSlug = c.req.param('parent');
    const childSlug = c.req.param('child');
    const urlPath = `${parentSlug}/${childSlug}`;

    // Check if this is a filter page (e.g. /racquets/wilson → brand page)
    const filterPage = await resolveFilterPage(store, prefix, parentSlug, childSlug);
    if (filterPage) {
      // Find category by URL key (parentSlug) — more reliable than categoryId which may differ across store views
      const filterCategory = categories.find(cat => cat.urlKey === parentSlug)
        ?? categories.flatMap(cat => cat.children || []).find(cat => cat.urlKey === parentSlug);
      if (filterCategory) {
        const fpCategoryId = filterCategory.id!;
        const fpPage = parseInt(c.req.query('page') ?? '1', 10);
        const fpItemsPerPage = 12;
        const fpProductsData = await store.get<{ products: Product[]; totalItems: number }>(`${prefix}products:category:${fpCategoryId}:page:${fpPage}`);
        const fpProducts = fpProductsData?.products?.slice(0, fpItemsPerPage) ?? [];
        const fpTotalItems = fpProductsData?.totalItems ?? 0;
        const fpTotalPages = Math.ceil(fpTotalItems / fpItemsPerPage);
        const fpParentCategory = categories.find(cat => cat.children?.some(ch => ch.id === fpCategoryId)) ?? null;
        const fpDevData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
        const fpMenuData = await getMenuData(store, prefix, fpCategoryId);

        return c.html(
          <FilterPage
            config={config}
            categories={categories}
            category={filterCategory}
            filterPage={filterPage}
            products={fpProducts}
            currentPage={fpPage}
            totalPages={fpTotalPages}
            totalItems={fpTotalItems}
            parentCategory={fpParentCategory}
            menuData={fpMenuData}
            stores={stores}
            currentStoreCode={currentStoreCode}
            devData={fpDevData}
          />
        );
      }
    }

    const category = await store.get<Category>(`${prefix}category:${urlPath}`) ?? await store.get<Category>(`${prefix}category:${childSlug}`);
    const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
    if (!category) {
      return c.html(
        <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
          <Seo title={`Not Found | ${config.storeName}`} />
          <div class="not-found"><h1>Page Not Found</h1><p>The page you're looking for doesn't exist.</p><a href="/">Go Home</a></div>
        </Layout>,
        404
      );
    }

    const page = parseInt(c.req.query('page') ?? '1', 10);
    const itemsPerPage = 12;
    const productsData = await store.get<{ products: Product[]; totalItems: number }>(`${prefix}products:category:${category.id}:page:${page}`);
    const products = productsData?.products?.slice(0, itemsPerPage) ?? [];
    const totalItems = productsData?.totalItems ?? 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Find parent category for breadcrumbs
    const parentCategory = categories.find(c => c.urlKey === parentSlug) ?? null;

    // Convention-based CMS block: {category-urlKey}-featured
    const featuredBlockId = `${category.urlKey}-featured`;
    const featuredBlock = await store.get<{ content: string }>(`${prefix}block:${featuredBlockId}`);

    // Menu data for filter page navigation (brand clicks → SEO URLs)
    const catMenuData = category.id ? await getMenuData(store, prefix, category.id) : null;

    return c.html(
      <CategoryPage
        config={config}
        categories={categories}
        category={category}
        products={products}
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        parentCategory={parentCategory}
        stores={stores}
        currentStoreCode={currentStoreCode}
        featuredBlockHtml={featuredBlock?.content ?? null}
        menuData={catMenuData}
        devData={devData}
      />
    );
  });

  // Clean URLs: /women → category, /geometric-candle-holders → product, /about → CMS page
  // Nested category URLs (e.g., /pickleballs-court-gear/pickleball-balls.html)
  app.get('/:parent/:child', withEdgeCache(cacheProduct), async (c) => {
    const parentSlug = c.req.param('parent').replace(/\.html$/, '');
    const childSlug = c.req.param('child').replace(/\.html$/, '');
    const fullPath = `${parentSlug}/${childSlug}`;
    const fullPathHtml = `${fullPath}.html`;

    const store = createStore(c.env);
    const { stores, currentStoreCode } = await getStoreContext(c);
    const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
    const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
    const devData = (c.get('devSession') as DevSession | undefined)?.preview ? null : null;

    // Find the child category by matching urlPath
    let childCategory: Category | undefined;
    for (const cat of categories) {
      if (cat.children) {
        childCategory = cat.children.find(ch => ch.urlPath === fullPath || ch.urlPath === fullPathHtml || ch.urlKey === childSlug);
        if (childCategory) break;
      }
    }

    // Also try KV lookup with the full path as key
    if (!childCategory) {
      childCategory = await store.get<Category>(`${prefix}category:${fullPath}`) ?? undefined;
    }

    if (childCategory && childCategory.id != null) {
      const childId = childCategory.id;
      const page = parseInt(c.req.query('page') ?? '1', 10);
      const itemsPerPage = 12;
      let productsData = await store.get<{ products: Product[]; totalItems: number }>(`${prefix}products:category:${childId}:page:${page}`);
      if (!productsData) {
        const apiClient = createApiClient(c.env, stores, currentStoreCode);
        productsData = await apiClient.fetchCategoryProducts(childId, page, itemsPerPage);
        if (productsData.products.length > 0) {
          c.executionCtx.waitUntil(store.put(`${prefix}products:category:${childCategory.id}:page:${page}`, productsData, 86400));
        }
      }
      const products = productsData?.products?.slice(0, itemsPerPage) ?? [];
      const totalItems = productsData?.totalItems ?? 0;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const parentCategory = categories.find(cat => cat.children?.some(ch => ch.id === childCategory!.id)) ?? null;

      const childMenuData = childCategory.id ? await getMenuData(store, prefix, childCategory.id) : null;
      return c.html(
        <CategoryPage config={config} categories={categories} category={childCategory} products={products}
          currentPage={page} totalPages={totalPages} totalItems={totalItems}
          parentCategory={parentCategory} menuData={childMenuData}
          stores={stores} currentStoreCode={currentStoreCode} devData={devData} />
      );
    }

    return c.text('Not Found', 404);
  });

  // Edge cached 4 hours (product TTL — most common hit; categories/CMS also benefit)
  // Uses URL resolver API as fallback when KV is empty
  app.get('/:slug', withEdgeCache(cacheProduct), async (c) => {
    const clientIP = getClientIP(c);

    // Check rate limit - block IPs that repeatedly hit 404s
    if (await check404RateLimit(clientIP)) {
      return c.text('Too Many Requests', 429);
    }

    const devSession = c.get('devSession') as DevSession | undefined;
    const timer = devSession ? createDevTimer() : null;
    const store = createStore(c.env, timer);
    const { stores, currentStoreCode } = await getStoreContext(c);
    const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
    const slug = c.req.param('slug').replace(/\.html$/, '');

    // Fetch store data AND all possible entity types in ONE parallel batch.
    // This reduces 3 sequential KV round trips to 1.
    const [storeData, kvCategory, kvProduct, kvCms, kvCmsUnprefixed, kvBlog] = await Promise.all([
      getStoreData(store, currentStoreCode, new URL(c.req.url).origin),
      store.get<Category>(`${prefix}category:${slug}`),
      store.get<Product>(`${prefix}product:${slug}`),
      store.get<CmsPage>(`${prefix}cms:${slug}`),
      prefix ? store.get<CmsPage>(`cms:${slug}`) : Promise.resolve(null),
      store.get<CmsPage>(`${prefix}blog:${slug}`),
    ]);

    const { config, categories } = storeData;
    const apiClient = createApiClient(c.env, stores, currentStoreCode);
    const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;

    const wantsMd = c.get('wantsMarkdown') as boolean | undefined;

    // Helper to render category page
    const renderCategory = async (category: Category) => {
      if (category.id == null) return c.notFound();
      const categoryId = category.id;
      const page = parseInt(c.req.query('page') ?? '1', 10);
      const itemsPerPage = 12;
      let productsData = await store.get<{ products: Product[]; totalItems: number }>(`${prefix}products:category:${categoryId}:page:${page}`);

      // If no products in KV, fetch from API
      if (!productsData) {
        productsData = await apiClient.fetchCategoryProducts(categoryId, page, itemsPerPage);
        if (productsData.products.length > 0) {
          c.executionCtx.waitUntil(store.put(`${prefix}products:category:${category.id}:page:${page}`, productsData, 86400));
        }
      }

      const products = productsData?.products?.slice(0, itemsPerPage) ?? [];
      const totalItems = productsData?.totalItems ?? 0;
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      if (wantsMd) {
        const { categoryToMarkdown, markdownResponse } = await import('../agents/markdown');
        return markdownResponse(c, categoryToMarkdown(category, products, config, new URL(c.req.url).origin));
      }

      let parentCategory: Category | null = null;
      if (category.level > 2) {
        parentCategory = categories.find(c => c.children?.some(ch => ch.id === category.id)) ?? null;
      }

      // Convention-based CMS block: {category-urlKey}-featured
      const featuredBlockId = `${category.urlKey}-featured`;
      const featuredBlock = await store.get<{ content: string }>(`${prefix}block:${featuredBlockId}`);
      const slugMenuData = category.id ? await getMenuData(store, prefix, category.id) : null;

      return c.html(
        <CategoryPage
          config={config} categories={categories} category={category} products={products}
          currentPage={page} totalPages={totalPages} totalItems={totalItems}
          parentCategory={parentCategory} stores={stores} currentStoreCode={currentStoreCode}
          featuredBlockHtml={featuredBlock?.content ?? null}
          menuData={slugMenuData}
          devData={devData}
        />
      );
    };

    // Helper to render product page
    const renderProduct = async (product: Product) => {
      product = normalizeProduct(product);
      let productCategory: Category | null = null;
      const productCatId = product.categoryIds?.[0];
      if (productCatId) {
        for (const cat of categories) {
          if (cat.id === productCatId) { productCategory = cat; break; }
          const child = cat.children?.find(ch => ch.id === productCatId);
          if (child) { productCategory = child; break; }
        }
      }
      // Sanitize descriptions — strip unprocessed Magento directives ({{widget ...}}, etc.)
      if (product.description) product.description = rewriteContentUrls(product.description);
      if (product.shortDescription) product.shortDescription = rewriteContentUrls(product.shortDescription);

      if (wantsMd) {
        const { productToMarkdown, markdownResponse } = await import('../agents/markdown');
        return markdownResponse(c, productToMarkdown(product, config, new URL(c.req.url).origin));
      }

      return c.html(<ProductPage config={config} categories={categories} product={product} productCategory={productCategory} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
    };

    // ---- PHASE 1: Try KV cache first (fast path) ----
    // All lookups were fetched in parallel above alongside getStoreData().

    if (kvCategory) return renderCategory(kvCategory);

    if (kvProduct && kvProduct.urlKey === slug) {
      // Category-listing responses drop type-specific child arrays (variants,
      // grouped children, bundle options, downloadable links, giftcard config).
      // Detect the stub and pull the full record on demand.
      const isListingStub =
        (kvProduct.type === 'configurable' && (!kvProduct.configurableOptions || kvProduct.configurableOptions.length === 0))
        || (kvProduct.type === 'grouped' && (!kvProduct.groupedProducts || kvProduct.groupedProducts.length === 0))
        || (kvProduct.type === 'bundle' && (!kvProduct.bundleOptions || kvProduct.bundleOptions.length === 0))
        || (kvProduct.type === 'downloadable' && (!kvProduct.downloadableLinks || kvProduct.downloadableLinks.length === 0))
        || (kvProduct.type === 'giftcard' && !kvProduct.giftcardType);
      if (isListingStub && kvProduct.id) {
        try {
          const fullProduct = await apiClient.fetchProductById(kvProduct.id);
          if (fullProduct) {
            c.executionCtx.waitUntil(store.put(`${prefix}product:${slug}`, fullProduct, 86400));
            return renderProduct(fullProduct);
          }
        } catch { /* fall through to render listing version */ }
      }
      return renderProduct(kvProduct);
    }

    const resolvedCmsPage = kvCms ?? kvCmsUnprefixed;
    if (resolvedCmsPage) {
      if (wantsMd) {
        const { cmsPageToMarkdown, markdownResponse } = await import('../agents/markdown');
        return markdownResponse(c, cmsPageToMarkdown(resolvedCmsPage, new URL(c.req.url).origin));
      }
      const needsSidebars = resolvedCmsPage.pageLayout && !['one_column', 'empty', 'minimal'].includes(resolvedCmsPage.pageLayout);
      const cmsSidebars = needsSidebars ? await getSidebarBlocks(store, 'cms', currentStoreCode) : { left: null, right: null };
      return c.html(<CmsPageTemplate config={config} categories={categories} page={resolvedCmsPage} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={cmsSidebars.left} sidebarRight={cmsSidebars.right} devData={devData} />);
    }

    if (kvBlog) {
      return c.html(<BlogPostPage config={config} categories={categories} post={kvBlog} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={null} sidebarRight={null} devData={devData} />);
    }

    // ---- PHASE 2: KV miss — use URL resolver API to determine type ----

    const resolved = await apiClient.resolveUrl(slug);

    if (resolved) {
      // Fetch full entity based on type and cache in KV
      if (resolved.type === 'category') {
        const fullCategory = await apiClient.fetchCategoryById(resolved.id);
        if (fullCategory) {
          c.executionCtx.waitUntil(store.put(`${prefix}category:${slug}`, fullCategory, 86400));
          return renderCategory(fullCategory);
        }
      }

      if (resolved.type === 'product') {
        const fullProduct = await apiClient.fetchProductById(resolved.id);
        if (fullProduct) {
          c.executionCtx.waitUntil(store.put(`${prefix}product:${slug}`, fullProduct, 86400));
          return renderProduct(fullProduct);
        }
      }

      if (resolved.type === 'cms_page') {
        const fullCms = await apiClient.fetchCmsPage(resolved.identifier);
        if (fullCms) {
          c.executionCtx.waitUntil(store.put(`${prefix}cms:${slug}`, fullCms, 86400));
          const needsSidebars = fullCms.pageLayout && !['one_column', 'empty', 'minimal'].includes(fullCms.pageLayout);
          const cmsSidebars = needsSidebars ? await getSidebarBlocks(store, 'cms', currentStoreCode) : { left: null, right: null };
          return c.html(<CmsPageTemplate config={config} categories={categories} page={fullCms} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={cmsSidebars.left} sidebarRight={cmsSidebars.right} devData={devData} />);
        }
      }

      if (resolved.type === 'blog_post') {
        const fullBlog = await apiClient.fetchBlogPost(resolved.identifier);
        if (fullBlog) {
          c.executionCtx.waitUntil(store.put(`${prefix}blog:${slug}`, fullBlog as unknown as CmsPage, 86400));
          return c.html(<BlogPostPage config={config} categories={categories} post={fullBlog as unknown as CmsPage} stores={stores} currentStoreCode={currentStoreCode} sidebarLeft={null} sidebarRight={null} devData={devData} />);
        }
      }

      if (resolved.type === 'redirect' && resolved.redirectUrl) {
        return c.redirect(resolved.redirectUrl, 301);
      }
    }

    // ---- PHASE 3: 404 — track for rate limiting ----

    increment404Count(clientIP, c.executionCtx);

    return c.html(
      <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
        <Seo title={`Not Found | ${config.storeName}`} />
        <div class="not-found"><h1>Page Not Found</h1><p>The page you're looking for doesn't exist.</p><a href="/">Go Home</a></div>
      </Layout>,
      404
    );
  });
}
