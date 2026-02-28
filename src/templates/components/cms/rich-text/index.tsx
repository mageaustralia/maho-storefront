/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Rich Text — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { CmsRichText } from './CmsRichText';
import type { CmsRichTextProps } from './CmsRichText';

export type { CmsRichTextProps };

const variants: Record<string, FC<CmsRichTextProps>> = {
  standard: CmsRichText,
};

export const RichText: FC<CmsRichTextProps> = (props) => {
  const variant = getVariant('cms', 'rich-text', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { CmsRichText };