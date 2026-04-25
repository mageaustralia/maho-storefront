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
 * Minimalist monochrome card: name, tagline, composer_package (mono),
 * price line, "View details" link. No hero image in v1 — the catalog
 * doesn't ship images yet and a placeholder is honest about that.
 */
export const ExtensionCard: FC<ExtensionCardProps> = ({ extension }) => {
  const single = formatPrice(extension.price_single, extension.currency);
  const unlimited = formatPrice(extension.price_unlimited, extension.currency);
  let priceLine: string;
  if (single && unlimited) {
    priceLine = `${single} single · ${unlimited} unlimited`;
  } else if (single) {
    priceLine = single;
  } else {
    priceLine = 'Free';
  }

  const href = `/marketplace/${encodeURIComponent(extension.url_key)}`;

  return (
    <a
      href={href}
      class="group block border border-base-300 bg-base-100 p-6 transition-colors hover:border-base-content/30"
    >
      <h3 class="text-lg font-semibold text-base-content group-hover:underline">
        {extension.name}
      </h3>
      {extension.tagline && (
        <p class="mt-2 text-sm leading-relaxed text-base-content/70 line-clamp-3">
          {extension.tagline}
        </p>
      )}
      <p class="mt-4 font-mono text-xs text-base-content/60">
        {extension.composer_package}
      </p>
      <p class="mt-3 text-sm font-medium text-base-content">{priceLine}</p>
      <p class="mt-4 text-xs text-base-content/50">
        Maho {extension.supported_maho_versions}
      </p>
      <p class="mt-5 text-sm font-medium text-base-content group-hover:underline">
        View extension →
      </p>
    </a>
  );
};
