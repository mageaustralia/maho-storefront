/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';

interface NotFoundPageProps {
  config: StoreConfig;
  categories: Category[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
  /** The path that 404'd, for the small grey footnote. */
  attemptedPath?: string | null;
}

export const NotFoundPage: FC<NotFoundPageProps> = ({
  config,
  categories,
  stores,
  currentStoreCode,
  devData,
  attemptedPath,
}) => (
  <Layout
    config={config}
    categories={categories}
    stores={stores}
    currentStoreCode={currentStoreCode}
    devData={devData}
  >
    <Seo
      title={`Not found — ${config.storeName}`}
      description="The page you're looking for doesn't exist or has moved."
      noindex
    />

    <section class="border-b border-base-300/60 bg-gradient-to-b from-base-200/40 to-transparent">
      <div class="mx-auto max-w-3xl px-4 py-20 md:py-28">
        <p class="font-mono text-xs uppercase tracking-[0.22em] text-base-content/50">
          404 · Not found
        </p>
        <h1 class="mt-6 font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
          That page <span class="italic text-base-content/55">isn't here.</span>
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-relaxed text-base-content/70 md:text-lg">
          The link might be old, the URL mistyped, or the page is no longer
          published. Either way, you have options.
        </p>

        <div class="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="/"
            class="inline-flex items-center gap-2 rounded-lg bg-base-content px-6 py-3 text-sm font-semibold text-base-100 transition-all hover:bg-accent"
          >
            ← Back to home
          </a>
          <a
            href="/marketplace"
            class="inline-flex items-center gap-2 text-sm font-medium text-base-content/70 underline-offset-4 transition-colors hover:text-base-content hover:underline"
          >
            Browse extensions →
          </a>
          <a
            href="/blog"
            class="inline-flex items-center gap-2 text-sm font-medium text-base-content/70 underline-offset-4 transition-colors hover:text-base-content hover:underline"
          >
            Read the journal →
          </a>
        </div>

        {attemptedPath && (
          <p class="mt-12 font-mono text-[11px] uppercase tracking-[0.18em] text-base-content/40">
            Tried: <span class="text-base-content/60">{attemptedPath}</span>
          </p>
        )}
      </div>
    </section>
  </Layout>
);
