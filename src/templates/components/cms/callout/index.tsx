/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Callout — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { CmsCalloutStandard } from './CmsCalloutStandard';
import type { CmsCalloutProps } from './CmsCalloutStandard';

export type { CmsCalloutProps };

const variants: Record<string, FC<CmsCalloutProps>> = {
  standard: CmsCalloutStandard,
};

export const Callout: FC<CmsCalloutProps> = (props) => {
  const variant = getVariant('cms', 'callout', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { CmsCalloutStandard };