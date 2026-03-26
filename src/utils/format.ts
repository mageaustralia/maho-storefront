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

export function formatPrice(amount: number | null, currency: string = 'USD'): string {
  if (amount === null) return '';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
}