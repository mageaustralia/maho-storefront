/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Product Layout — Variant Index
 *
 * Controls the overall product page grid arrangement.
 * 'standard' = existing 50/50 two-column layout (gallery left, info right)
 * 'masonry' = wide gallery (~65%) + slim sidebar (~35%) with accordion content
 */
import { getVariant } from '../../../../page-config';

export function getProductLayout(): string {
  return getVariant('product', 'layout', 'standard');
}

export { LayoutMasonry } from './LayoutMasonry';