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
import { sanitizeCmsHtml } from '../utils/sanitize-html';
import { Gallery } from './components/marketplace/Gallery';
import { FeatureBlocks } from './components/marketplace/FeatureBlocks';
import { Faq } from './components/marketplace/Faq';
import { formatPrice } from '../marketplace-api';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  position: number;
}

interface MarketplaceExtensionPageProps {
  config: StoreConfig;
  categories: Category[];
  extension: MarketplaceExtensionDetail;
  faqItems: FaqItem[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const MarketplaceExtensionPage: FC<MarketplaceExtensionPageProps> = ({
  config,
  categories,
  extension,
  faqItems,
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

  const hasChallengeOrSolution = extension.challenge || extension.solution;

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
            &larr; All extensions
          </a>
        </nav>

        {/* Header: name + tagline + tier badge */}
        <header class="mb-10">
          <div class="flex flex-wrap items-start gap-3">
            <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">
              {extension.name}
            </h1>
            <span
              class={
                extension.tier === 'free'
                  ? 'mt-1 inline-block rounded-full bg-success/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-success'
                  : 'mt-1 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary'
              }
            >
              {extension.tier === 'free' ? 'Free' : 'Paid'}
            </span>
          </div>
          {extension.tagline && (
            <p class="mt-3 max-w-3xl text-lg text-base-content/70 md:text-xl">
              {extension.tagline}
            </p>
          )}
        </header>

        {/* Gallery — omits itself when empty */}
        <Gallery images={extension.gallery} />

        <div class="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
          {/* Main content column */}
          <div>
            {/* Challenge / Solution two-column block */}
            {hasChallengeOrSolution && (
              <div class="mb-8 grid grid-cols-1 gap-6 border border-base-300 p-6 sm:grid-cols-2">
                {extension.challenge && (
                  <div>
                    <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/60">
                      The challenge
                    </h2>
                    <p class="text-sm leading-relaxed text-base-content/80">
                      {extension.challenge}
                    </p>
                  </div>
                )}
                {extension.solution && (
                  <div>
                    <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/60">
                      The solution
                    </h2>
                    <p class="text-sm leading-relaxed text-base-content/80">
                      {extension.solution}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Main description HTML */}
            <article class="prose prose-sm max-w-none md:prose-base">
              {extension.short_description && (
                <p class="text-base-content/80">{extension.short_description}</p>
              )}
              {extension.description && (
                /* Admin-authored HTML — sanitised before render (Maho's WYSIWYG
                   does not strip script/event-handlers on its own). */
                <div
                  class="mt-6 text-base-content/90"
                  dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(extension.description) }}
                />
              )}
              {!extension.short_description && !extension.description && (
                <p class="text-base-content/60">
                  No detailed description available yet.
                </p>
              )}
            </article>

            {/* Feature blocks — omits itself when empty */}
            <FeatureBlocks blocks={extension.featureBlocks} />

            {/* FAQ accordion + JSON-LD — omits itself when empty */}
            <Faq items={faqItems} />
          </div>

          {/* Sidebar */}
          <aside class="space-y-6">
            {/* Pricing */}
            <div class="border border-base-300 p-6">
              <p class="text-xs uppercase tracking-wider text-base-content/60">
                Pricing
              </p>
              <div class="mt-3 space-y-2">
                {extension.tiers.length > 0 ? (
                  // Tier-based pricing (preferred)
                  extension.tiers.map((tier, i) => {
                    const price = formatPrice(tier.price, extension.currency);
                    return (
                      <div key={i}>
                        {i === 0 ? (
                          <p class="text-2xl font-semibold">
                            {price ?? 'Free'}{' '}
                            <span class="text-sm font-normal text-base-content/60">
                              {tier.label}
                            </span>
                          </p>
                        ) : (
                          <p class="text-base text-base-content/80">
                            {price ?? 'Free'}{' '}
                            <span class="text-sm text-base-content/60">
                              {tier.label}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Fallback to simple single/unlimited display
                  <>
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
                  </>
                )}
              </div>

              {/* Primary action: Buy (paid) or Install (free) */}
              <div class="mt-5">
                {extension.tier === 'paid' ? (
                  // Buy / Add to cart — wired to the Stimulus cart controller
                  // TODO: tier-selection (choosing between single/unlimited SKUs before add) is a follow-up;
                  // this always adds the base product SKU.
                  <div
                    data-controller="cart"
                    data-cart-sku-value={extension.sku}
                  >
                    <button
                      type="button"
                      class="btn btn-primary w-full"
                      data-action="cart#add"
                      data-cart-target="addButton"
                    >
                      Add to cart
                    </button>
                    <p data-cart-target="message" class="cart-message mt-2 text-center text-xs" />
                  </div>
                ) : (
                  // Free extension: show composer require block as primary CTA
                  <p class="text-xs text-base-content/60">
                    Free &mdash; install via Composer below.
                  </p>
                )}
              </div>
            </div>

            {/* User manual + PDF download links (omit each when null) */}
            {(extension.docsUrl || extension.pdfUrl) && (
              <div class="border border-base-300 p-6">
                <p class="text-xs uppercase tracking-wider text-base-content/60">
                  Resources
                </p>
                <div class="mt-3 space-y-2">
                  {extension.docsUrl && (
                    <a
                      href={extension.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-center gap-2 text-sm text-base-content hover:underline"
                    >
                      <span class="text-base-content/50">&#x1F4D6;</span>
                      User manual
                    </a>
                  )}
                  {extension.pdfUrl && (
                    <a
                      href={extension.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-center gap-2 text-sm text-base-content hover:underline"
                    >
                      <span class="text-base-content/50">&#x1F4C4;</span>
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Install — shown for free extensions; for paid extensions still useful after purchase */}
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
                PHP 8.3+{extension.supported_maho_versions ? `, Maho ${extension.supported_maho_versions}` : ''}
              </p>
            </div>

            {/* Details */}
            <div class="border border-base-300 p-6">
              <p class="text-xs uppercase tracking-wider text-base-content/60">
                Details
              </p>
              <dl class="mt-3 space-y-2 text-sm">
                <div>
                  <dt class="text-base-content/60">SKU</dt>
                  <dd class="font-mono text-xs">{extension.sku}</dd>
                </div>
                {extension.version && (
                  <div>
                    <dt class="text-base-content/60">Version</dt>
                    <dd class="font-mono text-xs">{extension.version}</dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
};
