/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { ASSET_HASH } from '../asset-version';
import { Header } from './components/navigation/header/index';
import { Footer } from './components/navigation/footer/index';
import { CartDrawer } from './components/cart/drawer/index';
import { SearchOverlay } from './components/SearchOverlay';
import { MobileMenu } from './components/MobileMenu';
import { StimulusTemplates } from './components/StimulusTemplates';
import { getThemeForStore } from '../theme-resolver';
import { getRenderApiUrl, getAnnouncementBar } from '../page-config';
import { AnnouncementBar } from './components/navigation/announcement-bar/AnnouncementBar';

interface FooterPage { identifier: string; title: string; }

interface LayoutProps {
  config: StoreConfig;
  categories: Category[];
  footerPages?: FooterPage[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  storeApiUrl?: string;
  devData?: DevData | null;
  children: any;
}

export const Layout: FC<LayoutProps> = ({ config, categories, footerPages, stores, currentStoreCode, storeApiUrl, devData, children }) => {
  // Use empty string to proxy all API calls through the Worker (handles basic auth, CORS)
  const apiUrl = '';
  const v = `?v=${ASSET_HASH}`;
  const { themeName, googleFontsUrl } = getThemeForStore(currentStoreCode);
  return (
    <html lang="en" data-theme={themeName}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link rel="stylesheet" href={googleFontsUrl} />
        <link rel="stylesheet" href={`/styles.css${v}`} data-turbo-track="reload" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];window.MAHO_API_URL=${JSON.stringify(apiUrl)};window.MAHO_STORE_CODE=${JSON.stringify(currentStoreCode || '')};window.MAHO_CURRENCY=${JSON.stringify(config.baseCurrencyCode || 'USD')};window.MAHO_THEME=${JSON.stringify(themeName)};` }} />
        <script type="module" src="https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.12/dist/turbo.es2017-esm.js" data-turbo-track="reload"></script>
        <script type="module" src={`/controllers.js${v}`} data-turbo-track="reload"></script>
      </head>
      <body class="bg-base-100 text-base-content" data-controller="freshness wishlist" data-store={currentStoreCode || ''}>
        {(() => {
          const bar = getAnnouncementBar();
          return bar ? <AnnouncementBar {...bar} /> : null;
        })()}
        <Header categories={categories} config={config} stores={stores} currentStoreCode={currentStoreCode} />
        <main class="main-content">
          {children}
        </main>
        <Footer config={config} footerPages={footerPages ?? []} />
        <CartDrawer />
        <SearchOverlay />
        <MobileMenu categories={categories} config={config} stores={stores} currentStoreCode={currentStoreCode} />
        <StimulusTemplates />
        {devData && (
          <>
            <script dangerouslySetInnerHTML={{
              __html: `window.__DEV_DATA=${JSON.stringify(devData)};`
            }} />
            <div data-controller="dev-toolbar" class="dev-toolbar" />
          </>
        )}
      </body>
    </html>
  );
};