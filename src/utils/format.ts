/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Shared formatting utilities for server-side templates.
 */

/** Strip .html suffix from Maho URL paths */
export function cleanUrlPath(path: string | undefined | null): string {
  if (!path) return '';
  return path.replace(/\.html$/, '');
}

export function formatPrice(amount: number | null | undefined, currency: string = 'USD'): string {
  // `== null` catches undefined too. The catalog API OMITS price / finalPrice
  // when the B2B gate withholds them, so they arrive undefined rather than
  // null — and Intl formats undefined as "$NaN", which is what shoppers saw on
  // gated listings.
  if (amount == null) return '';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
}