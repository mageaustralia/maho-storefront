/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { MarketplaceExtension } from '../../../types';
import { formatPrice } from '../../../marketplace-api';

interface ExtensionCardProps {
  extension: MarketplaceExtension;
}

/**
 * Minimalist monochrome card: tier badge, name, tagline,
 * composer_package (mono), price line, supported versions.
 * No hero image in v1 — the catalog doesn't ship images yet.
 */
export const ExtensionCard: FC<ExtensionCardProps> = ({ extension }) => {
  const single = formatPrice(extension.price_single, extension.currency);
  const unlimited = formatPrice(extension.price_unlimited, extension.currency);

  // Price line — shown below the badge row
  let priceLine: string;
  if (extension.tier === 'free') {
    priceLine = 'Free';
  } else if (single && unlimited) {
    priceLine = `${single} / ${unlimited}`;
  } else if (single) {
    priceLine = single;
  } else {
    priceLine = 'Paid';
  }

  // Badge: subtle pill, green for free / neutral for paid
  const badgeClass =
    extension.tier === 'free'
      ? 'inline-block px-2 py-0.5 text-xs font-medium rounded bg-success/15 text-success'
      : 'inline-block px-2 py-0.5 text-xs font-medium rounded bg-base-200 text-base-content/60';
  const badgeLabel = extension.tier === 'free' ? 'Free' : 'Paid';

  const href = `/marketplace/${encodeURIComponent(extension.url_key)}`;

  return (
    <a
      href={href}
      class="group flex flex-col border border-base-300 bg-base-100 p-6 transition-colors hover:border-base-content/30"
    >
      {/* Top row: badge + price */}
      <div class="mb-3 flex items-center justify-between gap-2">
        <span class={badgeClass}>{badgeLabel}</span>
        <span class="text-sm font-medium text-base-content tabular-nums">
          {priceLine}
        </span>
      </div>

      <h3 class="text-base font-semibold text-base-content group-hover:underline">
        {extension.name}
      </h3>
      {extension.tagline && (
        <p class="mt-2 text-sm leading-relaxed text-base-content/70 line-clamp-3 grow">
          {extension.tagline}
        </p>
      )}

      {/* Footer: composer package + maho versions */}
      <div class="mt-4 space-y-1">
        <p class="font-mono text-xs text-base-content/60">
          {extension.composer_package}
        </p>
        {extension.supported_maho_versions && (
          <p class="text-xs text-base-content/50">
            Maho {extension.supported_maho_versions}
          </p>
        )}
      </div>
    </a>
  );
};
