/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Marketplace = the Maho catalog filtered to the "marketplace" category.
 * Everything below is a thin wrapper over the standard /api/products
 * endpoint — no marketplace-specific Maho controller, no parallel DTO.
 * Marketplace-flavoured fields (tagline, composer_package, license tiers,
 * etc.) come from the standard Product DTO via additionalAttributes,
 * mediaGallery and downloadableLinks. See docs/marketplace.md.
 */

import type { Product } from './types';

const MARKETPLACE_API_BASE = 'https://admin.mageaustralia.com.au';

/** Marketplace root category id in the Maho catalog tree (urlKey "marketplace"). */
const MARKETPLACE_CATEGORY_ID = 11;

/** Same headers ApiClient sends — includes the worker-auth token and the
 *  ld+json content negotiation that the API expects. Without these, filter
 *  query params like ?urlKey=… return 500. */
const API_HEADERS: Record<string, string> = {
  'Accept': 'application/ld+json',
  'X-Worker-Auth': 'maho-storefront-sync-626538104ee3e0ef',
};

interface ApiCollection<T> { member?: T[]; totalItems?: number }

/** Maho's API Platform returns JSON-LD when Accept omits a preference (the
 *  default), but a plain JSON array when Accept is application/json. We send
 *  no Accept and unwrap defensively, so either shape is fine. */
function unwrapCollection<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === 'object' && Array.isArray((body as ApiCollection<T>).member)) {
    return (body as ApiCollection<T>).member as T[];
  }
  return [];
}

/** Fetch the marketplace catalogue list. Returns [] on any failure.
 *
 *  Maho's listing endpoint trims additionalAttributes, downloadableLinks
 *  and mediaGallery — but the marketplace card needs all three (tagline,
 *  per-tier prices, image label). So we fan out to /api/products/{id} for
 *  each item. Marketplace catalogues are small (single-digit count); the
 *  Cloudflare edge fronts the whole thing. If the catalogue ever grows
 *  past ~20 we'd want a bespoke endpoint. */
export async function fetchMarketplaceProducts(): Promise<Product[]> {
  try {
    const url = `${MARKETPLACE_API_BASE}/api/products?categoryId=${MARKETPLACE_CATEGORY_ID}&itemsPerPage=200&order[name]=asc`;
    const res = await fetch(url, { headers: API_HEADERS });
    if (!res.ok) return [];
    const list = unwrapCollection<Product>(await res.json());
    const detailed = await Promise.all(
      list.map(p => (p.id ? fetchMarketplaceProduct(p.id) : Promise.resolve(null)))
    );
    return detailed.filter((p): p is Product => p !== null);
  } catch {
    return [];
  }
}

/** Find a marketplace product by its url_key. The /api/products?urlKey=…
 *  filter currently 500s on this Maho install, so we scan the marketplace
 *  listing in-memory. The listing is small (commercial extensions, not
 *  general catalog) and Cloudflare's cache layer fronts it. */
export async function findMarketplaceProductByUrlKey(urlKey: string): Promise<Product | null> {
  const products = await fetchMarketplaceProducts();
  return products.find(p => p.urlKey === urlKey) ?? null;
}

/** Fetch the full single-product detail (with mediaGallery, downloadableLinks,
 *  additionalAttributes — everything the listing endpoint trims). */
export async function fetchMarketplaceProduct(id: number): Promise<Product | null> {
  try {
    const res = await fetch(`${MARKETPLACE_API_BASE}/api/products/${id}`, { headers: API_HEADERS });
    if (!res.ok) return null;
    return (await res.json()) as Product;
  } catch {
    return null;
  }
}

/** Identify whether a Product is a marketplace extension. Listing-endpoint
 *  responses trim additionalAttributes so we can only check what's actually
 *  there: the type and the category. Use this on detail-endpoint Products. */
export function isMarketplaceProduct(p: Product): boolean {
  if (p.type !== 'downloadable') return false;
  if (Array.isArray(p.categoryIds) && p.categoryIds.length > 0) {
    return p.categoryIds.includes(MARKETPLACE_CATEGORY_ID);
  }
  return true;
}

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

/** Format a price as store currency. Returns null if value is null/NaN. */
export function formatPrice(value: number | null | undefined, currency: string = 'AUD'): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency || 'AUD',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${(value as number).toFixed(0)}`;
  }
}
