/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Marketplace mapping layer — converts standard Product DTOs (from api-client.ts)
 * into MarketplaceExtension / MarketplaceExtensionDetail shapes.
 *
 * The dead /marketplace/extensions/{index,view} controller was removed in
 * commit dde48d5. This file replaces those fetchers with pure mapping functions
 * over the standard /api/rest/v2/products endpoint.
 */

import type { Product, MarketplaceExtension, MarketplaceExtensionDetail, MarketplaceTier } from './types';
import {
  getAttribute,
  normalizeDownloadableLinks,
  normalizeMediaGallery,
  classifyLicenseTier,
  licenseTotalPrice,
} from './marketplace-helpers';

/**
 * Derive price_single and price_unlimited from downloadable link deltas.
 *
 * Maho downloadable products with linksPurchasedSeparately=true have a base
 * product price plus per-link price deltas. The cart line total = base + delta.
 *
 * Conventions:
 *   - A link classified as 'single'   → price_single   = base + link.price
 *   - A link classified as 'unlimited' → price_unlimited = base + link.price
 *   - If no links exist, price_single = base price (0 or positive)
 */
function deriveLinkedPrices(product: Product): { price_single: number | null; price_unlimited: number | null } {
  const links = normalizeDownloadableLinks(product);

  if (links.length === 0) {
    // No tiers: base price is the only price
    return { price_single: product.price ?? null, price_unlimited: null };
  }

  let price_single: number | null = null;
  let price_unlimited: number | null = null;

  for (const link of links) {
    const kind = classifyLicenseTier(link.title);
    const total = licenseTotalPrice(product, link.price);
    if (kind === 'single' && price_single === null) {
      price_single = total;
    } else if (kind === 'unlimited' && price_unlimited === null) {
      price_unlimited = total;
    } else if (kind === 'other' && price_single === null) {
      // Fallback: first unrecognized link → treat as single
      price_single = total;
    }
  }

  return { price_single, price_unlimited };
}

/**
 * Build the full tiers array for the detail view.
 */
function buildTiers(product: Product): MarketplaceTier[] {
  const links = normalizeDownloadableLinks(product);
  if (links.length === 0) {
    const p = product.price ?? 0;
    return [{ label: 'Single store license', price: p === 0 ? null : p, kind: 'single' }];
  }
  return links.map((link) => ({
    label: link.title,
    price: licenseTotalPrice(product, link.price),
    kind: classifyLicenseTier(link.title),
  }));
}

/**
 * Determine whether an extension is free or paid.
 * An extension is 'free' only if every resolvable price is 0 or absent.
 */
function deriveTier(product: Product, price_single: number | null, price_unlimited: number | null): 'free' | 'paid' {
  const prices = [price_single, price_unlimited, product.price].filter((p) => p !== null) as number[];
  if (prices.length === 0) return 'free';
  return prices.some((p) => p > 0) ? 'paid' : 'free';
}

/**
 * Map a Product (from fetchCategoryProducts list response) to a MarketplaceExtension.
 * The list response doesn't include additionalAttributes, downloadableLinks or mediaGallery,
 * so only fields present on the list shape are populated here; the rest default gracefully.
 */
export function mapProductToExtension(p: Product): MarketplaceExtension {
  const { price_single, price_unlimited } = deriveLinkedPrices(p);
  const tier = deriveTier(p, price_single, price_unlimited);

  return {
    sku: p.sku,
    url_key: p.urlKey ?? p.sku,
    name: p.name,
    composer_package: getAttribute(p, 'composer_package') ?? '',
    version: null,
    supported_maho_versions: getAttribute(p, 'supported_maho_versions'),
    tagline: getAttribute(p, 'marketplace_tagline') ?? p.shortDescription ?? null,
    short_description: p.shortDescription ?? null,
    tier,
    price_single,
    price_unlimited,
    currency: 'AUD',
    image_url: p.imageUrl ?? p.smallImageUrl ?? p.thumbnailUrl ?? null,
  };
}

/**
 * Map a full Product detail (from fetchProduct) to a MarketplaceExtensionDetail.
 * All richer fields (gallery, tiers, marketing attributes) are populated here.
 */
export function mapProductToDetail(p: Product): MarketplaceExtensionDetail {
  const { price_single, price_unlimited } = deriveLinkedPrices(p);
  const tier = deriveTier(p, price_single, price_unlimited);
  const tiers = buildTiers(p);

  // Build gallery from normalised mediaGallery (sorted by position)
  const gallery = normalizeMediaGallery(p).map((img) => img.url);

  // Parse featureBlocks defensively
  let featureBlocks: { heading: string; body: string }[] = [];
  const rawFeatureBlocks = getAttribute(p, 'mkt_feature_blocks');
  if (rawFeatureBlocks) {
    try {
      const parsed = JSON.parse(rawFeatureBlocks);
      if (Array.isArray(parsed)) {
        featureBlocks = parsed;
      }
    } catch {
      // Malformed JSON — leave as empty array
    }
  }

  return {
    sku: p.sku,
    url_key: p.urlKey ?? p.sku,
    name: p.name,
    composer_package: getAttribute(p, 'composer_package') ?? '',
    version: null,
    supported_maho_versions: getAttribute(p, 'supported_maho_versions'),
    tagline: getAttribute(p, 'marketplace_tagline') ?? p.shortDescription ?? null,
    short_description: p.shortDescription ?? null,
    description: p.description ?? null,
    tier,
    price_single,
    price_unlimited,
    currency: 'AUD',
    image_url: p.imageUrl ?? p.smallImageUrl ?? p.thumbnailUrl ?? null,
    additional_images: gallery,
    tiers,
    gallery,
    challenge: getAttribute(p, 'mkt_challenge'),
    solution: getAttribute(p, 'mkt_solution'),
    featureBlocks,
    faqCategory: getAttribute(p, 'faq_category'),
    docsUrl: getAttribute(p, 'docs_url'),
    pdfUrl: getAttribute(p, 'pdf_url'),
  };
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
