/**
 * Maho Storefront — Embeddable Widget
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { EmbedProduct } from './api';

export interface SelectedOptions {
  [attributeCode: string]: number; // attributeCode → valueId
}

/**
 * Find the matching variant for the selected options.
 * Returns null if no variant matches or not all options are selected.
 */
export function resolveVariant(product: EmbedProduct, selected: SelectedOptions) {
  const options = product.configurableOptions;
  if (!options.length) return null;

  // Check all options are selected
  const allSelected = options.every(opt => selected[opt.code] != null);
  if (!allSelected) return null;

  return product.variants.find(v => {
    return options.every(opt => {
      const selectedVal = selected[opt.code];
      return v.attributes[opt.code] === selectedVal;
    });
  }) ?? null;
}

/**
 * Get available values for an option given current selections.
 * Disables values that would lead to an out-of-stock or non-existent variant.
 */
export function getAvailableValues(
  product: EmbedProduct,
  optionCode: string,
  selected: SelectedOptions
): Set<number> {
  const available = new Set<number>();
  const otherSelections = { ...selected };
  delete otherSelections[optionCode];

  const option = product.configurableOptions.find(o => o.code === optionCode);
  if (!option) return available;

  for (const val of option.values) {
    // Check if any variant exists with this value + other selections
    const matches = product.variants.some(v => {
      if (v.attributes[optionCode] !== val.id) return false;
      if (!v.inStock) return false;
      // Check other selected attributes match
      return Object.entries(otherSelections).every(
        ([code, valId]) => v.attributes[code] === valId
      );
    });
    if (matches) available.add(val.id);
  }

  return available;
}

/**
 * Get the display price for current selection state.
 */
export function getDisplayPrice(product: EmbedProduct, selected: SelectedOptions): { price: number | null; oldPrice: number | null } {
  const variant = resolveVariant(product, selected);
  if (variant) {
    const finalPrice = variant.finalPrice ?? variant.price;
    const oldPrice = variant.price && variant.finalPrice && variant.price > variant.finalPrice ? variant.price : null;
    return { price: finalPrice, oldPrice };
  }
  const finalPrice = product.finalPrice ?? product.price;
  const oldPrice = product.price && product.finalPrice && product.price > product.finalPrice ? product.price : null;
  return { price: finalPrice, oldPrice };
}
