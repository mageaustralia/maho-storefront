/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Product as ProductType } from '../../../types';

export interface OptionsProps {
  product: ProductType;
  currency: string;
  formatPrice: (amount: number | null, currency: string) => string;
}
