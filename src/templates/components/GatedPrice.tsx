/**
 * Maho Storefront - GatedPrice
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Renders either the price children OR a "Log in to see pricing" prompt, based
 * on `product.extensions.b2bAccess.gateFlags.hidePrice`. Used by every
 * price-rendering template so a single condition governs the behaviour
 * everywhere.
 *
 * The catalog API withholds price / finalPrice / specialPrice / minimalPrice
 * when the gate says to hide them, so this component is defensive rendering
 * layered on top of an already-enforced server-side rule. Belt-and-braces
 * (see reference/b2b-integration-pattern for the rationale).
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product } from '../../types';

interface GatedPriceProps {
  product: Pick<Product, 'extensions' | 'price' | 'finalPrice'>;
  /** Rendered when the price is visible. */
  children: unknown;
  /** Optional wrapper class for the login-prompt state. */
  class?: string;
}

export const GatedPrice: FC<GatedPriceProps> = ({ product, children, class: className }) => {
  const gate = product.extensions?.b2bAccess;
  const hidden = gate?.gateFlags?.hidePrice === true;
  if (!hidden) {
    return <>{children}</>;
  }
  const message = gate?.hiddenPriceMessage || 'Log in to see pricing';
  return (
    <span
      data-b2b-login-prompt
      class={className || 'inline-flex items-baseline text-sm text-base-content/70'}
    >
      <a href="/login" class="underline hover:text-primary">
        {message}
      </a>
    </span>
  );
};

/**
 * Should the "Add to Cart" button render at all?
 * Used to suppress the button when B2B Access says purchase is blocked.
 */
export function canPurchase(product: Pick<Product, 'extensions'>): boolean {
  const g = product.extensions?.b2bAccess?.gateFlags;
  return g ? g.canCheckout !== false : true;
}
