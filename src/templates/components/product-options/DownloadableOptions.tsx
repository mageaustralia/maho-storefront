/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { OptionsProps } from './types';

export const DownloadableOptions: FC<OptionsProps> = ({ product, currency, formatPrice }) => {
  if (!product.downloadableLinks?.length) return null;
  return (
    <div>
      <label class="text-sm font-medium mb-2 block">Available Downloads</label>
      {product.downloadableLinks.map((link) => (
        <label key={link.id} class="flex items-center gap-2 text-sm mb-1">
          {product.linksPurchasedSeparately && (
            <input type="checkbox" class="checkbox checkbox-xs" data-download-link-id={String(link.id)} />
          )}
          <span>{link.title}</span>
          {product.linksPurchasedSeparately && link.price > 0 && (
            <span class="text-base-content/50">+{formatPrice(link.price, currency)}</span>
          )}
          {link.sampleUrl && (
            <a href={link.sampleUrl} target="_blank" rel="noopener" class="text-primary text-xs ml-auto">Sample</a>
          )}
        </label>
      ))}
    </div>
  );
};
