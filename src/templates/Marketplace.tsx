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

      <section class="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <header class="mb-10 md:mb-14">
          <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">
            Extensions
          </h1>
          <p class="mt-3 max-w-2xl text-base text-base-content/70 md:text-lg">
            Curated Maho e-commerce extensions, maintained by us. One{' '}
            <code class="font-mono text-sm">composer require</code> — PHP
            8.3+, Maho 26.0+, MIT or open-core.
          </p>
        </header>

        {extensions.length === 0 ? (
          <div class="border border-dashed border-base-300 p-10 text-center text-sm text-base-content/60">
            <p>No extensions available yet — check back soon.</p>
          </div>
        ) : (
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {extensions.map((ext) => (
              <ExtensionCard extension={ext} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};
