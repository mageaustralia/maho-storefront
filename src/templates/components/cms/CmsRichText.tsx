/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { rewriteContentUrls } from '../../../content-rewriter';

interface CmsRichTextProps {
  content: string;
  title?: string;
}

/**
 * CMS Rich Text
 *
 * Wrapper for WYSIWYG HTML content with proper typography.
 * Uses DaisyUI prose for typographic rhythm.
 */
export const CmsRichText: FC<CmsRichTextProps> = ({ content, title }) => (
  <article class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)] py-8">
    {title && <h1 class="text-3xl font-bold mb-6">{title}</h1>}
    <div
      class="prose prose-lg max-w-none prose-headings:text-base-content prose-p:text-base-content/80 prose-a:text-primary prose-strong:text-base-content"
      dangerouslySetInnerHTML={{ __html: rewriteContentUrls(content) }}
    />
  </article>
);