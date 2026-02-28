/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Content Rewriter — rewrites hardcoded backend API URLs in CMS/blog HTML content
 * to relative paths on the storefront.
 *
 * When store owners create CMS pages or blog posts in Maho admin, they may paste or
 * generate links pointing at the backend API domain (e.g., https://api.example.com/my-product).
 * These links should resolve on the storefront domain, not the API backend.
 *
 * Uses getRenderApiUrl() to get the current per-store API URL without prop drilling.
 */

import { getRenderApiUrl } from './page-config';

/**
 * Rewrite any hardcoded backend URLs in HTML content to relative paths.
 *
 * Replaces href="https://backend.com/foo" → href="/foo"
 * Replaces src="https://backend.com/media/..." → src="/media/..." (proxied)
 *
 * Preserves:
 * - External URLs (not matching the backend)
 * - Already-relative URLs
 * - Anchor links (#)
 * - mailto:/tel: links
 */
export function rewriteContentUrls(html: string, backendUrl?: string): string {
  const apiUrl = backendUrl || getRenderApiUrl();
  if (!apiUrl) return html;

  // Escape for regex (handle dots, slashes, etc.)
  const escaped = apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Also match http variant if apiUrl is https
  let pattern: string;
  if (apiUrl.startsWith('https://')) {
    const httpVariant = 'http://' + apiUrl.slice(8);
    const escapedHttp = httpVariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern = `(?:${escaped}|${escapedHttp})`;
  } else {
    pattern = escaped;
  }

  // Replace backend URLs with relative paths in href and src attributes
  // Match: href="https://backend.com/path" or src="https://backend.com/media/foo.jpg"
  const regex = new RegExp(pattern, 'g');
  let result = html.replace(regex, '');

  // Strip unprocessed Magento directives ({{block ...}}, {{widget ...}}, etc.)
  // These are server-side template tags that the headless storefront cannot process
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  return result;
}