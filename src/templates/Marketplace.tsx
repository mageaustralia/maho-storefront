/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, StorefrontStore, MarketplaceExtension } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';
import { ExtensionCard } from './components/marketplace/ExtensionCard';

interface MarketplacePageProps {
  config: StoreConfig;
  categories: Category[];
  extensions: MarketplaceExtension[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const MarketplacePage: FC<MarketplacePageProps> = ({
  config,
  categories,
  extensions,
  stores,
  currentStoreCode,
  devData,
}) => {
  const canonical = `${config.baseUrl.replace(/\/$/, '')}/marketplace`;
  const collectionLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Maho Extensions',
    url: canonical,
    description:
      'Curated Maho e-commerce extensions, maintained by Mage Australia.',
  };

  return (
    <Layout
      config={config}
      categories={categories}
      stores={stores}
      currentStoreCode={currentStoreCode}
      devData={devData}
    >
      <Seo
        title="Extensions — Mageaustralia"
        description="Curated Maho e-commerce extensions, maintained by Mage Australia."
        canonicalUrl={canonical}
        siteName={config.storeName}
        jsonLd={[collectionLd]}
      />

      {/* Editorial hero section — generous space, serif headline */}
      <section class="border-b border-base-300/60 bg-gradient-to-b from-base-200/30 to-transparent">
        <div class="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div class="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">
            <span class="inline-block h-px w-8 bg-base-content/40"></span>
            Catalogue
          </div>
          <h1 class="mt-6 font-serif text-4xl leading-[1.05] tracking-tight md:text-6xl">
            Modern Maho extensions,<br />
            <span class="italic text-base-content/60">crafted in Melbourne.</span>
          </h1>
          <p class="mt-6 max-w-2xl text-base leading-relaxed text-base-content/70 md:text-lg">
            Composer-installable. Pay-once with year-one updates. PHP 8.3+, Maho
            26.0+. Some open source on GitHub, others commercial here. Built by
            people who ship Maho stores in production.
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-4 text-sm text-base-content/60">
            <span class="inline-flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              {extensions.length} {extensions.length === 1 ? 'extension' : 'extensions'} available
            </span>
            <span class="text-base-content/30">·</span>
            <span>Honest pricing</span>
            <span class="text-base-content/30">·</span>
            <span>Maho Storefront ready</span>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-4 py-12 md:py-16">
        {extensions.length === 0 ? (
          <div class="rounded-2xl border border-dashed border-base-300 bg-base-100 p-16 text-center">
            <p class="font-serif text-2xl text-base-content">No extensions yet.</p>
            <p class="mt-3 text-sm text-base-content/60">First commercial modules ship soon — check back, or follow the build log on the blog.</p>
            <a href="/blog" class="mt-6 inline-block text-sm font-medium underline underline-offset-4 hover:text-accent">Read the blog →</a>
          </div>
        ) : (
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {extensions.map((ext) => (
              <ExtensionCard extension={ext} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};
