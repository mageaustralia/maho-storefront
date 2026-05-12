/**
 * Maho Storefront — /sitemap.xml generator
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Generates the sitemap from KV-cached entities instead of proxying the
 * backend. The backend's sitemap was returning 404 across all storefronts
 * and even when working, didn't carry <lastmod> consistently. Owning the
 * sitemap on the Worker means:
 *
 *  - Always present (KV is the source of truth the storefront already
 *    uses for SSR).
 *  - <lastmod> populated from each entity's `updatedAt` — agents and
 *    search engines can skip re-fetching unchanged pages.
 *  - Cheap: one KV list per entity prefix, no JSX, no API calls.
 *
 * Format: standard sitemaps.org 0.9 schema, no extensions. Single file
 * — the catalogues we serve fit well under the 50k URL / 50 MB caps.
 * If they ever grow past that, this becomes a sitemap-index and the
 * per-type sitemaps move into separate routes.
 */

import type { ContentStore } from '../content-store';
import type { Category, Product, CmsPage } from '../types';

interface SitemapInput {
  store: ContentStore;
  origin: string;
  storeCode?: string;
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: number;
}

/**
 * Normalise a Maho timestamp to W3C datetime (sitemap spec).
 * Maho returns `YYYY-MM-DD HH:MM:SS` (space-separated, no timezone).
 * Treat as UTC for sitemap purposes.
 */
function toW3C(updated: string | null | undefined): string | undefined {
  if (!updated) return undefined;
  const trimmed = updated.trim();
  if (!trimmed) return undefined;
  // Already ISO 8601?
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed;
  // Maho's `YYYY-MM-DD HH:MM:SS`
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace(' ', 'T') + 'Z';
  }
  return undefined;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function entryToXml(e: SitemapEntry): string {
  const parts: string[] = ['  <url>'];
  parts.push(`    <loc>${xmlEscape(e.loc)}</loc>`);
  if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
  if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
  if (e.priority != null) parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
  parts.push('  </url>');
  return parts.join('\n');
}

export async function generateSitemap({ store, origin, storeCode }: SitemapInput): Promise<string> {
  const prefix = storeCode ? `${storeCode}:` : '';
  const entries: SitemapEntry[] = [];

  // 1. Homepage. No useful lastmod — set to the sync pulse if we want a
  // freshness signal, but skipping keeps things simple and search engines
  // recrawl the root often anyway.
  entries.push({ loc: `${origin}/`, changefreq: 'daily', priority: 1.0 });

  // 2. Categories — fetch the cached array (already deduped + ordered).
  const categories = (await store.get<Category[]>(`${prefix}categories`)) ?? [];
  const seenCategoryPaths = new Set<string>();
  const walkCategory = (cat: Category): void => {
    const path = (cat.urlPath?.replace(/\.html$/, '') ?? cat.urlKey ?? '').replace(/^\//, '');
    if (!path || seenCategoryPaths.has(path)) {
      // Still walk children even if the parent was a duplicate.
    } else {
      seenCategoryPaths.add(path);
      entries.push({
        loc: `${origin}/${path}`,
        lastmod: toW3C(cat.updatedAt),
        changefreq: 'weekly',
        priority: 0.8,
      });
    }
    if (cat.children?.length) {
      for (const ch of cat.children) walkCategory(ch);
    }
  };
  for (const cat of categories) walkCategory(cat);

  // 3. Products — KV.list with the product: prefix gives every cached
  // entity. Each value carries updatedAt for lastmod.
  const productKeys = await store.list(`${prefix}product:`);
  // Cap fan-out to avoid runaway costs on very large catalogues. 10k is well
  // under sitemap.xml's 50k URL cap; if we ever blow past it, split into a
  // sitemap-index. Cloudflare KV bulk get isn't available, so we read in
  // parallel batches via Promise.all rather than awaiting each one.
  const MAX_PRODUCTS = 10_000;
  const trimmedKeys = productKeys.slice(0, MAX_PRODUCTS);
  const products = await Promise.all(trimmedKeys.map((k) => store.get<Product>(k)));
  for (const p of products) {
    if (!p || !p.urlKey) continue;
    entries.push({
      loc: `${origin}/${p.urlKey}`,
      lastmod: toW3C((p as any).updatedAt),
      changefreq: 'weekly',
      priority: 0.6,
    });
  }

  // 4. CMS pages — same pattern as products.
  const cmsKeys = await store.list(`${prefix}cms:`);
  const cmsPages = await Promise.all(cmsKeys.map((k) => store.get<CmsPage>(k)));
  for (const page of cmsPages) {
    if (!page || !page.identifier) continue;
    if (page.identifier === 'home' || page.identifier === 'no-route') continue;
    entries.push({
      loc: `${origin}/${page.identifier}`,
      lastmod: toW3C(page.updatedAt),
      changefreq: 'monthly',
      priority: 0.4,
    });
  }

  // 5. Blog index + posts.
  const blogKeys = await store.list(`${prefix}blog:`);
  if (blogKeys.length > 0) {
    entries.push({ loc: `${origin}/blog`, changefreq: 'weekly', priority: 0.5 });
  }
  const blogPosts = await Promise.all(blogKeys.map((k) => store.get<CmsPage>(k)));
  for (const post of blogPosts) {
    if (!post || !(post as any).urlKey) continue;
    entries.push({
      loc: `${origin}/blog/${(post as any).urlKey}`,
      lastmod: toW3C(post.updatedAt),
      changefreq: 'monthly',
      priority: 0.5,
    });
  }

  // Stitch into XML.
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(entryToXml),
    '</urlset>',
    '',
  ].join('\n');
  return body;
}
