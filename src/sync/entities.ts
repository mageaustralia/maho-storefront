/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Shared content-sync helpers (Phase 3.3). Single-sources the per-entity ETL
 * so the full `/sync` and partial `/sync/:type` routes can't drift apart — the
 * categories `_lastChecked` drift (partial sync forgot to stamp it) is exactly
 * the bug this prevents from recurring.
 *
 * Scope note: only `categories` is shared so far. The other entity types either
 * legitimately diverge between the two routes (e.g. full-sync config also
 * injects Stripe/Maps; partial config doesn't) or are entangled with per-store
 * product-listing loops and the filterable-pages plugin — those stay inline in
 * index.tsx pending a dedicated pass.
 */

import type { MahoApiClient } from '../api-client';
import type { ContentStore } from '../content-store';
import type { Category } from '../types';

/**
 * Fetch + persist all categories to KV. The collection endpoint returns
 * `children: []`, so categories with `childrenIds` are re-fetched individually.
 * Stamps `_lastChecked` on every category + child BEFORE writing (so the array
 * and the per-key copies all carry the timestamp the freshness controller
 * checks), then writes the `categories` array and per-urlKey / per-urlPath keys.
 *
 * Returns the resolved categories so callers can drive downstream work
 * (e.g. the per-category product-listing sync in the full route).
 */
export async function syncCategories(
  api: MahoApiClient,
  store: ContentStore,
  prefix: string,
): Promise<Category[]> {
  const categories = await api.fetchCategories();

  // Snapshot the previously-synced tree. The collection endpoint returns
  // `childrenIds` but `children: []`, so we re-fetch each parent by id to
  // populate its children. If that re-fetch fails (transient backend blip) or
  // comes back childless despite having childrenIds, we must NOT overwrite the
  // good data with a childless version — that silently wipes the header submenu
  // until the next clean sync. Fall back to the previously-synced children so a
  // single hiccup can never regress the menu.
  const existing = await store.get<Category[]>(`${prefix}categories`);
  const existingById = new Map<number, Category>();
  for (const c of existing ?? []) if (c.id != null) existingById.set(c.id, c);

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (cat.id && cat.childrenIds && cat.childrenIds.length > 0) {
      let full: Category | null = null;
      try {
        full = await api.fetchCategoryById(cat.id);
      } catch { /* transient — handled below */ }
      if (full?.children && full.children.length > 0) {
        categories[i] = full;
      } else {
        // Re-fetch failed or returned no children despite childrenIds — keep the
        // last-known-good category (with its children) instead of regressing.
        const prev = existingById.get(cat.id);
        if (prev?.children && prev.children.length > 0) categories[i] = prev;
      }
    }
  }

  const ts = Math.floor(Date.now() / 1000);
  for (const cat of categories) {
    (cat as unknown as { _lastChecked: number })._lastChecked = ts;
    if (cat.children) {
      for (const child of cat.children) (child as unknown as { _lastChecked: number })._lastChecked = ts;
    }
  }

  await store.put(`${prefix}categories`, categories);
  for (const cat of categories) {
    if (cat.urlKey) await store.put(`${prefix}category:${cat.urlKey}`, cat);
    if (cat.children) {
      for (const child of cat.children) {
        if (child.urlKey) await store.put(`${prefix}category:${child.urlKey}`, child);
        if (child.urlPath) await store.put(`${prefix}category:${child.urlPath.replace(/\.html$/, '')}`, child);
      }
    }
  }

  return categories;
}
