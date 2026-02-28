/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { BlogPost } from '../card';

interface BlogListingListProps {
  posts: BlogPost[];
  heading?: string;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Blog Listing List
 *
 * Vertical list of horizontal blog entries. Image on the left, content on the right.
 * Good for archive pages or blog index where scanability matters.
 */
export const BlogListingList: FC<BlogListingListProps> = ({ posts, heading }) => {
  if (posts.length === 0) return null;

  return (
    <section class="py-8">
      <div class="container mx-auto px-4">
        {heading && <h2 class="text-2xl font-semibold mb-6">{heading}</h2>}
        <div class="flex flex-col divide-y divide-base-200">
          {posts.map((post) => {
            const postUrl = `/blog/${post.urlKey}`;
            return (
              <article key={post.urlKey} class="group py-6 first:pt-0 last:pb-0">
                <a
                  href={postUrl}
                  class="flex gap-5 no-underline text-base-content"
                  data-turbo-prefetch="true"
                >
                  {/* Image */}
                  {post.featuredImage && (
                    <div class="w-40 h-28 sm:w-56 sm:h-36 shrink-0 bg-base-200 rounded-lg overflow-hidden">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        loading="lazy"
                        decoding="async"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div class="flex flex-col justify-center gap-1.5 min-w-0 flex-1">
                    <div class="flex items-center gap-2 text-xs text-base-content/50">
                      {post.publishDate && <time datetime={post.publishDate}>{formatDate(post.publishDate)}</time>}
                      {post.author && post.publishDate && <span>·</span>}
                      {post.author && <span>{post.author}</span>}
                    </div>

                    <h3 class="text-lg font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>

                    {post.shortContent && (
                      <p class="text-sm text-base-content/60 line-clamp-2 hidden sm:block">{post.shortContent}</p>
                    )}
                  </div>
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};