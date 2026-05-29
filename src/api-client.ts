/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Product, Category, StoreConfig, CmsPage, Country, BlogPost, BlogCategory } from './types';

/**
 * Normalize object-keyed collection fields (e.g. mediaGallery) into arrays.
 * Safe to call on already-normalized products.
 */
export function normalizeProduct(product: Product): Product {
  if (!product) return product;
  const mg: any = (product as any).mediaGallery;
  if (mg && typeof mg === 'object' && !Array.isArray(mg)) {
    const arr = Object.values(mg) as Array<{ url: string; label: string | null; position: number }>;
    arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    (product as any).mediaGallery = arr;
  } else if (mg == null) {
    (product as any).mediaGallery = [];
  }
  return product;
}

export interface SearchSuggestResponse {
  products: Array<{
    id: number;
    sku: string;
    name: string;
    urlKey: string;
    price: number;
    finalPrice: number;
    thumbnailUrl: string | null;
    score?: number;
  }>;
  totalItems: number;
  categories: Array<{ id?: number; name: string; urlKey: string }>;
  blogPosts: Array<{ title: string; urlKey: string }>;
  cmsPages: Array<{ id?: number; title: string; identifier: string }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

export class MahoApiClient {
  private baseUrl: string;
  private storeCode?: string;
  private basicAuth?: string;
  private workerAuth?: string;

  constructor(baseUrl: string, storeCode?: string, basicAuth?: string, workerAuth?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.storeCode = storeCode;
    this.basicAuth = basicAuth;
    this.workerAuth = workerAuth;
  }

  private async fetch<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Accept': 'application/ld+json',
    };
    if (this.workerAuth) {
      headers['X-Worker-Auth'] = this.workerAuth;
    }
    if (this.storeCode) {
      headers['X-Store-Code'] = this.storeCode;
    }
    if (this.basicAuth) {
      headers['Authorization'] = `Basic ${btoa(this.basicAuth)}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${url}`);
    }
    return response.json() as Promise<T>;
  }

  private async fetchCollection<T>(path: string): Promise<T[]> {
    const data = await this.fetch<{ member: T[]; totalItems?: number }>(path);
    return data.member ?? [];
  }

  private async fetchPaginated<T>(path: string): Promise<PaginatedResponse<T>> {
    const data = await this.fetch<{ member: T[]; totalItems: number }>(path);
    const items = data.member ?? [];
    const totalItems = data.totalItems ?? 0;
    // Parse page and itemsPerPage from the URL
    const url = new URL(path, 'http://dummy');
    const currentPage = parseInt(url.searchParams.get('page') ?? '1', 10);
    const itemsPerPage = parseInt(url.searchParams.get('itemsPerPage') ?? url.searchParams.get('pageSize') ?? '20', 10);
    return {
      items,
      totalItems,
      currentPage,
      itemsPerPage,
      totalPages: itemsPerPage > 0 ? Math.ceil(totalItems / itemsPerPage) : 1,
    };
  }

  /**
   * Fetch all pages of a collection. Use for batch loads where you need every item.
   * Automatically follows pagination until all items are retrieved.
   */
  private async fetchAllPages<T>(basePath: string, itemsPerPage: number = 100): Promise<T[]> {
    const separator = basePath.includes('?') ? '&' : '?';
    const firstPage = await this.fetchPaginated<T>(`${basePath}${separator}page=1&itemsPerPage=${itemsPerPage}`);
    const allItems = [...firstPage.items];

    if (firstPage.totalPages <= 1) {
      return allItems;
    }

    // Fetch remaining pages in parallel
    const pagePromises: Promise<T[]>[] = [];
    for (let page = 2; page <= firstPage.totalPages; page++) {
      pagePromises.push(
        this.fetchCollection<T>(`${basePath}${separator}page=${page}&itemsPerPage=${itemsPerPage}`)
      );
    }
    const remainingPages = await Promise.all(pagePromises);
    for (const pageItems of remainingPages) {
      allItems.push(...pageItems);
    }

    return allItems;
  }

  async fetchStoreConfig(): Promise<StoreConfig> {
    return this.fetch<StoreConfig>('/api/rest/v2/store-config');
  }

  async fetchCategories(): Promise<Category[]> {
    // Fetch all active categories that are in menu (auto-paginates if >100)
    return this.fetchAllPages<Category>('/api/rest/v2/categories?isActive=1&includeInMenu=1&order[position]=asc', 100);
  }

  async fetchCategory(urlKey: string): Promise<Category | null> {
    const results = await this.fetchCollection<Category>(`/api/rest/v2/categories?urlKey=${encodeURIComponent(urlKey)}`);
    return results[0] ?? null;
  }

  async fetchCategoryById(id: number): Promise<Category> {
    return this.fetch<Category>(`/api/rest/v2/categories/${id}`);
  }

  async fetchCategoryProducts(categoryId: number, page: number = 1, itemsPerPage: number = 24): Promise<{ products: Product[]; totalItems: number }> {
    const data = await this.fetch<{ member: Product[]; totalItems: number }>(
      `/api/rest/v2/products?categoryId=${categoryId}&order[position]=asc&page=${page}&itemsPerPage=${itemsPerPage}`
    );
    return {
      products: data.member ?? [],
      totalItems: data.totalItems ?? 0,
    };
  }

  async fetchProduct(urlKey: string): Promise<Product | null> {
    const results = await this.fetchCollection<Product>(`/api/rest/v2/products?urlKey=${encodeURIComponent(urlKey)}`);
    // Validate the API returned the correct product (not a random one)
    const matches = results.filter(p => p.urlKey === urlKey);
    if (matches.length === 0) return null;
    // Prefer configurable over simple when multiple products share a url_key
    const best = matches.find(p => p.type === 'configurable') ?? matches[0];
    // Fetch full detail (collection doesn't include variants, options, etc.)
    const full = await this.fetch<Product>(`/api/rest/v2/products/${best.id}`);
    return this.normalizeProduct(full);
  }

  async fetchProductById(id: number): Promise<Product> {
    const full = await this.fetch<Product>(`/api/rest/v2/products/${id}`);
    return this.normalizeProduct(full);
  }

  async fetchProductBySku(sku: string): Promise<Product | null> {
    const data = await this.fetch<{ member: Product[] }>(`/api/rest/v2/products?search=${encodeURIComponent(sku)}&itemsPerPage=5`);
    // search is fuzzy — find exact SKU match
    const product = data.member?.find(p => p.sku === sku);
    if (!product) return null;
    // Fetch full detail with variants/options
    const full = await this.fetch<Product>(`/api/rest/v2/products/${product.id}`);
    return this.normalizeProduct(full);
  }

  private normalizeProduct(product: Product): Product {
    return normalizeProduct(product);
  }

  async fetchAllProductsFull(page: number = 1, itemsPerPage: number = 50): Promise<{ products: Product[]; totalItems: number }> {
    const data = await this.fetch<{ member: Product[]; totalItems: number }>(
      `/api/rest/v2/products?fullDetail=1&page=${page}&itemsPerPage=${itemsPerPage}`
    );
    return {
      products: data.member ?? [],
      totalItems: data.totalItems ?? 0,
    };
  }

  async fetchAllProducts(page: number = 1, itemsPerPage: number = 30): Promise<{ products: Product[]; totalItems: number }> {
    const data = await this.fetch<{ member: Product[]; totalItems: number }>(
      `/api/rest/v2/products?page=${page}&itemsPerPage=${itemsPerPage}`
    );
    return {
      products: data.member ?? [],
      totalItems: data.totalItems ?? 0,
    };
  }

  async fetchCmsPage(identifier: string): Promise<CmsPage | null> {
    const results = await this.fetchCollection<CmsPage>(`/api/rest/v2/cms-pages?identifier=${encodeURIComponent(identifier)}`);
    return results[0] ?? null;
  }

  async fetchCountries(): Promise<Country[]> {
    return this.fetchAllPages<Country>('/api/rest/v2/countries', 300);
  }

  async fetchBlogPosts(): Promise<BlogPost[]> {
    return this.fetchAllPages<BlogPost>('/api/rest/v2/blog-posts?order[publishDate]=desc', 50);
  }

  async fetchBlogCategories(): Promise<BlogCategory[]> {
    return this.fetchAllPages<BlogCategory>('/api/rest/v2/blog-categories', 100);
  }

  async fetchAllCmsPages(): Promise<CmsPage[]> {
    return this.fetchAllPages<CmsPage>('/api/rest/v2/cms-pages', 100);
  }

  async searchProducts(query: string, page: number = 1, itemsPerPage: number = 24): Promise<{ products: Product[]; totalItems: number }> {
    const data = await this.fetch<{ member: Product[]; totalItems: number }>(
      `/api/rest/v2/products?search=${encodeURIComponent(query)}&page=${page}&itemsPerPage=${itemsPerPage}`
    );
    return {
      products: data.member ?? [],
      totalItems: data.totalItems ?? 0,
    };
  }

  /**
   * Search via Lucene backend — returns products, categories, and CMS pages in one call.
   * Requires the mageaustralia/maho-search module installed on the backend.
   */
  async searchSuggestLucene(query: string, limit: number = 10): Promise<SearchSuggestResponse> {
    const data = await this.fetch<SearchSuggestResponse>(
      `/api/rest/v2/search/suggest?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return {
      products: data.products ?? [],
      totalItems: data.totalItems ?? 0,
      categories: data.categories ?? [],
      blogPosts: data.blogPosts ?? [],
      cmsPages: data.cmsPages ?? [],
    };
  }

  /**
   * Resolve a URL path to its entity type and ID
   * Returns null if not found or on error
   */
  async resolveUrl(path: string): Promise<{ type: string; id: number; identifier: string } | null> {
    try {
      const results = await this.fetchCollection<{ type: string; id: number; identifier: string }>(
        `/api/rest/v2/url-resolver?path=${encodeURIComponent(path)}`
      );
      const result = results[0];
      if (!result || result.type === 'not_found') return null;
      return result;
    } catch {
      return null;
    }
  }

  async fetchCmsBlock(identifier: string): Promise<{ identifier: string; content: string } | null> {
    const results = await this.fetchCollection<{ identifier: string; content: string }>(`/api/rest/v2/cms-blocks?identifier=${encodeURIComponent(identifier)}`);
    return results[0] ?? null;
  }

  async fetchBlogPost(identifier: string): Promise<BlogPost | null> {
    const results = await this.fetchCollection<BlogPost>(`/api/rest/v2/blog-posts?urlKey=${encodeURIComponent(identifier)}`);
    return results[0] ?? null;
  }

  /**
   * Fetch FAQ items for a given category URL key.
   * Hits the FAQ module's REST endpoint: GET /api/rest/v2/faqs?category=<encoded>.
   * Returns [] gracefully on any error or non-ok response (endpoint may not be live yet).
   */
  async fetchFaqs(categoryUrlKey: string): Promise<{ id: number; question: string; answer: string; position: number }[]> {
    try {
      type FaqMember = { id: number; question: string; answer: string; position: number };
      const data = await this.fetch<{ member?: FaqMember[] } | FaqMember[]>(
        `/api/rest/v2/faqs?category=${encodeURIComponent(categoryUrlKey)}`
      );
      let members: FaqMember[];
      if (Array.isArray(data)) {
        members = data;
      } else {
        members = (data as { member?: FaqMember[] }).member ?? [];
      }
      return members
        .filter((f) => f && typeof f.question === 'string')
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    } catch {
      return [];
    }
  }
}