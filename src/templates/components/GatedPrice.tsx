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
  // Backend picks the right pair per caller: guests get "Log in to see
  // pricing" → /login, signed-in-but-ineligible customers get "Trade customer
  // pricing" → /trade-application. Fall back to sensible guest defaults when
  // the backend hasn't emitted the CTA (e.g. older module version).
  const message = gate?.hiddenPriceMessage || 'Log in to see pricing';
  const cta = gate?.hiddenPriceCta ?? { label: 'Log in', href: '/login' };
  const isCustomer = gate?.callerIsGuest === false;
  return (
    <span
      data-b2b-login-prompt
      data-b2b-caller={isCustomer ? 'customer' : 'guest'}
      class={className || 'inline-flex items-baseline text-sm text-base-content/70'}
    >
      {isCustomer && message ? (
        <span class="block text-base-content/70 mb-1">{message}</span>
      ) : null}
      <a href={cta.href} class="underline hover:text-primary">
        {isCustomer ? cta.label : message}
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
