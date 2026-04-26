/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, StorefrontStore, Product } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';
import { formatPrice, getAttribute, classifyLicenseTier, licenseTotalPrice, normalizeDownloadableLinks, normalizeMediaGallery } from '../marketplace-api';
import { getSection } from '../page-config';

interface MarketplaceExtensionPageProps {
  config: StoreConfig;
  categories: Category[];
  product: Product;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const MarketplaceExtensionPage: FC<MarketplaceExtensionPageProps> = ({
  config,
  categories,
  product,
  stores,
  currentStoreCode,
  devData,
}) => {
  const tagline = getAttribute(product, 'marketplace_tagline');
  const composerPackage = getAttribute(product, 'composer_package');
  const supportedMaho = getAttribute(product, 'supported_maho_versions') ?? '>=26.0';
  const storefrontReady = getAttribute(product, 'marketplace_storefront_ready') === 'Yes';
  const currency = config.baseCurrencyCode || 'AUD';

  const gallery = normalizeMediaGallery(product);
  const heroImage = product.imageUrl ?? gallery[0]?.url ?? null;
  // Screenshot list = all gallery images BUT the one used as the hero.
  const screenshots = gallery.filter(g => g.url !== heroImage);

  const sortedLinks = normalizeDownloadableLinks(product);
  const single = sortedLinks.find(l => classifyLicenseTier(l.title) === 'single');
  const unlimited = sortedLinks.find(l => classifyLicenseTier(l.title) === 'unlimited');
  const singleLabel = single ? formatPrice(licenseTotalPrice(product, single.price), currency) : null;
  const unlimitedLabel = unlimited ? formatPrice(licenseTotalPrice(product, unlimited.price), currency) : null;

  const canonical = `${config.baseUrl.replace(/\/$/, '')}/marketplace/${encodeURIComponent(product.urlKey ?? product.sku)}`;
  const warrantyNote = getSection<string>('marketplaceExtension', 'warrantyNote', '', currentStoreCode);

  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'PHP 8.3+, Maho e-commerce',
    description: tagline ?? product.shortDescription ?? product.name,
    offers: singleLabel ? {
      '@type': 'Offer',
      price: licenseTotalPrice(product, single?.price ?? 0),
      priceCurrency: currency,
      url: canonical,
    } : undefined,
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
        title={`${product.name} — Mageaustralia Extensions`}
        description={tagline ?? product.shortDescription ?? product.name}
        canonicalUrl={canonical}
        siteName={config.storeName}
        jsonLd={[productLd]}
      />

      {/* Editorial header band */}
      <section class="border-b border-base-300/60 bg-gradient-to-b from-base-200/40 to-transparent">
        <div class="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <nav class="text-xs font-medium uppercase tracking-[0.18em] text-base-content/50">
            <a href="/marketplace" class="transition-colors hover:text-base-content">
              ← All extensions
            </a>
          </nav>

          <div class="mt-8 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-900">
              {singleLabel || unlimitedLabel ? 'Pro' : 'Open source'}
            </span>
            {storefrontReady && (
              <span class="inline-flex items-center rounded-full bg-base-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-base-content/70">
                Maho Storefront ready
              </span>
            )}
          </div>

          <h1 class="mt-5 font-serif text-4xl leading-[1.05] tracking-tight md:text-6xl">
            {product.name}
          </h1>
          {tagline && (
            <p class="mt-5 max-w-3xl font-serif text-lg italic text-base-content/65 md:text-2xl">
              {tagline}
            </p>
          )}
        </div>
      </section>

      {heroImage && (
        <figure class="mx-auto max-w-6xl px-4 pt-10 md:pt-14">
          <img
            src={heroImage}
            alt={product.name}
            class="aspect-[3/2] w-full rounded-2xl object-cover"
            loading="eager"
            decoding="async"
          />
        </figure>
      )}

      <section class="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div class="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_340px]">
          <article class="prose prose-base max-w-none text-base-content/85 prose-headings:font-serif prose-headings:tracking-tight prose-h2:text-3xl prose-h3:text-xl prose-a:text-accent prose-code:font-mono prose-code:text-sm">
            {product.shortDescription && (
              <p class="text-lg leading-relaxed text-base-content/85">
                {product.shortDescription}
              </p>
            )}
            {product.description && (
              <div
                class="mt-6"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {/* Screenshot gallery — captioned figures inline. Each gallery
                image after the hero shows full-width with its label as
                caption. Captions are written in Maho admin via the standard
                product image editor (Catalog → Manage Products → image label). */}
            {screenshots.length > 0 && (
              <section class="not-prose mt-14 space-y-12">
                <h2 class="font-serif text-3xl tracking-tight">Screenshots</h2>
                {screenshots.map((s) => (
                  <figure key={s.url} class="space-y-3">
                    <img
                      src={s.url}
                      alt={s.label ?? product.name}
                      loading="lazy"
                      decoding="async"
                      class="w-full rounded-xl border border-base-300/60"
                    />
                    {s.label && (
                      <figcaption class="font-mono text-xs uppercase tracking-[0.18em] text-base-content/55">
                        {s.label}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </section>
            )}

            {!product.shortDescription && !product.description && (
              <p class="text-base-content/60">
                No detailed description available yet.
              </p>
            )}
          </article>

          <aside
            class="space-y-5 lg:sticky lg:top-24 lg:self-start"
            data-controller="product"
            data-product-type-value={product.type}
            data-product-product-id-value={String(product.id ?? '')}
            data-product-sku-value={product.sku}
            data-product-currency-value={currency}
            data-product-name={product.name}
            data-product-price={String(product.price ?? 0)}
            data-product-final-price={String(product.finalPrice ?? product.price ?? 0)}
            data-product-thumbnail={product.thumbnailUrl ?? ''}
            data-product-url-key={product.urlKey ?? ''}
          >
            <div class="rounded-2xl border border-base-300/70 bg-base-100 p-6 shadow-[0_8px_24px_-12px_rgba(10,25,48,0.12)]">
              <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/50">Pricing</p>
              <div class="mt-4 space-y-1">
                {singleLabel ? (
                  <p class="font-serif text-3xl tracking-tight">
                    {singleLabel}
                    <span class="ml-2 text-sm font-sans font-normal text-base-content/55">single-store</span>
                  </p>
                ) : (
                  <p class="font-serif text-3xl tracking-tight">Free</p>
                )}
                {unlimitedLabel && (
                  <p class="text-base text-base-content/75">
                    {unlimitedLabel}
                    <span class="ml-2 text-sm text-base-content/50">unlimited</span>
                  </p>
                )}
              </div>

              {/* Hidden radios per downloadable_link — tier CTAs check the
                  matching one then trigger product#stickyAdd via the
                  marketplace-tier adapter (10-line controller). */}
              {sortedLinks.map((link) => (
                <input
                  key={link.id}
                  type="radio"
                  name="license-link"
                  data-download-link-id={String(link.id)}
                  hidden
                />
              ))}

              {sortedLinks.length > 0 && (
                <div class="mt-6 space-y-2" data-controller="marketplace-tier">
                  {sortedLinks.map((link, idx) => {
                    const total = licenseTotalPrice(product, link.price);
                    const priceLabel = formatPrice(total, currency) ?? '';
                    const tier = classifyLicenseTier(link.title);
                    const tierLabel = tier === 'unlimited' ? 'Buy unlimited'
                                    : tier === 'single' ? 'Buy single-store'
                                    : `Buy ${link.title}`;
                    const isPrimary = idx === 0;
                    return (
                      <button
                        key={link.id}
                        type="button"
                        class={
                          isPrimary
                            ? 'btn !h-auto w-full !rounded-lg !bg-base-content !text-base-100 px-5 py-3 text-sm font-semibold !border-0 transition-all hover:!bg-accent hover:!text-base-100 disabled:opacity-50'
                            : 'btn btn-outline !h-auto w-full !rounded-lg !border !border-base-300 !bg-transparent px-5 py-3 text-sm font-semibold !text-base-content transition-all hover:!border-base-content hover:!bg-base-200 disabled:opacity-50'
                        }
                        data-link-id={String(link.id)}
                        data-action="marketplace-tier#pickAndAdd"
                      >
                        {tierLabel} · {priceLabel}
                      </button>
                    );
                  })}
                  <p class="cart-message" data-product-target="message"></p>
                </div>
              )}

              {sortedLinks.length > 0 && (
                <button
                  type="button"
                  hidden
                  data-action="product#stickyAdd"
                  data-product-target="addButton"
                  aria-hidden="true"
                >Add to cart</button>
              )}

              {warrantyNote && (
                <p class="mt-5 border-t border-base-300/60 pt-4 text-xs text-base-content/55">
                  {warrantyNote}
                </p>
              )}
            </div>

            {composerPackage && (
              <div class="rounded-2xl border border-base-300/70 bg-base-content p-5 text-base-100/90">
                <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-base-100/50">Install</p>
                <pre class="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                  <span class="text-amber-300">$</span> composer require{'\n'}
                  {'  '}{composerPackage}
                </pre>
                <p class="mt-3 border-t border-base-100/10 pt-3 text-[11px] text-base-100/45">
                  PHP 8.3+ · Maho {supportedMaho}
                </p>
              </div>
            )}

            <div class="rounded-2xl border border-base-300/70 bg-base-100 p-6">
              <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/50">Build</p>
              <dl class="mt-4 space-y-3 text-sm">
                <div class="flex items-baseline justify-between">
                  <dt class="text-base-content/50">SKU</dt>
                  <dd class="font-mono text-xs text-base-content/80">{product.sku}</dd>
                </div>
                {composerPackage && (
                  <div class="flex items-baseline justify-between">
                    <dt class="text-base-content/50">Package</dt>
                    <dd class="font-mono text-xs text-base-content/80 truncate ml-3">{composerPackage}</dd>
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
