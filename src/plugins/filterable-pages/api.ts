/**
 * Maho Storefront — Filterable Pages Plugin
 * API client methods for the FilterablePages Maho module
 */

import type { MenuData, FilterablePage, EnrichedFilter } from './types';

export class FilterablePagesApi {
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
      throw new Error(`FilterablePages API error ${response.status}: ${url}`);
    }
    return response.json() as Promise<T>;
  }

  /**
   * Fetch megamenu data for all top-level categories
   */
  async fetchAllMenuData(): Promise<MenuData[]> {
    const data = await this.fetch<{ member: MenuData[] }>('/api/menu-data');
    return data.member ?? [];
  }

  /**
   * Fetch megamenu data for a single category
   */
  async fetchMenuData(categoryId: number): Promise<MenuData | null> {
    try {
      return await this.fetch<MenuData>(`/api/menu-data/${categoryId}`);
    } catch {
      return null;
    }
  }

  /**
   * Fetch brand/filter page content
   */
  async fetchFilterablePage(
    categoryUrlKey: string,
    optionUrlKey: string,
    attributeCode = 'brand_id',
  ): Promise<FilterablePage | null> {
    const params = new URLSearchParams({
      categoryUrlKey,
      optionUrlKey,
      attributeCode,
    });
    const data = await this.fetch<{ member: FilterablePage[] }>(
      `/api/filterable-pages?${params}`,
    );
    return data.member?.[0] ?? null;
  }

  /**
   * Fetch enriched layered nav filters for a category
   */
  async fetchEnrichedFilters(categoryId: number): Promise<EnrichedFilter[]> {
    const data = await this.fetch<{ member: EnrichedFilter[] }>(
      `/api/enriched-filters?categoryId=${categoryId}`,
    );
    return data.member ?? [];
  }
}
