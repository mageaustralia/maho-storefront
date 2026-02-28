/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, CmsPage, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { LayoutShell } from './components/LayoutShell';
import type { RootTemplate } from './components/LayoutShell';
import { Seo } from './components/Seo';
import { Hero } from './components/homepage/hero/index';
import { ShopByCategory } from './components/homepage/shop-by-category/index';
import { djb2 } from '../utils/hash';
import { rewriteContentUrls } from '../content-rewriter';

interface HomeProps {
  config: StoreConfig;
  categories: Category[];
  cmsPage?: CmsPage | null;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  sidebarLeft?: string | null;
  sidebarRight?: string | null;
  devData?: DevData | null;
}

export const Home: FC<HomeProps> = ({ config, categories, cmsPage, stores, currentStoreCode, sidebarLeft, sidebarRight, devData }) => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.storeName,
    url: config.baseUrl,
  };

  const hasCmsContent = !!(cmsPage?.content);

  return (
    <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
      <Seo
        title={config.defaultTitle ?? config.storeName}
        description={config.defaultDescription ?? undefined}
        jsonLd={jsonLd}
      />
      {/* Freshness metadata — client JS checks API if _lastChecked > 60s */}
      {cmsPage && (
        <div hidden
          data-freshness-type="cms"
          data-freshness-key={`cms:${cmsPage.identifier}`}
          data-freshness-api={`/api/cms-pages?identifier=${encodeURIComponent(cmsPage.identifier)}`}
          data-freshness-checked={(cmsPage as any)._lastChecked ?? '0'}
          data-freshness-version={djb2(`${cmsPage.updatedAt}|${cmsPage.title ?? ''}|${cmsPage.content ?? ''}`)}
        />
      )}

      {/* Full-bleed wrapper: negate main-content padding on mobile so homepage goes edge-to-edge */}
      <div class="max-sm:-mx-[var(--content-padding)]">
        {/* Hero: CMS slideshow content OR designed hero component */}
        {hasCmsContent ? (
          <section data-controller="home-carousel" class="mb-4">
            <div dangerouslySetInnerHTML={{ __html: rewriteContentUrls(cmsPage!.content!) }} />
          </section>
        ) : (
          <Hero config={config} />
        )}

        <LayoutShell template={((cmsPage?.rootTemplate as RootTemplate) ?? 'one_column')} sidebarLeft={sidebarLeft} sidebarRight={sidebarRight}>
          <ShopByCategory categories={categories} />
        </LayoutShell>
      </div>
    </Layout>
  );
};