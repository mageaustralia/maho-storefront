/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Shared formatting utilities for server-side templates.
 */

export function formatPrice(amount: number | null, currency: string = 'AUD'): string {
  if (amount === null) return '';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
}