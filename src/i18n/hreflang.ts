/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * hreflang alternates for multi-store-view SEO.
 *
 * Given the store-view registry and the current page path, builds the
 * `<link rel="alternate" hreflang="…">` set that tells search engines which
 * URL serves which language. Rendered by <Seo> via its `alternates` prop.
 *
 * GROUNDWORK SCOPE: alternates are only emitted when two or more store-views
 * declare a `locale` (StorefrontStore.locale). Until locales are configured
 * this returns [] and nothing is rendered — so it's safe to wire in now and
 * "lights up" once a real multi-language store exists.
 *
 * KNOWN LIMITATION (future work): this maps the *same path* onto each
 * store-view's origin. That's correct when store-views share URL structure
 * (the common case for language switches on one catalogue). Store-views with
 * diverging URL keys per language will need a per-entity URL map instead.
 */
import type { StorefrontStore } from '../types';
import { toBcp47 } from './index';

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

function normalizePath(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Build hreflang alternates for the current page across store-views.
 * Returns [] unless at least two store-views have a locale set.
 */
export function buildHreflangAlternates(opts: {
  stores: StorefrontStore[] | undefined;
  path: string;
  /** Store-view code to treat as x-default (usually the primary/"default" view). */
  defaultStoreCode?: string;
}): HreflangAlternate[] {
  const { stores, path, defaultStoreCode } = opts;
  if (!stores || stores.length < 2) return [];

  const localized = stores.filter((s) => s.locale && s.url);
  if (localized.length < 2) return [];

  const p = normalizePath(path);
  const alternates: HreflangAlternate[] = localized.map((s) => ({
    hreflang: toBcp47(s.locale),
    href: `${trimTrailingSlash(s.url)}${p}`,
  }));

  // x-default → the nominated default store-view, else the first localized one.
  const fallback =
    localized.find((s) => s.code === defaultStoreCode) ?? localized[0]!;
  alternates.push({
    hreflang: 'x-default',
    href: `${trimTrailingSlash(fallback.url)}${p}`,
  });

  return alternates;
}
