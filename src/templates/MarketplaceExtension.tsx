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
import { getSection } from '../page-config';

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

  // Brand-overridable copy for the pricing aside note (commercial terms).
  const warrantyNote = getSection<string>('marketplaceExtension', 'warrantyNote', '', currentStoreCode);

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
              {single ? 'Pro' : 'Open source'}
            </span>
            {(extension as any).storefront_ready && (
              <span class="inline-flex items-center rounded-full bg-base-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-base-content/70">
                Maho Storefront ready
              </span>
            )}
          </div>

          <h1 class="mt-5 font-serif text-4xl leading-[1.05] tracking-tight md:text-6xl">
            {extension.name}
          </h1>
          {extension.tagline && (
            <p class="mt-5 max-w-3xl font-serif text-lg italic text-base-content/65 md:text-2xl">
              {extension.tagline}
            </p>
          )}
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div class="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_340px]">
          <article class="prose prose-base max-w-none text-base-content/85 prose-headings:font-serif prose-headings:tracking-tight prose-h2:text-3xl prose-h3:text-xl prose-a:text-accent prose-code:font-mono prose-code:text-sm">
            {extension.short_description && (
              <p class="text-lg leading-relaxed text-base-content/85">
                {extension.short_description}
              </p>
            )}
            {extension.description && (
              <div
                class="mt-6"
                dangerouslySetInnerHTML={{ __html: extension.description }}
              />
            )}
            {!extension.short_description && !extension.description && (
              <p class="text-base-content/60">
                No detailed description available yet.
              </p>
            )}
          </article>

          {/* Pricing + buy panel — uses the SAME `data-controller="product"`
              wiring as the regular product detail page. The two visible CTAs
              are tier shortcuts: each pre-selects its corresponding hidden
              download-link radio, then triggers product#stickyAdd via
              standard markup. No marketplace-specific cart logic. */}
          <aside
            class="space-y-5 lg:sticky lg:top-24 lg:self-start"
            data-controller="product"
            data-product-type-value={extension.type_id}
            data-product-product-id-value={String(extension.product_id)}
            data-product-sku-value={extension.sku}
            data-product-currency-value={extension.currency}
            data-product-name={extension.name}
            data-product-price={String(extension.price_single ?? 0)}
            data-product-final-price={String(extension.price_single ?? 0)}
            data-product-thumbnail={extension.image_url ?? ''}
            data-product-url-key={extension.url_key}
          >
            <div class="rounded-2xl border border-base-300/70 bg-base-100 p-6 shadow-[0_8px_24px_-12px_rgba(10,25,48,0.12)]">
              <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/50">
                Pricing
              </p>
              <div class="mt-4 space-y-1">
                {single ? (
                  <p class="font-serif text-3xl tracking-tight">
                    {single}
                    <span class="ml-2 text-sm font-sans font-normal text-base-content/55">
                      single-store
                    </span>
                  </p>
                ) : (
                  <p class="font-serif text-3xl tracking-tight">Free</p>
                )}
                {unlimited && (
                  <p class="text-base text-base-content/75">
                    {unlimited}
                    <span class="ml-2 text-sm text-base-content/50">unlimited</span>
                  </p>
                )}
              </div>

              {/* Hidden radios — one per downloadable link. The Buy CTAs
                  below set `checked` on the matching radio before triggering
                  product#stickyAdd, so product-controller's downloadable
                  branch picks up the right link via querySelectorAll
                  ('[data-download-link-id]:checked'). */}
              {extension.license_links?.map(link => (
                <input
                  key={link.id}
                  type="radio"
                  name="license-link"
                  data-download-link-id={String(link.id)}
                  data-tier={link.tier}
                  hidden
                />
              ))}

              {extension.license_links && extension.license_links.length > 0 && (
                <div class="mt-6 space-y-2">
                  {extension.license_links.map((link, idx) => {
                    const priceLabel = formatPrice(link.price, extension.currency) ?? '';
                    const tierLabel = link.tier === 'unlimited' ? 'Buy unlimited' : 'Buy single-store';
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
                        onclick={`var aside=this.closest('[data-controller~=&quot;product&quot;]');aside.querySelectorAll('[data-download-link-id]').forEach(function(r){r.checked=r.dataset.downloadLinkId===this.dataset.linkId}.bind(this));aside.querySelector('[data-product-target=&quot;addButton&quot;]').click();`}
                      >
                        {tierLabel} · {priceLabel}
                      </button>
                    );
                  })}
                  <p class="cart-message" data-product-target="message"></p>
                </div>
              )}

              {/* Standard product-controller hidden Add button — Buy CTAs
                  above .click() this after pre-selecting the right radio.
                  Hidden because the visible CTAs ARE the user-facing add
                  buttons. */}
              {extension.license_links && extension.license_links.length > 0 && (
                <button
                  type="button"
                  hidden
                  data-action="product#stickyAdd"
                  data-product-target="addButton"
                  aria-hidden="true"
                >
                  Add to cart
                </button>
              )}

              {warrantyNote && (
                <p class="mt-5 border-t border-base-300/60 pt-4 text-xs text-base-content/55">
                  {warrantyNote}
                </p>
              )}
            </div>

            <div class="rounded-2xl border border-base-300/70 bg-base-content p-5 text-base-100/90">
              <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-base-100/50">
                Install
              </p>
              <pre class="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                <span class="text-amber-300">$</span> composer require{'\n'}
                {'  '}{extension.composer_package}
              </pre>
              <p class="mt-3 border-t border-base-100/10 pt-3 text-[11px] text-base-100/45">
                PHP 8.3+ · Maho {extension.supported_maho_versions}
              </p>
            </div>

            <div class="rounded-2xl border border-base-300/70 bg-base-100 p-6">
              <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/50">
                Build
              </p>
              <dl class="mt-4 space-y-3 text-sm">
                <div class="flex items-baseline justify-between">
                  <dt class="text-base-content/50">SKU</dt>
                  <dd class="font-mono text-xs text-base-content/80">{extension.sku}</dd>
                </div>
                <div class="flex items-baseline justify-between">
                  <dt class="text-base-content/50">Version</dt>
                  <dd class="font-mono text-xs text-base-content/80">{extension.version}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
};
