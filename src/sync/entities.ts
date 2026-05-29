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
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (cat.id && cat.childrenIds && cat.childrenIds.length > 0) {
      try {
        categories[i] = await api.fetchCategoryById(cat.id);
      } catch {}
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
