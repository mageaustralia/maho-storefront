/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface ComparisonProduct {
  name: string;
  image?: string;
  url?: string;
  specs: Record<string, string>;
}

interface ComparisonTableProps {
  products: ComparisonProduct[];
  specLabels: string[];
}

/**
 * Comparison Table — Standard
 *
 * Side-by-side product comparison table. Product images and names form
 * column headers, with spec rows below. Cells where values differ across
 * products are highlighted. Sticky first column and horizontal scroll
 * on mobile.
 */
export const ComparisonTableStandard: FC<ComparisonTableProps> = ({
  products,
  specLabels,
}) => {
  // Pre-compute which spec rows have differing values
  const hasDifference = (label: string): boolean => {
    const values = products.map((p) => p.specs[label] ?? '');
    return new Set(values).size > 1;
  };

  return (
    <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]">
      <div class="overflow-x-auto">
        <table class="table table-sm w-full">
          {/* Product header row */}
          <thead>
            <tr>
              <th class="sticky left-0 bg-base-100 z-10 min-w-[120px]">Specification</th>
              {products.map((product) => (
                <th class="text-center min-w-[140px]">
                  <div class="flex flex-col items-center gap-2">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        class="w-16 h-16 object-contain"
                      />
                    )}
                    {product.url ? (
                      <a href={product.url} class="link link-hover font-medium">
                        {product.name}
                      </a>
                    ) : (
                      <span class="font-medium">{product.name}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Spec rows */}
          <tbody>
            {specLabels.map((label) => {
              const differs = hasDifference(label);
              return (
                <tr>
                  <td class="sticky left-0 bg-base-100 z-10 font-medium text-base-content/80">
                    {label}
                  </td>
                  {products.map((product) => {
                    const val = product.specs[label] ?? '—';
                    return (
                      <td class={`text-center ${differs ? 'bg-warning/10' : ''}`}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};