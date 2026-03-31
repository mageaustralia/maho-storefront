/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { StoreConfig } from '../../types';
import { getVariant, getSection } from '../../page-config';

/**
 * Search overlay — full-width search bar at top with results panel below.
 *
 * Backend resolved from:
 *   1. StoreConfig.extensions.search.backend (API, set by installed modules)
 *   2. page.json search.components.backend
 *   3. "default"
 */
export const SearchOverlay: FC<{ config?: StoreConfig }> = ({ config }) => {
  const apiSearch = (config?.extensions as Record<string, any>)?.search;
  const backend = apiSearch?.backend || getVariant('search', 'backend', 'default');
  const isMeilisearch = backend === 'meilisearch';
  const ctrl = isMeilisearch ? 'search-meilisearch' : 'search';

  const ms = apiSearch?.meilisearch || getSection<Record<string, string>>('search', 'meilisearch', {});
  const currency = config?.baseCurrencyCode || 'AUD';

  const dataAttrs: Record<string, string> = {
    'data-controller': ctrl,
    'data-action': `keydown.esc@document->${ctrl}#close`,
  };

  if (isMeilisearch) {
    if (ms.host) dataAttrs['data-search-meilisearch-host-value'] = ms.host;
    if (ms.apiKey) dataAttrs['data-search-meilisearch-api-key-value'] = ms.apiKey;
    if (ms.indexPrefix) dataAttrs['data-search-meilisearch-index-prefix-value'] = ms.indexPrefix;
    dataAttrs['data-search-meilisearch-currency-value'] = currency;
  }

  return (
  <div class="search-overlay" {...dataAttrs}>
    {/* Full-width search bar pinned to top */}
    <div class="w-full bg-base-100 border-b border-base-300 shadow-sm">
      <div class="max-w-screen-xl mx-auto px-4 py-3">
        <div class="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search products, categories, pages..."
            class="flex-1 border-none outline-none text-lg py-1 text-base-content bg-transparent placeholder:text-base-content/40"
            {...{[`data-${ctrl}-target`]: 'input'}}
            data-action={`input->${ctrl}#onInput keydown.enter->${ctrl}#submitSearch`}
            autocomplete="off"
          />
          <button class="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-base-content"
            data-action={`${ctrl}#close`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    {/* Results panel */}
    <div class="w-full max-w-screen-xl mx-auto bg-base-100 shadow-xl overflow-y-auto"
      style="max-height: calc(100vh - 60px); display: none"
      {...{[`data-${ctrl}-target`]: 'results'}} >
      <div class="flex max-md:flex-col">
        {/* Left sidebar */}
        <div class="w-80 max-md:w-full shrink-0 border-r max-md:border-r-0 max-md:border-b border-base-200 p-5 space-y-5">
          <div {...{[`data-${ctrl}-target`]: 'categoryResults'}}></div>
          <div {...{[`data-${ctrl}-target`]: 'pageResults'}}></div>
        </div>
        {/* Product grid */}
        <div class="flex-1 p-5">
          <div {...{[`data-${ctrl}-target`]: 'productResults'}}></div>
        </div>
      </div>
    </div>

    {/* Empty state */}
    <div class="w-full max-w-screen-xl mx-auto bg-base-100 shadow-xl" {...{[`data-${ctrl}-target`]: 'empty'}} style="display:none">
      <div class="py-12 px-5 text-center text-base-content/50">
        <p>No results found</p>
      </div>
    </div>
  </div>
  );
};
