/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Data-sync routes — POST /sync (full) and POST /sync/:type (partial). These
 * pull content from the Maho backend into KV. Extracted from index.tsx via
 * registerSyncRoutes; the core helpers (auth, store registry, API client) are
 * injected. The per-entity ETL that's shared between full and partial sync
 * lives in ./entities (syncCategories); plugin sync hooks (Stripe, filterable
 * pages) are imported from their plugin directories.
 */

import type { Hono } from 'hono';
import { CloudflareKVStore } from '../content-store';
import { MahoApiClient } from '../api-client';
import { syncCategories } from './entities';
import { syncStripeConfig } from '../plugins/stripe';
import { syncBraintreeConfig } from '../plugins/braintree';
import { FilterablePagesApi, syncFilterablePages } from '../plugins/filterable-pages';
import type { Env, StorefrontStore, Category, Product, CmsPage } from '../types';

export interface SyncRouteDeps {
  checkSyncAuth: (c: any) => boolean;
  getStoreRegistry: (env: Env) => Promise<StorefrontStore[]>;
  createApiClient: (env: Env, stores: StorefrontStore[], storeCode?: string) => MahoApiClient;
  getApiUrl: (env: Env, stores: StorefrontStore[], storeCode?: string) => string;
}

export function registerSyncRoutes(app: Hono<any>, deps: SyncRouteDeps): void {
  const { checkSyncAuth, getStoreRegistry, createApiClient, getApiUrl } = deps;

  app.post('/sync', async (c) => {
    if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

    const store = new CloudflareKVStore(c.env.CONTENT);
    const results: Record<string, string> = {};
    const allSyncedCategories: Array<{ urlKey?: string; urlPath?: string }> = [];

    // Get stores to sync
    const stores = await getStoreRegistry(c.env);
    // If single store specified via query param, only sync that one
    const requestedStore = c.req.query('store');
    const storesToSync = requestedStore
      ? stores.filter(s => s.code === requestedStore).map(s => s.code)
      : (stores.length > 0 ? stores.map(s => s.code) : [undefined as unknown as string]);

    for (const storeCode of storesToSync) {
      const prefix = storeCode ? `${storeCode}:` : '';
      const storeApiClient = createApiClient(c.env, stores, storeCode);

      try {
        // 1. Sync store config
        const config = await storeApiClient.fetchStoreConfig();

        // Stripe plugin: pull keys from the Maho backend + register the payment plugin
        await syncStripeConfig({
          apiUrl: getApiUrl(c.env, stores, storeCode),
          storeCode,
          basicAuth: c.env.MAHO_API_BASIC_AUTH,
          syncSecret: c.env.SYNC_SECRET,
          config,
          store,
          prefix,
        });

        // Braintree plugin: register the payment plugin if the backend exposes it (else no-op)
        await syncBraintreeConfig({
          apiUrl: getApiUrl(c.env, stores, storeCode),
          storeCode,
          basicAuth: c.env.MAHO_API_BASIC_AUTH,
          syncSecret: c.env.SYNC_SECRET,
          config,
        });

        // Store Google Maps key from config extensions (injected by Storefront module observer)
        if (config.extensions?.googleMapsKey) {
          await store.put(`${prefix}google:mapsKey`, config.extensions.googleMapsKey as string);
        }

        await store.put(`${prefix}config`, config);
        results[`${storeCode || 'default'}:config`] = 'ok';

        // 2. Sync categories — shared with /sync/:type via syncCategories (src/sync/).
        const categories = await syncCategories(storeApiClient, store, prefix);
        results[`${storeCode || 'default'}:categories`] = `${categories.length} synced`;

        // Footer pages placeholder (populated below after products)

        // 3. Sync category product listings (per store - products vary by website)
        let storeProductCount = 0;
        const allCategories = [...categories];
        for (const cat of categories) {
          if (cat.children) {
            allCategories.push(...cat.children);
          }
        }
        allSyncedCategories.push(...allCategories);

        for (const cat of allCategories) {
          if (!cat.id) continue;
          try {
            const data = await storeApiClient.fetchCategoryProducts(cat.id, 1, 24);
            await store.put(`${prefix}products:category:${cat.id}:page:1`, data);
            storeProductCount += data.products.length;

            // Cache each product individually by urlKey for fast product page loads
            for (const p of data.products) {
              if (p.urlKey) {
                c.executionCtx.waitUntil(store.put(`${prefix}product:${p.urlKey}`, p, 86400));
              }
            }

            const totalPages = Math.ceil(data.totalItems / 24);
            for (let pg = 2; pg <= Math.min(totalPages, 3); pg++) {
              const pageData = await storeApiClient.fetchCategoryProducts(cat.id, pg, 24);
              await store.put(`${prefix}products:category:${cat.id}:page:${pg}`, pageData);
              storeProductCount += pageData.products.length;

              for (const p of pageData.products) {
                if (p.urlKey) {
                  c.executionCtx.waitUntil(store.put(`${prefix}product:${p.urlKey}`, p, 86400));
                }
              }
            }
          } catch (e) {
            results[`${storeCode || 'default'}:category:${cat.id}`] = `error: ${(e as Error).message}`;
          }
        }
        results[`${storeCode || 'default'}:products`] = `${storeProductCount} in category listings`;

        // 4. Sync blog categories + posts (per store)
        try {
          const blogCategories = await storeApiClient.fetchBlogCategories();
          await store.put(`${prefix}blog-categories`, blogCategories);
          results[`${storeCode || 'default'}:blogCategories`] = `${blogCategories.length} synced`;
        } catch (e) {
          results[`${storeCode || 'default'}:blogCategories`] = `error: ${(e as Error).message}`;
        }

        try {
          const blogTimestamp = Math.floor(Date.now() / 1000);
          const blogPosts = await storeApiClient.fetchBlogPosts();
          const summaries = blogPosts.map(p => ({
            identifier: p.urlKey,
            title: p.title,
            shortContent: p.excerpt,
            imageUrl: p.imageUrl,
            createdAt: p.publishDate ?? p.createdAt,
            categoryIds: p.categoryIds ?? [],
          }));
          await store.put(`${prefix}blog-posts`, summaries);
          for (const post of blogPosts) {
            const detail: CmsPage = {
              id: post.id,
              identifier: post.urlKey,
              title: post.title,
              contentHeading: post.title,
              content: post.content,
              imageUrl: post.imageUrl,
              metaKeywords: post.metaKeywords,
              metaDescription: post.metaDescription,
              status: post.status,
              createdAt: post.publishDate ?? post.createdAt,
              updatedAt: post.updatedAt,
              categoryIds: post.categoryIds ?? [],
            };
            (detail as any)._lastChecked = blogTimestamp;
            await store.put(`${prefix}blog:${post.urlKey}`, detail);
          }
          results[`${storeCode || 'default'}:blogPosts`] = `${blogPosts.length} synced`;
        } catch (e) {
          results[`${storeCode || 'default'}:blogPosts`] = `error: ${(e as Error).message}`;
        }

        // 5. Sync CMS pages (per store - pages are assigned to specific stores)
        try {
          const cmsTimestamp = Math.floor(Date.now() / 1000);
          const cmsPages = await storeApiClient.fetchAllCmsPages();
          for (const page of cmsPages) {
            (page as any)._lastChecked = cmsTimestamp;
            await store.put(`${prefix}cms:${page.identifier}`, page);
          }
          const pageList = cmsPages
            .filter(p => p.status === 'enabled' && !['no-route', 'service-unavailable', 'enable-cookies', 'home'].includes(p.identifier))
            .map(p => ({ identifier: p.identifier, title: p.title }));
          await store.put(`${prefix}footer-pages`, pageList);
          results[`${storeCode || 'default'}:cmsPages`] = `${cmsPages.length} synced`;
        } catch (e) {
          results[`${storeCode || 'default'}:cmsPages`] = `error: ${(e as Error).message}`;
        }

        // 5b. Sync sidebar CMS blocks (convention: sidebar-left-{pageType}, sidebar-right-{pageType})
        try {
          const sidebarBlockIds = ['sidebar-left-home', 'sidebar-right-home', 'sidebar-left-cms', 'sidebar-right-cms', 'sidebar-left-blog', 'sidebar-right-blog', 'sidebar-left-category', 'sidebar-right-category'];
          let sidebarCount = 0;
          for (const blockId of sidebarBlockIds) {
            try {
              const block = await storeApiClient.fetchCmsBlock(blockId);
              if (block && block.content) {
                await store.put(`${prefix}block:${blockId}`, { content: block.content });
                sidebarCount++;
              }
            } catch {
              // Block doesn't exist — that's fine, not all page types need sidebars
            }
          }
          results[`${storeCode || 'default'}:sidebarBlocks`] = `${sidebarCount} synced`;
        } catch (e) {
          results[`${storeCode || 'default'}:sidebarBlocks`] = `error: ${(e as Error).message}`;
        }

        // 5c. Sync category featured CMS blocks (convention: {category-urlKey}-featured)
        try {
          const catTree = await store.get<Category[]>(`${prefix}categories`);
          let featuredCount = 0;
          if (catTree) {
            const allCats: Category[] = [];
            const flatten = (cats: Category[]) => { for (const c of cats) { allCats.push(c); if (c.children) flatten(c.children); } };
            flatten(catTree);
            for (const cat of allCats) {
              if (!cat.urlKey || cat.level < 2) continue;
              const blockId = `${cat.urlKey}-featured`;
              try {
                const block = await storeApiClient.fetchCmsBlock(blockId);
                if (block && block.content) {
                  await store.put(`${prefix}block:${blockId}`, { content: block.content });
                  featuredCount++;
                }
              } catch {
                // Block doesn't exist for this category — expected
              }
            }
          }
          results[`${storeCode || 'default'}:featuredBlocks`] = `${featuredCount} synced`;
        } catch (e) {
          results[`${storeCode || 'default'}:featuredBlocks`] = `error: ${(e as Error).message}`;
        }

        // 8. Sync filterable pages (megamenu data + brand pages)
        try {
          const filterApi = new FilterablePagesApi(
            getApiUrl(c.env, stores, storeCode),
            storeCode,
            c.env.MAHO_API_BASIC_AUTH,
            c.env.WORKER_AUTH,
          );
          const filterResult = await syncFilterablePages(filterApi, store, prefix, allCategories);
          results[`${storeCode || 'default'}:filterablePages`] =
            `${filterResult.menuData} menus, ${filterResult.filterPages} pages`;
        } catch { /* FilterablePages module not available — skip */ }

      } catch (e) {
        results[`${storeCode || 'default'}:error`] = (e as Error).message;
      }
    }

    // Sync shared data that doesn't vary by store view
    const defaultApiClient = new MahoApiClient(c.env.MAHO_API_URL, undefined, c.env.MAHO_API_BASIC_AUTH);

    try {

      // 6. Sync countries
      try {
        const countries = await defaultApiClient.fetchCountries();
        await store.put('countries', countries);
        results.countries = `${countries.length} synced`;
      } catch (e) {
        results.countries = `error: ${(e as Error).message}`;
      }

      // 7. Update pulse hash
      const data = new TextEncoder().encode(JSON.stringify({ ts: Date.now() }));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hash = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
      await store.put('pulse', { hash, updatedAt: new Date().toISOString() });
      results.pulse = hash;

      // 8. Purge CF edge cache for this PoP (content just changed)
      try {
        const cache = caches.default;
        const baseUrl = new URL(c.req.url).origin;
        // Purge home page (most important to refresh quickly)
        await cache.delete(new Request(`${baseUrl}/`));
        // Purge category/blog listing pages
        await cache.delete(new Request(`${baseUrl}/blog`));
        for (const cat of allSyncedCategories) {
          if (cat.urlKey) await cache.delete(new Request(`${baseUrl}/${cat.urlKey}`));
          if (cat.urlPath) await cache.delete(new Request(`${baseUrl}/${cat.urlPath}`));
        }
        results.edgeCachePurge = 'ok';
      } catch (e) {
        results.edgeCachePurge = `error: ${(e as Error).message}`;
      }

      return c.json({ status: 'ok', results });
    } catch (e) {
      return c.json({ status: 'error', message: (e as Error).message, results }, 500);
    }
  });

  // Partial sync
  app.post('/sync/:type', async (c) => {
    if (!checkSyncAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

    const type = c.req.param('type');
    const store = new CloudflareKVStore(c.env.CONTENT);
    const requestedStore = c.req.query('store');
    const prefix = requestedStore ? `${requestedStore}:` : '';
    const registeredStores = await getStoreRegistry(c.env);
    const partialApiClient = createApiClient(c.env, registeredStores, requestedStore || undefined);

    try {
      switch (type) {
        case 'config': {
          const config = await partialApiClient.fetchStoreConfig();
          await store.put(`${prefix}config`, config);
          return c.json({ status: 'ok', type: 'config' });
        }
        case 'categories': {
          // Shared with the full /sync via syncCategories (src/sync/) — single
          // source of truth, so the _lastChecked stamping can't drift again.
          const categories = await syncCategories(partialApiClient, store, prefix);
          return c.json({ status: 'ok', type: 'categories', count: categories.length });
        }
        case 'product-details': {
          // Accepts pre-fetched full product data from the origin server
          const body = await c.req.json<{ products: Product[] }>();
          const products = body.products ?? [];
          let count = 0;
          for (const product of products) {
            if (product.urlKey) {
              await store.put(`${prefix}product:${product.urlKey}`, product);
              count++;
            }
          }
          return c.json({ status: 'ok', type: 'product-details', count });
        }
        case 'cms': {
          const cmsTimestamp = Math.floor(Date.now() / 1000);
          const cmsPages = await partialApiClient.fetchAllCmsPages();
          for (const page of cmsPages) {
            (page as any)._lastChecked = cmsTimestamp;
            await store.put(`${prefix}cms:${page.identifier}`, page);
          }
          const pageList = cmsPages
            .filter(p => p.status === 'enabled' && !['no-route', 'service-unavailable', 'enable-cookies', 'home'].includes(p.identifier))
            .map(p => ({ identifier: p.identifier, title: p.title }));
          await store.put(`${prefix}footer-pages`, pageList);
          const baseUrl = new URL(c.req.url).origin;
          await caches.default.delete(new Request(`${baseUrl}/`));
          return c.json({ status: 'ok', type: 'cms', count: cmsPages.length });
        }
        case 'products': {
          // Sync category product listings (same logic as full sync)
          const categories = await partialApiClient.fetchCategories();
          for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            if (cat.id && cat.childrenIds && cat.childrenIds.length > 0) {
              try { categories[i] = await partialApiClient.fetchCategoryById(cat.id); } catch {}
            }
          }
          const allCats = [...categories];
          for (const cat of categories) {
            if (cat.children) allCats.push(...cat.children);
          }
          let productCount = 0;
          for (const cat of allCats) {
            if (!cat.id) continue;
            try {
              const data = await partialApiClient.fetchCategoryProducts(cat.id, 1, 24);
              await store.put(`${prefix}products:category:${cat.id}:page:1`, data);
              productCount += data.products.length;
              const totalPages = Math.ceil(data.totalItems / 24);
              for (let pg = 2; pg <= Math.min(totalPages, 3); pg++) {
                const pageData = await partialApiClient.fetchCategoryProducts(cat.id, pg, 24);
                await store.put(`${prefix}products:category:${cat.id}:page:${pg}`, pageData);
                productCount += pageData.products.length;
              }
            } catch {}
          }
          return c.json({ status: 'ok', type: 'products', count: productCount });
        }
        case 'blog': {
          const blogTimestamp = Math.floor(Date.now() / 1000);
          const blogPosts = await partialApiClient.fetchBlogPosts();
          const summaries = blogPosts.map((p: any) => ({
            identifier: p.urlKey, title: p.title, shortContent: p.excerpt,
            imageUrl: p.imageUrl, createdAt: p.publishDate ?? p.createdAt,
            categoryIds: p.categoryIds ?? [],
          }));
          await store.put(`${prefix}blog-posts`, summaries);
          for (const post of blogPosts) {
            const detail = {
              id: post.id, identifier: post.urlKey, title: post.title,
              contentHeading: post.title, content: post.content,
              imageUrl: post.imageUrl, metaKeywords: post.metaKeywords,
              metaDescription: post.metaDescription, status: post.status,
              createdAt: post.publishDate ?? post.createdAt, updatedAt: post.updatedAt,
              categoryIds: post.categoryIds ?? [],
              _lastChecked: blogTimestamp,
            };
            await store.put(`${prefix}blog:${post.urlKey}`, detail);
          }
          return c.json({ status: 'ok', type: 'blog', count: blogPosts.length });
        }
        case 'countries': {
          const defaultSyncClient = new MahoApiClient(c.env.MAHO_API_URL, undefined, c.env.MAHO_API_BASIC_AUTH);
          const countries = await defaultSyncClient.fetchCountries();
          await store.put('countries', countries);
          return c.json({ status: 'ok', type: 'countries', count: countries.length });
        }
        case 'products-by-id': {
          const body = await c.req.json<{ ids: number[] }>();
          const ids = body.ids ?? [];
          let count = 0;
          const skuIndex = await store.get<Record<string, string>>(`${prefix}sku-index`) ?? {};
          for (const id of ids) {
            try {
              const product = await partialApiClient.fetchProductById(id);
              if (product.urlKey) {
                await store.put(`${prefix}product:${product.urlKey}`, product);
                skuIndex[product.sku] = product.urlKey;
                // Also index variant/child SKUs so cart lookups work
                if (product.variants) {
                  for (const v of product.variants as any[]) {
                    if (v.sku) skuIndex[v.sku] = product.urlKey;
                  }
                }
                count++;
              }
            } catch {}
          }
          await store.put(`${prefix}sku-index`, skuIndex);
          return c.json({ status: 'ok', type: 'products-by-id', count });
        }
        case 'categories-by-id': {
          const catBody = await c.req.json<{ ids: number[] }>();
          const catIds = catBody.ids ?? [];
          let catCount = 0;
          for (const id of catIds) {
            try {
              const cat = await partialApiClient.fetchCategoryById(id);
              if (cat.urlKey) {
                await store.put(`${prefix}category:${cat.urlKey}`, cat);
                catCount++;
              }
              if ((cat as any).urlPath) {
                await store.put(`${prefix}category:${((cat as any).urlPath || '').replace(/\.html$/, '')}`, cat);
              }
            } catch {}
          }
          // Also refresh the full categories list — via syncCategories so the
          // children-preservation guard applies (was a duplicate loop with the
          // same silent-wipe bug).
          await syncCategories(partialApiClient, store, prefix);
          return c.json({ status: 'ok', type: 'categories-by-id', count: catCount });
        }
        case 'filterable-pages': {
          const fpCategories = await partialApiClient.fetchCategories();
          for (let i = 0; i < fpCategories.length; i++) {
            const cat = fpCategories[i];
            if (cat.id && cat.childrenIds && cat.childrenIds.length > 0) {
              try { fpCategories[i] = await partialApiClient.fetchCategoryById(cat.id); } catch {}
            }
          }
          const fpAllCats = [...fpCategories];
          for (const cat of fpCategories) { if (cat.children) fpAllCats.push(...cat.children); }
          const filterApi = new FilterablePagesApi(
            getApiUrl(c.env, registeredStores, requestedStore || undefined),
            requestedStore || undefined,
            c.env.MAHO_API_BASIC_AUTH,
            c.env.WORKER_AUTH,
          );
          const fpResult = await syncFilterablePages(filterApi, store, prefix, fpAllCats);
          return c.json({ status: 'ok', type: 'filterable-pages', ...fpResult });
        }
        default:
          return c.json({ error: `Unknown sync type: ${type}` }, 400);
      }
    } catch (e) {
      return c.json({ status: 'error', message: (e as Error).message }, 500);
    }
  });
}
