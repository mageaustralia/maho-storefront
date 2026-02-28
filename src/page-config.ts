/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Page Config — Store-Aware Component Variant Resolver
 *
 * Reads stores.json to map store codes to page configs (page.json, page-tech.json, etc.).
 * At build time, all variants are statically imported via the generated store registry
 * (tree-shaking handles unused ones).
 * At runtime, getVariant() returns the selected variant name for a given slot + store.
 *
 * Store context: Layout calls setRenderStore() before rendering children.
 * Since Hono JSX rendering is synchronous, all getVariant() calls within a single
 * render pass see the correct store code without explicit prop drilling.
 */

import { storesConfig, pageConfigRegistry } from './generated/store-registry';

// The default page config (referenced by stores.json defaultTheme)
const defaultPageConfig = pageConfigRegistry[storesConfig.defaultTheme];

type PageConfigShape = typeof defaultPageConfig;

// ---------------------------------------------------------------------------
// Render-time store context (synchronous — safe for SSR)
// ---------------------------------------------------------------------------

let _renderStoreCode: string | undefined;
let _renderApiUrl: string = '';
let _renderPageConfigOverride: string | null = null;

/**
 * Set the current store code for the render pass.
 * Called by getStoreContext before rendering children.
 */
export function setRenderStore(storeCode?: string): void {
  _renderStoreCode = storeCode;
}

/**
 * Set/get the per-store API URL for the render pass.
 * Called by getStoreContext; read by Layout for window.MAHO_API_URL.
 */
export function setRenderApiUrl(url: string): void { _renderApiUrl = url; }
export function getRenderApiUrl(): string { return _renderApiUrl; }

/**
 * Override the page config for preview mode.
 * When set, getPageConfig() uses this file instead of the store's default.
 */
export function setRenderPageConfigOverride(filename: string | null): void {
  _renderPageConfigOverride = filename;
}

/** Get list of available page config theme names (for dev toolbar). */
export function getAvailablePageConfigs(): string[] {
  return Object.keys(pageConfigRegistry);
}

/**
 * Get the page config for a given store code.
 * Falls back to render-time store if no explicit code given.
 */
function getPageConfig(storeCode?: string): PageConfigShape {
  // Preview mode override takes priority
  if (_renderPageConfigOverride && pageConfigRegistry[_renderPageConfigOverride]) {
    return pageConfigRegistry[_renderPageConfigOverride];
  }
  const code = storeCode ?? _renderStoreCode;
  if (!code) return defaultPageConfig;
  const storeEntry = (storesConfig.stores as Record<string, { theme: string }>)[code];
  if (!storeEntry) return defaultPageConfig;
  return pageConfigRegistry[storeEntry.theme] || defaultPageConfig;
}

/**
 * Get the selected variant for a component slot.
 *
 * @param page - The page key (e.g., 'product', 'category', 'cart')
 * @param slot - The component slot (e.g., 'gallery', 'card', 'filter')
 * @param fallback - Default variant if not specified in page config
 * @param storeCode - Optional explicit store code (overrides render context)
 */
export function getVariant(page: string, slot: string, fallback: string = 'standard', storeCode?: string): string {
  const config = getPageConfig(storeCode);
  const pageConf = (config.pages as Record<string, any>)[page];
  if (!pageConf) return fallback;

  // Check components map first
  if (pageConf.components && pageConf.components[slot]) {
    return pageConf.components[slot];
  }

  // Check top-level variant key (for header/footer style)
  if (pageConf.variant) {
    return pageConf.variant;
  }

  return fallback;
}

/**
 * Get a page section config value.
 *
 * @param page - The page key
 * @param key - The section key (e.g., 'showReviews', 'gridColumns')
 * @param fallback - Default value
 * @param storeCode - Optional explicit store code
 */
export function getSection<T = any>(page: string, key: string, fallback?: T, storeCode?: string): T {
  const config = getPageConfig(storeCode);
  const pageConf = (config.pages as Record<string, any>)[page];
  if (!pageConf) return fallback as T;

  // Check sections map
  if (pageConf.sections && key in pageConf.sections) {
    return pageConf.sections[key];
  }

  // Check top-level keys
  if (key in pageConf) {
    return pageConf[key];
  }

  return fallback as T;
}

/**
 * Get grid column config for a page.
 */
export function getGridColumns(page: string, storeCode?: string): { mobile: number; tablet: number; desktop: number } {
  return getSection(page, 'gridColumns', { mobile: 2, tablet: 3, desktop: 4 }, storeCode);
}

/**
 * Get the announcement bar config for the current store.
 * Returns null if not configured or disabled.
 */
export function getAnnouncementBar(storeCode?: string): {
  text: string;
  bgColor?: string;
  textColor?: string;
  link?: string;
  dismissible?: boolean;
} | null {
  const config = getPageConfig(storeCode);
  const bar = (config.pages as Record<string, any>).announcementBar;
  if (!bar || !bar.enabled || !bar.text) return null;
  return bar;
}

/**
 * Export the full config for advanced use cases.
 */
export { defaultPageConfig as pageConfig };
