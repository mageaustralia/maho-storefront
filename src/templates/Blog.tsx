/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, StorefrontStore, BlogCategory } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { LayoutShell } from './components/LayoutShell';
import { Seo } from './components/Seo';
import { djb2 } from '../utils/hash';
import { getSection } from '../page-config';

export interface BlogPostSummary {
  identifier: string;
  title: string;
  shortContent: string | null;
  imageUrl: string | null;
  createdAt: string | null;
  categoryIds?: number[];
}

interface BlogPageProps {
  config: StoreConfig;
  categories: Category[];
  posts: BlogPostSummary[];
  blogCategories?: BlogCategory[];
  activeCategory?: BlogCategory | null;
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  sidebarLeft?: string | null;
  sidebarRight?: string | null;
  lastChecked?: number;
  devData?: DevData | null;
}

const formatDate = (s: string | null) =>
  s
    ? new Date(s).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

export const BlogPage: FC<BlogPageProps> = ({ config, categories, posts, blogCategories, activeCategory, stores, currentStoreCode, sidebarLeft, sidebarRight, lastChecked, devData }) => {
  const [featured, ...rest] = posts;

  // Brand-overridable copy. Defaults are generic; brands set their voice
  // via themes/<theme>/page.json under `pages.blog.{kicker,headline,headlineAccent,subheadline}`.
  // headlineAccent is rendered as an italic accent span after the headline.
  const kickerCopy = getSection<string>('blog', 'kicker', 'Journal', currentStoreCode);
  const headlineCopy = getSection<string>('blog', 'headline', 'Latest articles', currentStoreCode);
  const headlineAccent = getSection<string>('blog', 'headlineAccent', '', currentStoreCode);
  const subheadlineCopy = getSection<string>('blog', 'subheadline', '', currentStoreCode);

  return (
    <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
      <Seo
        title={activeCategory ? `${activeCategory.name} | Blog | ${config.storeName}` : `Blog | ${config.storeName}`}
        description={activeCategory?.metaDescription ?? 'Latest news and articles'}
      />
      <div hidden
        data-freshness-type="blog-list"
        data-freshness-key="blog-posts"
        data-freshness-api="/api/blog-posts?order[publishDate]=desc&itemsPerPage=100"
        data-freshness-checked={String(lastChecked ?? 0)}
        data-freshness-version={djb2(posts.map(p => `${p.identifier}:${p.title}:${p.shortContent ?? ''}:${p.imageUrl ?? ''}:${p.createdAt ?? ''}`).join('|'))}
      />

      {/* Editorial header */}
      <section class="border-b border-base-300/60 bg-gradient-to-b from-base-200/40 to-transparent">
        <div class="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div class="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">
            <span class="inline-block h-px w-10 bg-base-content/40"></span>
            {activeCategory ? activeCategory.name : kickerCopy}
          </div>
          <h1 class="mt-6 font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
            {activeCategory ? activeCategory.name : (
              <>
                {headlineCopy}
                {headlineAccent && <> <span class="italic text-base-content/55">{headlineAccent}</span></>}
              </>
            )}
          </h1>
          {subheadlineCopy && (
            <p class="mt-6 max-w-2xl text-base leading-relaxed text-base-content/70 md:text-lg">
              {subheadlineCopy}
            </p>
          )}

          {blogCategories && blogCategories.length > 0 && (
            <div class="mt-10 flex flex-wrap gap-2">
              <a
                href="/blog"
                class={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${!activeCategory ? 'border-base-content bg-base-content text-base-100' : 'border-base-300 text-base-content/70 hover:border-base-content/50'}`}
                data-turbo-prefetch="true"
              >
                All
              </a>
              {blogCategories.map(cat => (
                <a
                  key={cat.id}
                  href={`/blog/category/${cat.urlKey}`}
                  class={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${activeCategory?.id === cat.id ? 'border-base-content bg-base-content text-base-100' : 'border-base-300 text-base-content/70 hover:border-base-content/50'}`}
                  data-turbo-prefetch="true"
                >
                  {cat.name}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <LayoutShell template="one_column" sidebarLeft={sidebarLeft} sidebarRight={sidebarRight}>
        <section
          class="mx-auto max-w-6xl px-4 py-12 md:py-16"
          data-freshness-target="blog-page"
        >
          {posts.length === 0 ? (
            <div
              class="rounded-2xl border border-dashed border-base-300 bg-base-100 p-16 text-center"
              data-freshness-target="blog-empty"
            >
              <p class="font-serif text-2xl">No posts yet.</p>
              <p class="mt-3 text-sm text-base-content/60">Working on it. Watch this space.</p>
            </div>
          ) : (
            <>
              {/* Featured post — first one in full-width hero card */}
              {featured && !activeCategory && (
                <a
                  href={`/blog/${featured.identifier}`}
                  class="group mb-16 grid grid-cols-1 gap-8 overflow-hidden lg:grid-cols-[1.2fr_1fr]"
                  data-turbo-prefetch="true"
                >
                  <figure class="relative aspect-[5/3] overflow-hidden rounded-2xl bg-base-200">
                    {featured.imageUrl ? (
                      <img
                        src={featured.imageUrl}
                        alt={featured.title}
                        loading="eager"
                        decoding="async"
                        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : null}
                    <span class="absolute left-5 top-5 inline-flex items-center rounded-full bg-base-content/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-base-100 backdrop-blur">
                      Featured
                    </span>
                  </figure>
                  <div class="flex flex-col justify-center">
                    {featured.createdAt && (
                      <p class="font-mono text-xs uppercase tracking-[0.18em] text-base-content/50">
                        {formatDate(featured.createdAt)}
                      </p>
                    )}
                    <h2 class="mt-4 font-serif text-3xl leading-[1.1] tracking-tight md:text-4xl">
                      {featured.title}
                    </h2>
                    {featured.shortContent && (
                      <p class="mt-4 text-base leading-relaxed text-base-content/70 line-clamp-4">
                        {featured.shortContent}
                      </p>
                    )}
                    <p class="mt-6 text-sm font-medium text-base-content">
                      Read article{' '}
                      <span class="inline-block transition-transform group-hover:translate-x-1">→</span>
                    </p>
                  </div>
                </a>
              )}

              {/* Rest of posts in 3-up grid */}
              <div
                class="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3"
                data-freshness-target="blog-grid"
              >
                {(activeCategory ? posts : rest).map((post) => (
                  <a
                    key={post.identifier}
                    href={`/blog/${post.identifier}`}
                    class="group flex flex-col"
                    data-turbo-prefetch="true"
                  >
                    <figure class="aspect-[5/3] overflow-hidden rounded-xl bg-base-200">
                      {post.imageUrl ? (
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          loading="lazy"
                          decoding="async"
                          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      ) : null}
                    </figure>
                    <div class="mt-5">
                      {post.createdAt && (
                        <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-base-content/50">
                          {formatDate(post.createdAt)}
                        </p>
                      )}
                      <h3 class="mt-3 font-serif text-2xl leading-tight tracking-tight transition-colors group-hover:text-accent">
                        {post.title}
                      </h3>
                      {post.shortContent && (
                        <p class="mt-3 text-sm leading-relaxed text-base-content/65 line-clamp-3">
                          {post.shortContent}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </section>
      </LayoutShell>
    </Layout>
  );
};
