/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Video Embed — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { VideoEmbedStandard } from './VideoEmbedStandard';
import type { VideoEmbedProps } from './VideoEmbedStandard';

export type { VideoEmbedProps };

const variants: Record<string, FC<VideoEmbedProps>> = {
  standard: VideoEmbedStandard,
};

export const VideoEmbed: FC<VideoEmbedProps> = (props) => {
  const variant = getVariant('cms', 'video-embed', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { VideoEmbedStandard };