/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface CompareTrayProps {
  maxItems?: number;
}

/**
 * Compare Tray
 *
 * Fixed bottom tray for product comparison selection.
 * Shows product thumbnails, a "Compare (N)" button, and remove controls.
 * Hidden by default (translate-y-full), revealed via Stimulus controller.
 */
export const CompareTray: FC<CompareTrayProps> = ({ maxItems = 4 }) => (
  <div
    class="fixed bottom-0 left-0 right-0 z-50 transform translate-y-full transition-transform duration-300 bg-base-100 border-t border-base-300 shadow-lg"
    data-controller="compare"
    data-compare-max-items-value={maxItems}
    data-compare-target="tray"
  >
    <div class="container mx-auto px-4 py-3">
      <div class="flex items-center gap-4">
        <div class="flex gap-3 flex-1 overflow-x-auto" data-compare-target="slots">
          {Array.from({ length: maxItems }).map((_, i) => (
            <div
              class="relative w-16 h-16 border-2 border-dashed border-base-300 rounded-lg flex items-center justify-center shrink-0"
              data-compare-target="slot"
              data-slot-index={i}
            >
              <span class="text-xs text-base-content/30">+</span>
            </div>
          ))}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            class="btn btn-primary btn-sm"
            data-action="click->compare#compare"
            data-compare-target="compareButton"
            disabled
          >
            Compare (<span data-compare-target="count">0</span>)
          </button>
          <button
            class="btn btn-ghost btn-sm"
            data-action="click->compare#clearAll"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  </div>
);