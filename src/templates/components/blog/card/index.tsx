/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Blog Card — Variant Index
 *
 * Re-exports the active BlogCard variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { BlogCardStandard } from './BlogCardStandard';
import { BlogCardMinimal } from './BlogCardMinimal';
import type { BlogPost } from './BlogCardStandard';

export type { BlogPost };

export interface BlogCardProps {
  post: BlogPost;
}

const variants: Record<string, FC<BlogCardProps>> = {
  standard: BlogCardStandard,
  minimal: BlogCardMinimal,
};

export const BlogCard: FC<BlogCardProps> = (props) => {
  const variant = getVariant('blog', 'card', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { BlogCardStandard, BlogCardMinimal };