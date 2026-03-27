/**
 * Maho Storefront — Filterable Pages Plugin
 * Sync functions: fetch from Maho API → store in KV
 *
 * KV key format:
 *   {prefix}menu:{categoryId}     — megamenu data for a category
 *   {prefix}filter-page:{path}    — brand/filter page content (path = "category/brand")
 *   {prefix}enriched-filters:{id} — enriched layered nav for a category
 */

import type { ContentStore } from '../../content-store';
import type { Category } from '../../types';
import type { MenuData } from './types';
import { FilterablePagesApi } from './api';

export interface SyncResult {
  menuData: number;
  filterPages: number;
  errors: string[];
}

/**
 * Sync all filterable pages data for a store.
 *
 * @param categories - Already-synced categories (with urlKey populated).
 *   Passed from the main sync loop to avoid extra KV lookups.
 */
export async function syncFilterablePages(
  api: FilterablePagesApi,
  store: ContentStore,
  prefix: string,
  categories: Category[],
): Promise<SyncResult> {
  const result: SyncResult = { menuData: 0, filterPages: 0, errors: [] };

  // Build category ID → urlKey map from the already-synced categories
  const categoryUrlKeys = new Map<number, string>();
  for (const cat of categories) {
    if (cat.id && cat.urlKey) categoryUrlKeys.set(cat.id, cat.urlKey);
    if (cat.children) {
      for (const child of cat.children) {
        if (child.id && child.urlKey) categoryUrlKeys.set(child.id, child.urlKey);
      }
    }
  }

  // 1. Fetch and store megamenu data for all categories
  let allMenuData: MenuData[];
  try {
    allMenuData = await api.fetchAllMenuData();
  } catch (e) {
    result.errors.push(`menu-data fetch: ${(e as Error).message}`);
    return result;
  }

  for (const menuData of allMenuData) {
    await store.put(`${prefix}menu:${menuData.id}`, menuData);
    result.menuData++;

    // 2. For each brand/option in the menu, sync its filterable page content
    const categoryUrlKey = categoryUrlKeys.get(menuData.id);
    if (!categoryUrlKey) continue;

    for (const column of menuData.columns) {
      for (const item of column.items) {
        try {
          const page = await api.fetchFilterablePage(
            categoryUrlKey,
            item.urlKey,
            column.attributeCode,
          );
          if (page) {
            const pagePath = `${categoryUrlKey}/${item.urlKey}`;
            await store.put(`${prefix}filter-page:${pagePath}`, page);
            result.filterPages++;
          }
        } catch (e) {
          result.errors.push(`filter-page ${categoryUrlKey}/${item.urlKey}: ${(e as Error).message}`);
        }
      }
    }
  }

  return result;
}

/**
 * Sync menu data only (lighter sync — no filter pages).
 * Good for quick megamenu refresh.
 */
export async function syncMenuDataOnly(
  api: FilterablePagesApi,
  store: ContentStore,
  prefix: string,
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  try {
    const allMenuData = await api.fetchAllMenuData();
    for (const menuData of allMenuData) {
      await store.put(`${prefix}menu:${menuData.id}`, menuData);
      count++;
    }
  } catch (e) {
    errors.push((e as Error).message);
  }

  return { count, errors };
}
