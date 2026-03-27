/**
 * Maho Storefront — Filterable Pages Plugin
 * URL resolver: checks if a /:parent/:child path matches a filter page in KV
 *
 * Used in the main /:parent/:child route handler to intercept brand URLs
 * before the normal category/product fallback.
 */

import type { ContentStore } from '../../content-store';
import type { FilterablePage, MenuData } from './types';

/**
 * Try to resolve a /:parent/:child URL as a filter page.
 *
 * Returns the FilterablePage if found in KV, null otherwise.
 * The caller should then render FilterPage instead of CategoryPage.
 */
export async function resolveFilterPage(
  store: ContentStore,
  prefix: string,
  parentSlug: string,
  childSlug: string,
): Promise<FilterablePage | null> {
  const path = `${parentSlug}/${childSlug}`;
  return store.get<FilterablePage>(`${prefix}filter-page:${path}`);
}

/**
 * Get megamenu data for a category from KV.
 *
 * Returns null if no menu data exists (module not synced or category has none).
 */
export async function getMenuData(
  store: ContentStore,
  prefix: string,
  categoryId: number,
): Promise<MenuData | null> {
  return store.get<MenuData>(`${prefix}menu:${categoryId}`);
}

/**
 * Check if a category has megamenu data in KV.
 *
 * Lightweight check — doesn't parse the full data.
 */
export async function hasMenuData(
  store: ContentStore,
  prefix: string,
  categoryId: number,
): Promise<boolean> {
  const data = await store.get<MenuData>(`${prefix}menu:${categoryId}`);
  return data !== null && (data.columns?.length ?? 0) > 0;
}
