/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Marketplace = the Maho catalog filtered to the "marketplace" category.
 * No marketplace-specific Maho controller, no parallel DTO. Marketplace-
 * flavoured fields (tagline, composer_package, license tiers, etc.) come
 * from the standard Product DTO via additionalAttributes, mediaGallery
 * and downloadableLinks. Fetching is done via api-client.ts everywhere
 * else; this file is just transforms.
 */

import type { Product } from './types';

/** Marketplace root category id in the Maho catalog tree (urlKey "marketplace"). */
export const MARKETPLACE_CATEGORY_ID = 11;

/**
 * Public Maho admin host that serves the marketplace product catalog.
 * This is intentionally hardcoded: the marketplace lives on admin.mageaustralia.com.au
 * regardless of which storefront environment (demo, staging, production) is running.
 */
export const MARKETPLACE_API_BASE = 'https://admin.mageaustralia.com.au';

type DownloadableLink = NonNullable<Product['downloadableLinks']>[number];
type GalleryImage = Product['mediaGallery'][number];

/** Normalize Maho's downloadableLinks (object keyed by id, or array) into a sorted array. */
export function normalizeDownloadableLinks(p: Product): DownloadableLink[] {
  const raw = p.downloadableLinks;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : (Object.values(raw) as DownloadableLink[]);
  return [...arr].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Normalize Maho's mediaGallery (object keyed by id, or array) into a sorted array. */
export function normalizeMediaGallery(p: Product): GalleryImage[] {
  const raw = p.mediaGallery;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : (Object.values(raw) as GalleryImage[]);
  return [...arr].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/** Pull a custom-attribute value off a Product DTO by attribute_code. */
export function getAttribute(p: Product, code: string): string | null {
  const a = (p.additionalAttributes ?? []).find(x => x.code === code);
  return a ? a.value : null;
}

/** Classify a downloadable_link as a license tier by title heuristic.
 *  "Single store license" → 'single', "Unlimited license" → 'unlimited'. */
export function classifyLicenseTier(title: string): 'single' | 'unlimited' | 'other' {
  const lower = title.toLowerCase();
  if (lower.includes('unlimited')) return 'unlimited';
  if (lower.includes('single')) return 'single';
  return 'other';
}

/** Compute the cart-line price for a downloadable license link. With
 *  links_purchased_separately=1 the cart line is base + link.price, so
 *  for a per-tier total we add the product's base price. */
export function licenseTotalPrice(product: Product, linkPrice: number): number {
  return (product.price ?? 0) + linkPrice;
}

