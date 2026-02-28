/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Image Text Split — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { ImageTextSplitStandard } from './ImageTextSplitStandard';
import type { ImageTextSplitProps } from './ImageTextSplitStandard';

export type { ImageTextSplitProps };

const variants: Record<string, FC<ImageTextSplitProps>> = {
  standard: ImageTextSplitStandard,
};

export const ImageTextSplit: FC<ImageTextSplitProps> = (props) => {
  const variant = getVariant('cms', 'image-text-split', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { ImageTextSplitStandard };