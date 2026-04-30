/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product } from '../../../types';
import { formatPrice, getAttribute, classifyLicenseTier, licenseTotalPrice, normalizeDownloadableLinks } from '../../../marketplace-api';

interface ExtensionCardProps {
  product: Product;
  currency: string;
}

/** Editorial extension card. Reads everything off the standard Product DTO —
 *  no marketplace-specific shape. tagline/composer_package/maho-versions
 *  come from additionalAttributes; tier prices come from downloadableLinks. */
export const ExtensionCard: FC<ExtensionCardProps> = ({ product, currency }) => {
  const tagline = getAttribute(product, 'marketplace_tagline');
  const composerPackage = getAttribute(product, 'composer_package');
  const supportedMaho = getAttribute(product, 'supported_maho_versions') ?? '>=26.0';

  const linksRaw = normalizeDownloadableLinks(product);
  const single = linksRaw.find(l => classifyLicenseTier(l.title) === 'single');
  const unlimited = linksRaw.find(l => classifyLicenseTier(l.title) === 'unlimited');

  const singleLabel = single ? formatPrice(licenseTotalPrice(product, single.price), currency) : null;
  const unlimitedLabel = unlimited ? formatPrice(licenseTotalPrice(product, unlimited.price), currency) : null;
  const isFree = !singleLabel && !unlimitedLabel;
  const href = `/marketplace/${encodeURIComponent(product.urlKey ?? product.sku)}`;

  return (
    <a
      href={href}
      class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-base-300/70 bg-base-100 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-base-content/40 hover:shadow-[0_20px_40px_-20px_rgba(10,25,48,0.18)]"
      data-turbo-prefetch="true"
    >
      {product.imageUrl ? (
        <figure class="-mx-7 -mt-7 mb-5 aspect-[3/2] overflow-hidden bg-base-200/50">
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </figure>
      ) : (
        <span class="-mx-7 -mt-7 mb-5 block h-px bg-base-300/60"></span>
      )}

      <div class="absolute right-5 top-5">
        {isFree ? (
          <span class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
            Free
          </span>
        ) : (
          <span class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-900">
            Pro
          </span>
        )}
      </div>

      <div class="flex-1 pr-16">
        <h3 class="font-serif text-2xl leading-tight tracking-tight text-base-content transition-colors">
          {product.name}
        </h3>
        {tagline && (
          <p class="mt-3 text-sm leading-relaxed text-base-content/65 line-clamp-3">
            {tagline}
          </p>
        )}
      </div>

      <div class="mt-6 space-y-3 border-t border-base-300/60 pt-5">
        {composerPackage && (
          <p class="font-mono text-[11px] uppercase tracking-wider text-base-content/40">
            {composerPackage}
          </p>
        )}
        <div class="flex items-baseline justify-between">
          {singleLabel ? (
            <p class="text-base-content">
              <span class="text-xl font-semibold">{singleLabel}</span>
              <span class="ml-2 text-xs text-base-content/50">single</span>
            </p>
          ) : (
            <p class="text-xl font-semibold text-base-content">Free</p>
          )}
          <span class="text-xs text-base-content/40">
            Maho {supportedMaho.replace(/^>=/, '')}+
          </span>
        </div>
        {unlimitedLabel && (
          <p class="text-xs text-base-content/55">
            <span class="font-medium text-base-content/75">{unlimitedLabel}</span> unlimited
          </p>
        )}
        <p class="pt-2 text-sm font-medium text-base-content">
          View extension{' '}
          <span class="inline-block transition-transform group-hover:translate-x-1">→</span>
        </p>
      </div>

      <span class="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500/0 transition-transform duration-500 group-hover:scale-x-100"></span>
    </a>
  );
};
