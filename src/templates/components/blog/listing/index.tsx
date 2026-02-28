/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Blog Listing — Variant Index
 *
 * Re-exports the active BlogListing variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { BlogListingGrid } from './BlogListingGrid';
import { BlogListingList } from './BlogListingList';
import type { BlogPost } from '../card';

export interface BlogListingProps {
  posts: BlogPost[];
  heading?: string;
}

const variants: Record<string, FC<BlogListingProps>> = {
  grid: BlogListingGrid,
  list: BlogListingList,
};

export const BlogListing: FC<BlogListingProps> = (props) => {
  const variant = getVariant('blog', 'listing', 'grid');
  const Component = variants[variant] ?? variants.grid;
  return <Component {...props} />;
};

export { BlogListingGrid, BlogListingList };