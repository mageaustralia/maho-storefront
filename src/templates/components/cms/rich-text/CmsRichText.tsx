/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { rewriteContentUrls } from '../../../../content-rewriter';

export interface CmsRichTextProps {
  content: string;
  maxWidth?: string;
}

/**
 * CMS Rich Text — Standard
 *
 * Wraps HTML content in a prose container with proper typography classes.
 * Uses DaisyUI prose for typographic rhythm.
 */
export const CmsRichText: FC<CmsRichTextProps> = ({ content, maxWidth }) => (
  <div
    class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]"
    style={maxWidth ? { maxWidth } : undefined}
  >
    <div
      class="prose prose-base max-w-none prose-headings:text-base-content prose-p:text-base-content/80 prose-a:text-primary prose-strong:text-base-content"
      dangerouslySetInnerHTML={{ __html: rewriteContentUrls(content) }}
    />
  </div>
);