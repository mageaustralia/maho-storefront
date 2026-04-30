/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, CmsPage, StorefrontStore, BlogCategory } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { LayoutShell } from './components/LayoutShell';
import { Seo } from './components/Seo';
import { djb2 } from '../utils/hash';
import { rewriteContentUrls } from '../content-rewriter';
import { getSection } from '../page-config';

interface BlogPostPageProps {
  config: StoreConfig;
  categories: Category[];
  post: CmsPage;
  postCategories?: BlogCategory[];
  blogCategories?: BlogCategory[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  sidebarLeft?: string | null;
  sidebarRight?: string | null;
  devData?: DevData | null;
}

export const BlogPostPage: FC<BlogPostPageProps> = ({ config, categories, post, postCategories, blogCategories, stores, currentStoreCode, sidebarLeft, sidebarRight, devData }) => {
  // Support both CmsPage (identifier) and BlogPost (urlKey) types
  const postSlug = post.identifier ?? (post as any).urlKey ?? '';
  const blogKicker = getSection<string>('blog', 'kicker', 'Journal', currentStoreCode);

  return (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo
      title={`${post.title} | Blog | ${config.storeName}`}
      description={post.metaDescription ?? undefined}
      canonicalUrl={`${config.baseUrl}/blog/${postSlug}`}
      ogImage={post.imageUrl ?? undefined}
      siteName={config.storeName}
    />
    {/* Freshness metadata - client JS checks API if _lastChecked > 60s */}
    <div hidden
      data-freshness-type="blog"
      data-freshness-key={`blog:${postSlug}`}
      data-freshness-api={`/api/blog-posts?urlKey=${encodeURIComponent(postSlug)}`}
      data-freshness-checked={(post as any)._lastChecked ?? '0'}
      data-freshness-version={djb2(`${post.updatedAt}|${post.title ?? ''}|${post.content ?? ''}`)}
    />

    <LayoutShell template="one_column" sidebarLeft={sidebarLeft} sidebarRight={sidebarRight}>
      <article>
        {/* Editorial header band */}
        <header class="border-b border-base-300/60 bg-gradient-to-b from-base-200/40 to-transparent">
          <div class="mx-auto max-w-3xl px-4 py-12 md:py-16">
            <nav class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              <a href="/blog" class="transition-colors hover:text-base-content" data-turbo-prefetch="true">
                ← {blogKicker}
              </a>
            </nav>
            {postCategories && postCategories.length > 0 && (
              <div class="mt-6 flex flex-wrap gap-2">
                {postCategories.map(cat => (
                  <a
                    key={cat.id}
                    href={`/blog/category/${cat.urlKey}`}
                    class="rounded-full border border-base-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-base-content/70 transition-colors hover:border-base-content/40"
                    data-turbo-prefetch="true"
                  >
                    {cat.name}
                  </a>
                ))}
              </div>
            )}
            <h1
              class="mt-6 font-serif text-4xl leading-[1.05] tracking-tight md:text-6xl"
              data-freshness-target="blog-title"
            >
              {post.contentHeading || post.title}
            </h1>
            {post.createdAt && (
              <p class="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-base-content/50">
                {new Date(post.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        </header>

        {post.imageUrl && (
          <figure class="mx-auto max-w-5xl px-4 pt-10">
            <img
              src={post.imageUrl}
              alt={post.title}
              class="aspect-[2/1] w-full rounded-2xl object-cover"
              data-freshness-target="blog-hero"
              loading="eager"
              decoding="async"
            />
          </figure>
        )}

        {post.content && (
          <div class="mx-auto max-w-3xl px-4 py-12 md:py-16">
            <div
              class="prose prose-base max-w-none text-base-content/85 prose-headings:font-serif prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-12 prose-h3:text-xl prose-h3:mt-10 prose-a:text-accent prose-a:no-underline hover:prose-a:underline [&_.btn]:!text-primary-content [&_.btn]:!no-underline prose-blockquote:border-l-base-content/30 prose-blockquote:font-serif prose-blockquote:italic prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-code:bg-base-200 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-base-content prose-pre:text-base-100 prose-img:rounded-xl prose-hr:border-base-300/60"
              data-freshness-target="blog-content"
              dangerouslySetInnerHTML={{ __html: rewriteContentUrls(post.content) }}
            />

            <nav class="mt-16 border-t border-base-300/60 pt-8">
              <a href="/blog" class="font-mono text-xs uppercase tracking-[0.18em] text-base-content/60 transition-colors hover:text-base-content" data-turbo-prefetch="true">
                ← Back to {blogKicker}
              </a>
            </nav>
          </div>
        )}
      </article>
    </LayoutShell>
  </Layout>
  );
};