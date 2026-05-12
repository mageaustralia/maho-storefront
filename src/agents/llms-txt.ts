/**
 * Maho Storefront — /llms.txt generator
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Generates a curated reading list for AI agents. The file is a structured
 * tour of the storefront: what the store is, the top categories, key CMS
 * pages, and a hint that agents can request `Accept: text/markdown` or
 * append `/index.md` to any page URL for a token-efficient response.
 *
 * Spec: https://llmstxt.org/ — root file, plain text + light markdown.
 */

import type { Category, StoreConfig } from '../types';
import { cleanUrlPath } from '../utils/format';

interface FooterPage { identifier: string; title: string; }

interface LlmsTxtInput {
  config: StoreConfig;
  categories: Category[];
  footerPages: FooterPage[];
  origin: string;
}

export function generateLlmsTxt({ config, categories, footerPages, origin }: LlmsTxtInput): string {
  const lines: string[] = [];

  // Header: what the site is.
  lines.push(`# ${config.storeName}`);
  if (config.defaultDescription) {
    lines.push('');
    lines.push(`> ${config.defaultDescription}`);
  }
  lines.push('');
  lines.push(`This file describes ${config.storeName} for AI agents and other automated readers.`);
  lines.push(`The full storefront is at ${origin}.`);
  lines.push('');
  lines.push('Most pages on this site return clean markdown when requested with `Accept: text/markdown`,');
  lines.push('or by appending `/index.md` to the URL (e.g. `/categoryname/index.md`).');
  lines.push('Use that format whenever possible — it cuts response size dramatically vs. the HTML view.');
  lines.push('');

  // Top categories — usually the most important navigation surface.
  const topCategories = categories.filter(c => c.level === 2 && c.includeInMenu);
  if (topCategories.length > 0) {
    lines.push('## Shop categories');
    lines.push('');
    for (const cat of topCategories) {
      const path = cleanUrlPath(cat.urlPath ?? '') || cat.urlKey || '';
      if (!path) continue;
      const desc = cat.description?.trim().split('\n')[0]?.slice(0, 140);
      lines.push(`- [${cat.name}](${origin}/${path})${desc ? ` — ${desc}` : ''}`);

      // One level of subcategories if present.
      const children = (cat.children ?? []).filter(ch => ch.includeInMenu);
      for (const child of children) {
        const childPath = cleanUrlPath(child.urlPath ?? '') || child.urlKey || '';
        if (!childPath) continue;
        lines.push(`  - [${child.name}](${origin}/${childPath})`);
      }
    }
    lines.push('');
  }

  // CMS pages — about, policies, contact, etc. These are the canonical
  // "what does this store care about" pages.
  if (footerPages.length > 0) {
    lines.push('## Information pages');
    lines.push('');
    for (const page of footerPages) {
      if (page.identifier === 'home' || page.identifier === 'no-route') continue;
      lines.push(`- [${page.title}](${origin}/${page.identifier})`);
    }
    lines.push('');
  }

  // Blog index — discovery hint, not an exhaustive list.
  lines.push('## Blog');
  lines.push('');
  lines.push(`- [Blog index](${origin}/blog) — articles, guides, and store news.`);
  lines.push('');

  // Optional: structured machine-readable hints for agents.
  lines.push('## For agents');
  lines.push('');
  lines.push('- Sitemap: ' + origin + '/sitemap.xml');
  lines.push('- Robots: ' + origin + '/robots.txt');
  lines.push('- Markdown view: append `/index.md` to any page URL, or send `Accept: text/markdown`.');
  lines.push('- API: this storefront proxies a REST API at `/api/*` (forwards to the backend\'s `/api/rest/v2/*`).');
  lines.push('  See `/.well-known/api-catalog` once published, or hit `/api/store-config` to discover capabilities.');
  lines.push('');

  return lines.join('\n');
}
