/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface VideoEmbedProps {
  url: string;
  title?: string;
}

/**
 * Video Embed — Standard
 *
 * Responsive 16:9 iframe wrapper for video content.
 * Works with YouTube, Vimeo, and other embeddable video sources.
 */
export const VideoEmbedStandard: FC<VideoEmbedProps> = ({ url, title = 'Video' }) => (
  <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]">
    <div class="aspect-video w-full rounded-box overflow-hidden">
      <iframe
        src={url}
        title={title}
        class="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  </div>
);