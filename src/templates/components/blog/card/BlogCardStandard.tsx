/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface BlogPost {
  title: string;
  urlKey: string;
  shortContent?: string;
  featuredImage?: string;
  publishDate?: string;
  author?: string;
}

interface BlogCardProps {
  post: BlogPost;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Standard Blog Card
 *
 * Card with featured image, title, excerpt, date, and read-more link.
 * Uses DaisyUI card component with image figure.
 */
export const BlogCardStandard: FC<BlogCardProps> = ({ post }) => {
  const postUrl = `/blog/${post.urlKey}`;

  return (
    <article class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
      <a href={postUrl} class="flex flex-col flex-1" data-turbo-prefetch="true">
        {post.featuredImage && (
          <figure class="aspect-video bg-base-200 overflow-hidden">
            <img
              src={post.featuredImage}
              alt={post.title}
              loading="lazy"
              decoding="async"
              class="w-full h-full object-cover"
            />
          </figure>
        )}
        <div class="card-body p-4 gap-2 flex-1">
          {/* Meta line */}
          <div class="flex items-center gap-2 text-xs text-base-content/50">
            {post.publishDate && <time datetime={post.publishDate}>{formatDate(post.publishDate)}</time>}
            {post.author && post.publishDate && <span>·</span>}
            {post.author && <span>{post.author}</span>}
          </div>

          <h3 class="text-base font-semibold leading-snug line-clamp-2">{post.title}</h3>

          {post.shortContent && (
            <p class="text-sm text-base-content/70 line-clamp-3 flex-1">{post.shortContent}</p>
          )}

          <span class="text-sm font-medium text-primary mt-2 inline-flex items-center gap-1">
            Read more
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </span>
        </div>
      </a>
    </article>
  );
};