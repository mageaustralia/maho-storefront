/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { BlogCard } from '../card';
import type { BlogPost } from '../card';

interface BlogListingGridProps {
  posts: BlogPost[];
  heading?: string;
}

/**
 * Blog Listing Grid
 *
 * Responsive grid of blog cards: 1 column on mobile, 2 on tablet, 3 on desktop.
 * Uses the configured BlogCard variant for each post.
 */
export const BlogListingGrid: FC<BlogListingGridProps> = ({ posts, heading }) => {
  if (posts.length === 0) return null;

  return (
    <section class="py-8">
      <div class="container mx-auto px-4">
        {heading && <h2 class="text-2xl font-semibold mb-6">{heading}</h2>}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogCard key={post.urlKey} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
};