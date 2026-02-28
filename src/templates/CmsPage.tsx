/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, CmsPage as CmsPageType, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { LayoutShell } from './components/LayoutShell';
import type { RootTemplate } from './components/LayoutShell';
import { Seo } from './components/Seo';
import { djb2 } from '../utils/hash';
import { rewriteContentUrls } from '../content-rewriter';

interface CmsPageProps {
  config: StoreConfig;
  categories: Category[];
  page: CmsPageType;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  sidebarLeft?: string | null;
  sidebarRight?: string | null;
  devData?: DevData | null;
}

export const CmsPageTemplate: FC<CmsPageProps> = ({ config, categories, page, stores, currentStoreCode, sidebarLeft, sidebarRight, devData }) => {
  const template = (page.rootTemplate ?? 'one_column') as RootTemplate;

  return (
    <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
      <Seo
        title={`${page.title} | ${config.storeName}`}
        description={page.metaDescription ?? undefined}
      />
      {/* Freshness metadata — client JS checks API if _lastChecked > 60s */}
      <div hidden
        data-freshness-type="cms"
        data-freshness-key={`cms:${page.identifier}`}
        data-freshness-api={`/api/cms-pages?identifier=${encodeURIComponent(page.identifier)}`}
        data-freshness-checked={(page as any)._lastChecked ?? '0'}
        data-freshness-version={djb2(`${page.updatedAt}|${page.title ?? ''}|${page.content ?? ''}`)}
      />

      <LayoutShell template={template} sidebarLeft={sidebarLeft} sidebarRight={sidebarRight}>
        <div class="cms-page">
          {page.contentHeading && <h1>{page.contentHeading}</h1>}
          {!page.contentHeading && <h1>{page.title}</h1>}
          {page.content && (
            <div class="cms-page-content description-content" dangerouslySetInnerHTML={{ __html: rewriteContentUrls(page.content) }} />
          )}
        </div>
      </LayoutShell>
    </Layout>
  );
};