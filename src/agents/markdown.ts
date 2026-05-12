/**
 * Maho Storefront — Markdown content negotiation
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * When an AI agent wants a low-token-cost view of any page, it can either:
 *   - Send `Accept: text/markdown`
 *   - Append `/index.md` (Cloudflare's pattern) or `.md` to the URL
 *
 * This module:
 *   1. Detects the markdown intent (header or path suffix).
 *   2. Rewrites the request path so downstream routes still match the
 *      original entity (e.g. `/wilson-blade-100/index.md` → `/wilson-blade-100`).
 *   3. Exposes `c.get('wantsMarkdown')` for routes to branch on.
 *   4. Renders product / category / CMS-page entities to clean markdown.
 *
 * The renderers strip HTML tags from descriptions and pull only fields
 * an agent typically wants: name, price, stock, key attributes, images.
 */

import type { Context, Next } from 'hono';
import type { Category, Product, CmsPage, StoreConfig } from '../types';

const MD_ACCEPT = /text\/markdown/i;

/**
 * Middleware: detect markdown intent and normalise the path so downstream
 * routes see the original URL (sans `.md` / `/index.md`).
 */
export async function markdownNegotiation(c: Context, next: Next): Promise<void | Response> {
  const url = new URL(c.req.url);
  const path = url.pathname;
  const accept = c.req.header('Accept') || '';

  let wantsMd = false;
  let newPath = path;

  if (path === '/index.md') {
    wantsMd = true;
    newPath = '/';
  } else if (path.endsWith('/index.md')) {
    wantsMd = true;
    newPath = path.slice(0, -'/index.md'.length) || '/';
  } else if (path.endsWith('.md') && !path.startsWith('/llms')) {
    // Allow /category.md and /product.md style; exclude /llms.txt's neighbours.
    wantsMd = true;
    newPath = path.slice(0, -'.md'.length);
  } else if (MD_ACCEPT.test(accept) && !accept.includes('text/html')) {
    // Pure markdown Accept (no html fallback) → opt in.
    wantsMd = true;
  }

  c.set('wantsMarkdown', wantsMd);

  if (wantsMd && newPath !== path) {
    // Rewrite the request URL so the next route matcher hits the entity path.
    // Hono doesn't have a built-in rewrite, so we replace c.req.raw with a
    // new Request that has the rewritten URL but preserves headers/method/body.
    const rewritten = new URL(c.req.url);
    rewritten.pathname = newPath;
    const newReq = new Request(rewritten.toString(), c.req.raw);
    // @ts-ignore — Hono allows replacing the underlying raw request via this
    // assignment; the typing doesn't expose it but the runtime supports it.
    c.req.raw = newReq;
  }

  await next();
}

/**
 * Helper: strip HTML to something close to plain text.
 *
 * Pragmatic, not a full HTML→Markdown converter. Maho descriptions are
 * mostly plain text wrapped in <p>/<br> with the occasional <strong>/<em>
 * and image. We preserve paragraph breaks and inline emphasis; drop the
 * rest. Good enough for agent consumption (cuts tokens ~80%) and avoids
 * pulling in a heavyweight library.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img\s+[^>]*alt="([^"]*)"[^>]*src="([^"]+)"[^>]*>/gi, '![$1]($2)')
    .replace(/<img\s+[^>]*src="([^"]+)"[^>]*>/gi, '![]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatPrice(value: number | null | undefined, currency: string): string {
  if (value == null) return '—';
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function productToMarkdown(product: Product, config: StoreConfig, origin: string): string {
  const currency = config.defaultDisplayCurrencyCode || 'USD';
  const lines: string[] = [];
  lines.push(`# ${product.name}`);
  lines.push('');
  if (product.sku) lines.push(`**SKU:** ${product.sku}`);

  // Price
  if (product.finalPrice != null && product.specialPrice != null && product.price && product.specialPrice < product.price) {
    lines.push(`**Price:** ${formatPrice(product.finalPrice, currency)} (was ${formatPrice(product.price, currency)})`);
  } else {
    lines.push(`**Price:** ${formatPrice(product.finalPrice ?? product.price, currency)}`);
  }

  lines.push(`**Stock:** ${product.stockStatus === 'in_stock' ? 'In stock' : 'Out of stock'}`);
  lines.push(`**URL:** ${origin}/${product.urlKey ?? ''}`);
  lines.push('');

  if (product.shortDescription) {
    lines.push(htmlToText(product.shortDescription));
    lines.push('');
  }
  if (product.description) {
    lines.push('## Description');
    lines.push('');
    lines.push(htmlToText(product.description));
    lines.push('');
  }

  if (product.configurableOptions?.length) {
    lines.push('## Options');
    lines.push('');
    for (const opt of product.configurableOptions) {
      const values = opt.values.map(v => v.label).join(', ');
      lines.push(`- **${opt.label}:** ${values}`);
    }
    lines.push('');
  }

  if (product.mediaGallery?.length) {
    lines.push('## Images');
    lines.push('');
    for (const img of product.mediaGallery) {
      lines.push(`- ![${img.label ?? product.name}](${img.url})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function categoryToMarkdown(category: Category, products: Product[], config: StoreConfig, origin: string): string {
  const currency = config.defaultDisplayCurrencyCode || 'USD';
  const lines: string[] = [];
  lines.push(`# ${category.name}`);
  lines.push('');
  if (category.description) {
    lines.push(htmlToText(category.description));
    lines.push('');
  }

  if (category.children?.length) {
    const menuChildren = category.children.filter(ch => ch.includeInMenu);
    if (menuChildren.length) {
      lines.push('## Subcategories');
      lines.push('');
      for (const child of menuChildren) {
        const path = child.urlPath?.replace(/\.html$/, '') || child.urlKey || '';
        lines.push(`- [${child.name}](${origin}/${path})`);
      }
      lines.push('');
    }
  }

  if (products.length) {
    lines.push('## Products');
    lines.push('');
    for (const p of products) {
      const price = formatPrice(p.finalPrice ?? p.price, currency);
      const stock = p.stockStatus === 'in_stock' ? '' : ' _(out of stock)_';
      lines.push(`- [${p.name}](${origin}/${p.urlKey ?? ''}) — ${price}${stock}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function cmsPageToMarkdown(page: CmsPage, origin: string): string {
  const lines: string[] = [];
  lines.push(`# ${page.title}`);
  lines.push('');
  lines.push(`_${origin}/${page.identifier}_`);
  lines.push('');
  if (page.content) {
    lines.push(htmlToText(page.content));
  }
  return lines.join('\n');
}

export function homeToMarkdown(config: StoreConfig, categories: Category[], origin: string): string {
  const lines: string[] = [];
  lines.push(`# ${config.storeName}`);
  if (config.defaultDescription) {
    lines.push('');
    lines.push(`> ${config.defaultDescription}`);
  }
  lines.push('');
  lines.push(`Storefront: ${origin}`);
  lines.push('');

  const top = categories.filter(c => c.level === 2 && c.includeInMenu);
  if (top.length) {
    lines.push('## Shop categories');
    lines.push('');
    for (const cat of top) {
      const path = cat.urlPath?.replace(/\.html$/, '') || cat.urlKey || '';
      lines.push(`- [${cat.name}](${origin}/${path})`);
    }
    lines.push('');
  }

  lines.push('For a richer site map see `/llms.txt`.');
  return lines.join('\n');
}

export function markdownResponse(c: Context, body: string): Response {
  return c.body(body, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=600',
    'Vary': 'Accept',
  });
}
