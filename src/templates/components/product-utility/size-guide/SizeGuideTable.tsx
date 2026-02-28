/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface SizeGuideTableProps {
  sizes: Array<{ label: string; [key: string]: string }>;
  headers: string[];
}

/**
 * Size Guide Table
 *
 * Standard table-based size guide with zebra striping.
 * Horizontally scrollable on small screens.
 */
export const SizeGuideTable: FC<SizeGuideTableProps> = ({ sizes, headers }) => (
  <div class="my-6">
    <h3 class="text-lg font-semibold text-base-content mb-3">Size Guide</h3>
    <div class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            {headers.map((header) => (
              <th class="text-base-content/70">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sizes.map((size) => (
            <tr>
              {headers.map((header) => (
                <td>{size[header] ?? size.label ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);