/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { BlogPost } from './BlogCardStandard';

interface BlogCardProps {
  post: BlogPost;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Minimal Blog Card
 *
 * Text-only card without featured image. Title, date, and short excerpt.
 * Clean, typography-focused design for text-heavy layouts.
 */
export const BlogCardMinimal: FC<BlogCardProps> = ({ post }) => {
  const postUrl = `/blog/${post.urlKey}`;

  return (
    <article class="group h-full">
      <a href={postUrl} class="block py-4 no-underline text-base-content" data-turbo-prefetch="true">
        {post.publishDate && (
          <time class="text-xs text-base-content/40 uppercase tracking-wider" datetime={post.publishDate}>
            {formatDate(post.publishDate)}
          </time>
        )}

        <h3 class="text-base font-semibold leading-snug mt-1 mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>

        {post.shortContent && (
          <p class="text-sm text-base-content/60 line-clamp-2">{post.shortContent}</p>
        )}

        {post.author && (
          <span class="text-xs text-base-content/40 mt-2 block">By {post.author}</span>
        )}
      </a>
    </article>
  );
};