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

  return (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo
      title={`${post.title} | Blog | ${config.storeName}`}
      description={post.metaDescription ?? undefined}
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
      <article class="py-6 max-w-3xl mx-auto">
        {/* Breadcrumbs */}
        <nav class="text-sm breadcrumbs mb-4" aria-label="Breadcrumb">
          <ul>
            <li><a href="/" data-turbo-prefetch="true">Home</a></li>
            <li><a href="/blog" data-turbo-prefetch="true">Blog</a></li>
            <li>{post.title}</li>
          </ul>
        </nav>

        <header class="mb-6">
          {post.contentHeading && <h1 class="text-3xl font-bold tracking-tight">{post.contentHeading}</h1>}
          {!post.contentHeading && <h1 class="text-3xl font-bold tracking-tight">{post.title}</h1>}
          <div class="flex flex-wrap items-center gap-3 mt-2">
            {post.createdAt && (
              <time class="text-sm text-base-content/50">{new Date(post.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
            )}
            {postCategories && postCategories.length > 0 && (
              <div class="flex flex-wrap gap-1.5">
                {postCategories.map(cat => (
                  <a key={cat.id} href={`/blog/category/${cat.urlKey}`} class="badge badge-sm badge-ghost" data-turbo-prefetch="true">{cat.name}</a>
                ))}
              </div>
            )}
          </div>
        </header>
        {post.imageUrl && (
          <img src={post.imageUrl} alt={post.title} class="w-full rounded-lg mb-6" />
        )}
        {post.content && (
          <div class="prose max-w-none" dangerouslySetInnerHTML={{ __html: rewriteContentUrls(post.content) }} />
        )}
        <nav class="mt-8 pt-4 border-t border-base-200">
          <a href="/blog" class="link link-hover text-sm" data-turbo-prefetch="true">&larr; Back to Blog</a>
        </nav>
      </article>
    </LayoutShell>
  </Layout>
  );
};