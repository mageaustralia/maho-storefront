/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface CompareProduct {
  name: string;
  image?: string;
  specs: Record<string, string>;
}

export interface CompareTableProps {
  products: CompareProduct[];
}

/**
 * Compare Table
 *
 * Full product comparison table with product images as column headers
 * and specification rows. Horizontally scrollable for responsive display.
 */
export const CompareTable: FC<CompareTableProps> = ({ products }) => {
  if (products.length === 0) return null;

  // Collect all unique spec keys across all products
  const specKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.specs)))
  );

  return (
    <div class="my-6">
      <h3 class="text-lg font-semibold text-base-content mb-4">Product Comparison</h3>
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th class="min-w-32"></th>
              {products.map((product) => (
                <th class="text-center min-w-40">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      class="w-20 h-20 object-contain mx-auto mb-2"
                      loading="lazy"
                    />
                  )}
                  <span class="text-sm font-medium">{product.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specKeys.map((key) => (
              <tr class="hover">
                <td class="font-medium text-sm text-base-content/70">{key}</td>
                {products.map((product) => (
                  <td class="text-center text-sm">{product.specs[key] ?? '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};