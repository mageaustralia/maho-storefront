/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Trust Badges — Variant Index
 *
 * Re-exports the active TrustBadges variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { TrustBadgeRow } from './TrustBadgeRow';
import type { TrustBadgeRowProps } from './TrustBadgeRow';

const variants: Record<string, FC<TrustBadgeRowProps>> = {
  standard: TrustBadgeRow,
};

/**
 * Resolves the TrustBadges variant from page.json.
 */
export const TrustBadges: FC<TrustBadgeRowProps> = (props) => {
  const variant = getVariant('engagement', 'trust-badges', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { TrustBadgeRow };