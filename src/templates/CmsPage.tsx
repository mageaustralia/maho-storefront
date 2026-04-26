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
  const template = (page.pageLayout ?? 'one_column') as RootTemplate;

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
        data-freshness-version={djb2(`${page.updatedAt}|${page.pageLayout ?? ''}|${page.title ?? ''}|${page.content ?? ''}`)}
      />

      <LayoutShell template={template} sidebarLeft={sidebarLeft} sidebarRight={sidebarRight}>
        <article class="cms-page">
          {/* Editorial header band — matches blog post + marketplace patterns */}
          <header class="border-b border-base-300/60 bg-gradient-to-b from-base-200/40 to-transparent">
            <div class="mx-auto max-w-3xl px-4 py-12 md:py-16">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                {config.storeName}
              </p>
              <h1
                class="mt-6 font-serif text-4xl leading-[1.05] tracking-tight md:text-6xl"
                data-freshness-target="cms-title"
              >
                {page.contentHeading || page.title}
              </h1>
            </div>
          </header>

          {page.content && (
            <div class="mx-auto max-w-3xl px-4 py-12 md:py-16">
              <div
                class="prose prose-base max-w-none text-base-content/85 prose-headings:font-serif prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-12 prose-h3:text-xl prose-h3:mt-10 prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-base-content/30 prose-blockquote:font-serif prose-blockquote:italic prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-code:bg-base-200 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-base-content prose-pre:text-base-100 prose-img:rounded-xl prose-hr:border-base-300/60 description-content"
                data-freshness-target="cms-content"
                dangerouslySetInnerHTML={{ __html: rewriteContentUrls(page.content) }}
              />
            </div>
          )}
        </article>
      </LayoutShell>
    </Layout>
  );
};