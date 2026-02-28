/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Theme Resolver — maps store code to theme name + Google Fonts URL
 *
 * Uses the auto-generated store registry. Adding a new theme:
 * create theme-{name}.json, update stores.json, run build.
 */

import { storesConfig, themeRegistry } from './generated/store-registry';

export function getThemeForStore(storeCode?: string): { themeName: string; googleFontsUrl: string } {
  const defaultTheme = storesConfig.defaultTheme;
  if (!storeCode) {
    return { themeName: defaultTheme, googleFontsUrl: themeRegistry[defaultTheme]?.googleFontsUrl || '' };
  }
  const storeEntry = (storesConfig.stores as Record<string, { theme: string }>)[storeCode];
  const themeName = storeEntry?.theme || defaultTheme;
  return { themeName, googleFontsUrl: themeRegistry[themeName]?.googleFontsUrl || '' };
}
