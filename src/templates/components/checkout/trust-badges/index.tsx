/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Trust Badges — Variant Index (Checkout)
 *
 * Re-exports the active checkout TrustBadges variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { CheckoutTrustBadges } from './CheckoutTrustBadges';
import type { CheckoutTrustBadgesProps } from './CheckoutTrustBadges';

const variants: Record<string, FC<any>> = {
  standard: CheckoutTrustBadges,
};

/**
 * Resolves the checkout TrustBadges variant from page.json.
 */
export const TrustBadges: FC<CheckoutTrustBadgesProps> = (props) => {
  const variant = getVariant('checkout', 'trust-badges', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { CheckoutTrustBadges };