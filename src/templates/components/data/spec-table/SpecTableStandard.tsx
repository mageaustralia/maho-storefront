/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface Spec {
  label: string;
  value: string;
  group?: string;
}

interface SpecTableProps {
  specs: Spec[];
}

/**
 * Spec Table — Standard
 *
 * Key-value specification table for products (rackets, machines, etc.).
 * Specs are grouped by optional `group` field with group headers.
 * Uses DaisyUI table-zebra for alternating row styling.
 */
export const SpecTableStandard: FC<SpecTableProps> = ({ specs }) => {
  // Group specs: preserve insertion order, ungrouped specs go under empty key
  const groups = new Map<string, Spec[]>();
  for (const spec of specs) {
    const key = spec.group ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(spec);
  }

  return (
    <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]">
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <tbody>
            {Array.from(groups.entries()).map(([group, groupSpecs]) => (
              <>
                {group && (
                  <tr>
                    <td colSpan={2} class="font-bold text-base text-base-content bg-base-200 pt-4 pb-2">
                      {group}
                    </td>
                  </tr>
                )}
                {groupSpecs.map((spec) => (
                  <tr>
                    <td class="font-medium w-2/5 text-base-content/80">{spec.label}</td>
                    <td>{spec.value}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};