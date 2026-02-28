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
import { LayoutShell } from './components/LayoutShell';
import { Seo } from './components/Seo';
import { djb2 } from '../utils/hash';

export interface BlogPostSummary {
  identifier: string;
  title: string;
  shortContent: string | null;
  imageUrl: string | null;
  createdAt: string | null;
}

interface BlogPageProps {
  config: StoreConfig;
  categories: Category[];
  posts: BlogPostSummary[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  sidebarLeft?: string | null;
  sidebarRight?: string | null;
  lastChecked?: number;
  devData?: DevData | null;
}

export const BlogPage: FC<BlogPageProps> = ({ config, categories, posts, stores, currentStoreCode, sidebarLeft, sidebarRight, lastChecked, devData }) => (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo title={`Blog | ${config.storeName}`} description="Latest news and articles" />
    <div hidden
      data-freshness-type="blog-list"
      data-freshness-key="blog-posts"
      data-freshness-api="/api/blog-posts?order[publishDate]=desc&itemsPerPage=100"
      data-freshness-checked={String(lastChecked ?? 0)}
      data-freshness-version={djb2(posts.map(p => `${p.identifier}:${p.title}:${p.shortContent ?? ''}:${p.imageUrl ?? ''}:${p.createdAt ?? ''}`).join('|'))}
    />
    <LayoutShell template="one_column" sidebarLeft={sidebarLeft} sidebarRight={sidebarRight}>
    <div class="py-6">
      {/* Breadcrumbs */}
      <nav class="text-sm breadcrumbs mb-4" aria-label="Breadcrumb">
        <ul>
          <li><a href="/" data-turbo-prefetch="true">Home</a></li>
          <li>Blog</li>
        </ul>
      </nav>

      <h1 class="text-3xl font-bold tracking-tight mb-6">Blog</h1>

      {posts.length > 0 ? (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <a key={post.identifier} href={`/blog/${post.identifier}`} class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden" data-turbo-prefetch="true">
              {post.imageUrl ? (
                <figure class="aspect-video bg-base-200">
                  <img src={post.imageUrl} alt={post.title} loading="lazy" decoding="async" class="w-full h-full object-cover" />
                </figure>
              ) : (
                <figure class="aspect-video bg-base-200" />
              )}
              <div class="card-body p-4 gap-1.5">
                {post.createdAt && <time class="text-xs text-base-content/50">{new Date(post.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}</time>}
                <h3 class="text-base font-semibold line-clamp-2">{post.title}</h3>
                {post.shortContent && <p class="text-sm text-base-content/60 line-clamp-3">{post.shortContent}</p>}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div class="text-center py-16 text-base-content/60">
          <p>No blog posts yet.</p>
        </div>
      )}
    </div>
    </LayoutShell>
  </Layout>
);