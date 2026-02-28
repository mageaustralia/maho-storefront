/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface SizeGuideMeasurement {
  label: string;
  value: string;
  position?: string;
}

export interface SizeGuideVisualProps {
  image: string;
  measurements: SizeGuideMeasurement[];
}

/**
 * Visual Size Guide
 *
 * Displays a product/body diagram image alongside a measurement list.
 * Image and measurements sit side by side on desktop, stack on mobile.
 */
export const SizeGuideVisual: FC<SizeGuideVisualProps> = ({ image, measurements }) => (
  <div class="my-6">
    <h3 class="text-lg font-semibold text-base-content mb-3">Size Guide</h3>
    <div class="flex flex-col md:flex-row gap-6 items-start">
      <div class="w-full md:w-1/2">
        <img
          src={image}
          alt="Size guide diagram"
          class="w-full h-auto rounded-lg"
          loading="lazy"
        />
      </div>
      <div class="w-full md:w-1/2">
        <ul class="space-y-2">
          {measurements.map((m) => (
            <li class="flex justify-between items-center py-2 border-b border-base-200 last:border-0">
              <span class="text-sm font-medium text-base-content">{m.label}</span>
              <span class="text-sm text-base-content/70 font-mono">{m.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);