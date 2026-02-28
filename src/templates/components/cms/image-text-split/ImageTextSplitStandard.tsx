/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { rewriteContentUrls } from '../../../../content-rewriter';

export interface ImageTextSplitProps {
  image: string;
  imageAlt?: string;
  title?: string;
  content: string;
  imagePosition?: 'left' | 'right';
  ctaText?: string;
  ctaUrl?: string;
}

/**
 * Image Text Split — Standard
 *
 * Image on one side, text content on the other. Flex layout with responsive stacking.
 * Image takes ~45% width on desktop.
 */
export const ImageTextSplitStandard: FC<ImageTextSplitProps> = ({
  image,
  imageAlt = '',
  title,
  content,
  imagePosition = 'left',
  ctaText,
  ctaUrl,
}) => {
  const imageBlock = (
    <div class="w-full md:w-[45%] shrink-0">
      <img
        src={image}
        alt={imageAlt}
        class="w-full h-auto rounded-box object-cover"
        loading="lazy"
      />
    </div>
  );

  const textBlock = (
    <div class="flex-1 flex flex-col justify-center gap-4">
      {title && <h2 class="text-2xl md:text-3xl font-bold">{title}</h2>}
      <div
        class="prose prose-base max-w-none text-base-content/80"
        dangerouslySetInnerHTML={{ __html: rewriteContentUrls(content) }}
      />
      {ctaText && ctaUrl && (
        <div>
          <a href={ctaUrl} class="btn btn-primary">
            {ctaText}
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]">
      <div class={`flex flex-col md:flex-row gap-6 md:gap-10 items-center ${imagePosition === 'right' ? 'md:flex-row-reverse' : ''}`}>
        {imageBlock}
        {textBlock}
      </div>
    </div>
  );
};