/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type {
  Category,
  StoreConfig,
  StorefrontStore,
  MarketplaceExtensionDetail,
} from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';
import { formatPrice } from '../marketplace-api';

interface MarketplaceExtensionPageProps {
  config: StoreConfig;
  categories: Category[];
  extension: MarketplaceExtensionDetail;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const MarketplaceExtensionPage: FC<MarketplaceExtensionPageProps> = ({
  config,
  categories,
  extension,
  stores,
  currentStoreCode,
  devData,
}) => {
  const single = formatPrice(extension.price_single, extension.currency);
  const unlimited = formatPrice(extension.price_unlimited, extension.currency);
  const canonical = `${config.baseUrl.replace(/\/$/, '')}/marketplace/${encodeURIComponent(extension.url_key)}`;

  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: extension.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'PHP 8.3+, Maho e-commerce',
    description: extension.tagline ?? extension.short_description ?? extension.name,
    offers: single
      ? {
          '@type': 'Offer',
          price: extension.price_single,
          priceCurrency: extension.currency,
          url: canonical,
        }
      : undefined,
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
        title={`${extension.name} — Mageaustralia Extensions`}
        description={extension.tagline ?? extension.short_description ?? extension.name}
        canonicalUrl={canonical}
        siteName={config.storeName}
        jsonLd={[productLd]}
      />

      <section class="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <nav class="mb-8 text-sm text-base-content/60">
          <a href="/marketplace" class="hover:underline">
            ← All extensions
          </a>
        </nav>

        <header class="mb-10">
          <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">
            {extension.name}
          </h1>
          {extension.tagline && (
            <p class="mt-3 max-w-3xl text-lg text-base-content/70 md:text-xl">
              {extension.tagline}
            </p>
          )}
        </header>

        <div class="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
          <article class="prose prose-sm max-w-none md:prose-base">
            {extension.short_description && (
              <p class="text-base-content/80">{extension.short_description}</p>
            )}
            {extension.description && (
              /* The API emits HTML; safe to render because admins author this
                 content and it already goes through Maho's admin XSS filters. */
              <div
                class="mt-6 text-base-content/90"
                dangerouslySetInnerHTML={{ __html: extension.description }}
              />
            )}
            {!extension.short_description && !extension.description && (
              <p class="text-base-content/60">
                No detailed description available yet.
              </p>
            )}
          </article>

          <aside class="space-y-6">
            <div class="border border-base-300 p-6">
              <p class="text-xs uppercase tracking-wider text-base-content/60">
                Pricing
              </p>
              <div class="mt-3 space-y-1">
                {single ? (
                  <p class="text-2xl font-semibold">
                    {single}{' '}
                    <span class="text-sm font-normal text-base-content/60">
                      single-store
                    </span>
                  </p>
                ) : (
                  <p class="text-2xl font-semibold">Free</p>
                )}
                {unlimited && (
                  <p class="text-base text-base-content/80">
                    {unlimited}{' '}
                    <span class="text-sm text-base-content/60">
                      unlimited
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div class="border border-base-300 p-6">
              <p class="text-xs uppercase tracking-wider text-base-content/60">
                Install
              </p>
              <pre class="mt-3 overflow-x-auto bg-base-200 p-3 font-mono text-xs">
                <code>
                  composer require {extension.composer_package}
                </code>
              </pre>
              <p class="mt-3 text-xs text-base-content/60">
                PHP 8.3+, Maho {extension.supported_maho_versions}
              </p>
            </div>

            <div class="border border-base-300 p-6">
              <p class="text-xs uppercase tracking-wider text-base-content/60">
                Details
              </p>
              <dl class="mt-3 space-y-2 text-sm">
                <div>
                  <dt class="text-base-content/60">SKU</dt>
                  <dd class="font-mono text-xs">{extension.sku}</dd>
                </div>
                <div>
                  <dt class="text-base-content/60">Version</dt>
                  <dd class="font-mono text-xs">{extension.version}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
};
