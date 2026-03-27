/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC, PropsWithChildren } from 'hono/jsx';
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
import { getRenderApiUrl, getAnnouncementBar, getVariant } from '../page-config';
import { AnnouncementBar } from './components/navigation/announcement-bar/AnnouncementBar';
import { NewsletterPopup } from './components/engagement/newsletter/NewsletterPopup';
import { NewsletterPopupImage } from './components/engagement/newsletter/NewsletterPopupImage';
import { NewsletterFlyout } from './components/engagement/newsletter/NewsletterFlyout';
import { PluginHeadScripts } from './components/PluginHeadScripts';

interface FooterPage { identifier: string; title: string; }

interface LayoutProps {
  config: StoreConfig;
  categories: Category[];
  footerPages?: FooterPage[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  storeApiUrl?: string;
  devData?: DevData | null;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({ config, categories, footerPages, stores, currentStoreCode, storeApiUrl, devData, children }) => {
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
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];window.MAHO_API_URL=${JSON.stringify(apiUrl)};window.MAHO_STORE_CODE=${JSON.stringify(currentStoreCode || '')};window.MAHO_CURRENCY=${JSON.stringify(config.baseCurrencyCode || 'USD')};window.MAHO_THEME=${JSON.stringify(themeName)};document.addEventListener('turbo:before-render',function(e){e.detail.newBody.querySelectorAll('script[data-cfasync]').forEach(function(s){s.remove()})});` }} />
        <script type="module" src="https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.12/dist/turbo.es2017-esm.min.js" data-turbo-track="reload"></script>
        <script type="module" src={`/controllers.js${v}`} data-turbo-track="reload"></script>
        {config.extensions?.paymentPlugins?.length ? (
          <>
            <script dangerouslySetInnerHTML={{ __html: config.extensions.paymentPlugins
              .filter(p => p.config)
              .map(p => Object.entries(p.config!).map(([k, val]) => `window.${k}=${JSON.stringify(val)};`).join(''))
              .join('') }} />
            {config.extensions.paymentPlugins.map(p => (
              <script src={`${p.script}${v}`} defer key={p.code}></script>
            ))}
          </>
        ) : null}
        <PluginHeadScripts config={config} />
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
        <SearchOverlay config={config} />
        <MobileMenu categories={categories} config={config} stores={stores} currentStoreCode={currentStoreCode} />
        <StimulusTemplates />
        {(() => {
          const variant = getVariant('engagement', 'newsletter', 'inline');
          if (variant === 'popup') return <NewsletterPopup />;
          if (variant === 'popup-image') return <NewsletterPopupImage />;
          if (variant === 'flyout') return <NewsletterFlyout />;
          return null;
        })()}
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