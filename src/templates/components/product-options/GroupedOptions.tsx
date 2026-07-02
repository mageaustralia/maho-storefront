/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { OptionsProps } from './types';

export interface GroupedOptionsProps extends OptionsProps {
  /**
   * 'compact' (default) — flex row per child, works in narrow columns.
   * 'standard' — full table with thumbnails and qty steppers, for wider layouts.
   */
  variant?: 'compact' | 'standard';
}

export const GroupedOptions: FC<GroupedOptionsProps> = ({ product, currency, formatPrice, variant = 'compact' }) => {
  if (!product.groupedProducts?.length) return null;

  if (variant === 'standard') {
    return (
      <div class="product-grouped">
        <table class="grouped-table">
          <thead><tr><th></th><th>Product</th><th>Price</th><th>Qty</th></tr></thead>
          <tbody>
            {product.groupedProducts.map((child) => {
              const oos = child.inStock === false;
              return (
                <tr key={child.id} class={oos ? 'opacity-50' : ''}>
                  <td class="grouped-thumb-cell">
                    {child.thumbnailUrl
                      ? <img src={child.thumbnailUrl} alt={child.name} class="grouped-thumb" />
                      : <div class="grouped-thumb-placeholder" />}
                  </td>
                  <td class="grouped-name">
                    {child.name}
                    {oos && <span class="block text-xs text-error mt-0.5">Out of Stock</span>}
                  </td>
                  <td class="grouped-price">
                    <span class="price-current">{formatPrice(child.finalPrice ?? child.price, currency)}</span>
                  </td>
                  <td class="grouped-qty">
                    <div class="qty-stepper">
                      <button type="button" class="qty-btn" data-action="product#groupedQtyDecrement" disabled={oos} aria-label="Decrease quantity">-</button>
                      <input type="number" value="0" min="0" max="99" class="qty-input" data-grouped-id={String(child.id)} disabled={oos} />
                      <button type="button" class="qty-btn" data-action="product#groupedQtyIncrement" disabled={oos} aria-label="Increase quantity">+</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div class="flex flex-col gap-3">
      {product.groupedProducts.map((child) => (
        <div key={child.id} class="flex items-center gap-3 text-sm">
          {child.thumbnailUrl && <img src={child.thumbnailUrl} alt={child.name} class="w-10 h-10 rounded object-cover" />}
          <div class="flex-1">
            <p class="font-medium">{child.name}</p>
            <p class="text-primary font-semibold">{formatPrice(child.finalPrice ?? child.price, currency)}</p>
          </div>
          <input
            type="number"
            value={String(child.defaultQty || 0)}
            min="0"
            max="99"
            class="input input-sm w-16 text-center"
            data-grouped-id={String(child.id)}
          />
        </div>
      ))}
    </div>
  );
};
