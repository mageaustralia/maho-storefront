/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { MarketplaceExtension, MarketplaceExtensionDetail } from './types';

/**
 * Public catalog API base. Hardcoded to the Maho admin host — the catalog
 * endpoints are public (CORS `*`) and cacheable, so there's no need to
 * proxy through the storefront Worker.
 */
const MARKETPLACE_API_BASE = 'https://admin.mageaustralia.com.au';

/**
 * Fetch the full marketplace catalog. Returns an empty array on any fetch
 * failure so the browse page still renders (with an empty state) rather
 * than throwing 500 from the Worker.
 */
export async function fetchMarketplaceExtensions(): Promise<MarketplaceExtension[]> {
  try {
    const res = await fetch(`${MARKETPLACE_API_BASE}/marketplace/extensions/index/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { extensions?: MarketplaceExtension[] };
    return Array.isArray(body.extensions) ? body.extensions : [];
  } catch {
    return [];
  }
}

/**
 * Fetch a single extension by SKU. Returns null on 404 or any fetch failure.
 */
export async function fetchMarketplaceExtension(sku: string): Promise<MarketplaceExtensionDetail | null> {
  const encoded = encodeURIComponent(sku);
  try {
    const res = await fetch(
      `${MARKETPLACE_API_BASE}/marketplace/extensions/view/?sku=${encoded}`,
      { method: 'GET', headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { extension?: MarketplaceExtensionDetail };
    return body.extension ?? null;
  } catch {
    return null;
  }
}

/**
 * Look up a single extension by url_key by filtering the full list.
 * The API doesn't index by url_key directly; at <20 modules the full-list
 * scan is fine. If the catalog grows past ~200 we'll want an index endpoint.
 */
export async function findMarketplaceExtensionByUrlKey(
  urlKey: string
): Promise<MarketplaceExtension | null> {
  const list = await fetchMarketplaceExtensions();
  return list.find((e) => e.url_key === urlKey) ?? null;
}

/**
 * Format a price as store currency. Returns `null` if the raw value is null
 * (missing unlimited-tier, for instance) so templates can conditional-render.
 */
export function formatPrice(value: number | null, currency: string): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency || 'AUD',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}
