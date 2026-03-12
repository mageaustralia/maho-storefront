/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Product, Category, StoreConfig, CmsPage, Country, BlogPost, BlogCategory } from './types';

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

  constructor(baseUrl: string, storeCode?: string, basicAuth?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.storeCode = storeCode;
    this.basicAuth = basicAuth;
  }

  private async fetch<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Accept': 'application/ld+json',
      'X-Worker-Auth': 'maho-storefront-sync-626538104ee3e0ef',
    };
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
    return this.fetch<StoreConfig>('/api/store-config');
  }

  async fetchCategories(): Promise<Category[]> {
    // Fetch all active categories that are in menu (auto-paginates if >100)
    return this.fetchAllPages<Category>('/api/categories?isActive=1&includeInMenu=1&order[position]=asc', 100);
  }

  async fetchCategory(urlKey: string): Promise<Category | null> {
    const results = await this.fetchCollection<Category>(`/api/categories?urlKey=${encodeURIComponent(urlKey)}`);
    return results[0] ?? null;
  }

  async fetchCategoryById(id: number): Promise<Category> {
    return this.fetch<Category>(`/api/categories/${id}`);
  }

  async fetchCategoryProducts(categoryId: number, page: number = 1, itemsPerPage: number = 24): Promise<{ products: Product[]; totalItems: number }> {
    const data = await this.fetch<{ member: Product[]; totalItems: number }>(
      `/api/products?categoryId=${categoryId}&order[position]=asc&page=${page}&itemsPerPage=${itemsPerPage}`
    );
    return {
      products: data.member ?? [],
      totalItems: data.totalItems ?? 0,
    };
  }

  async fetchProduct(urlKey: string): Promise<Product | null> {
    const results = await this.fetchCollection<Product>(`/api/products?urlKey=${encodeURIComponent(urlKey)}`);
    // Validate the API returned the correct product (not a random one)
    const matches = results.filter(p => p.urlKey === urlKey);
    if (matches.length === 0) return null;
    // Prefer configurable over simple when multiple products share a url_key
    const best = matches.find(p => p.type === 'configurable') ?? matches[0];
    // Fetch full detail (collection doesn't include variants, options, etc.)
    return this.fetch<Product>(`/api/products/${best.id}`);
  }

  async fetchProductById(id: number): Promise<Product> {
    return this.fetch<Product>(`/api/products/${id}`);
  }

  async fetchProductBySku(sku: string): Promise<Product | null> {
    const data = await this.fetch<{ member: Product[] }>(`/api/products?search=${encodeURIComponent(sku)}&itemsPerPage=5`);
    // search is fuzzy — find exact SKU match
    const product = data.member?.find(p => p.sku === sku);
    if (!product) return null;
    // Fetch full detail with variants/options
    return this.fetch<Product>(`/api/products/${product.id}`);
  }

  async fetchAllProductsFull(page: number = 1, itemsPerPage: number = 50): Promise<{ products: Product[]; totalItems: number }> {
    const data = await this.fetch<{ member: Product[]; totalItems: number }>(
      `/api/products?fullDetail=1&page=${page}&itemsPerPage=${itemsPerPage}`
    );
    return {
      products: data.member ?? [],
      totalItems: data.totalItems ?? 0,
    };
  }

  async fetchAllProducts(page: number = 1, itemsPerPage: number = 30): Promise<{ products: Product[]; totalItems: number }> {
    const data = await this.fetch<{ member: Product[]; totalItems: number }>(
      `/api/products?page=${page}&itemsPerPage=${itemsPerPage}`
    );
    return {
      products: data.member ?? [],
      totalItems: data.totalItems ?? 0,
    };
  }

  async fetchCmsPage(identifier: string): Promise<CmsPage | null> {
    const results = await this.fetchCollection<CmsPage>(`/api/cms-pages?identifier=${encodeURIComponent(identifier)}`);
    return results[0] ?? null;
  }

  async fetchCountries(): Promise<Country[]> {
    return this.fetchAllPages<Country>('/api/countries', 300);
  }

  async fetchBlogPosts(): Promise<BlogPost[]> {
    return this.fetchAllPages<BlogPost>('/api/blog-posts?order[publishDate]=desc', 50);
  }

  async fetchBlogCategories(): Promise<BlogCategory[]> {
    return this.fetchAllPages<BlogCategory>('/api/blog-categories', 100);
  }

  async fetchAllCmsPages(): Promise<CmsPage[]> {
    return this.fetchAllPages<CmsPage>('/api/cms-pages', 100);
  }

  async searchProducts(query: string, page: number = 1, itemsPerPage: number = 24): Promise<{ products: Product[]; totalItems: number }> {
    const data = await this.fetch<{ member: Product[]; totalItems: number }>(
      `/api/products?search=${encodeURIComponent(query)}&page=${page}&itemsPerPage=${itemsPerPage}`
    );
    return {
      products: data.member ?? [],
      totalItems: data.totalItems ?? 0,
    };
  }

  /**
   * Resolve a URL path to its entity type and ID
   * Returns null if not found or on error
   */
  async resolveUrl(path: string): Promise<{ type: string; id: number; identifier: string } | null> {
    try {
      const results = await this.fetchCollection<{ type: string; id: number; identifier: string }>(
        `/api/url-resolver?path=${encodeURIComponent(path)}`
      );
      const result = results[0];
      if (!result || result.type === 'not_found') return null;
      return result;
    } catch {
      return null;
    }
  }

  async fetchCmsBlock(identifier: string): Promise<{ identifier: string; content: string } | null> {
    const results = await this.fetchCollection<{ identifier: string; content: string }>(`/api/cms-blocks?identifier=${encodeURIComponent(identifier)}`);
    return results[0] ?? null;
  }

  async fetchBlogPost(identifier: string): Promise<BlogPost | null> {
    const results = await this.fetchCollection<BlogPost>(`/api/blog-posts?urlKey=${encodeURIComponent(identifier)}`);
    return results[0] ?? null;
  }
}