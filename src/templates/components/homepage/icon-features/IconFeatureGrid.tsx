/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { IconFeatureProps } from './IconFeatureRow';

/**
 * SVG icon lookup — duplicated here to keep each variant self-contained.
 */
const iconMap: Record<string, string> = {
  truck: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h3.375m0 0V11.25m0 3h10.5V6.375a1.125 1.125 0 00-1.125-1.125H6.75m0 6v-6" /></svg>',
  return: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>',
  shield: '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>',
};

/**
 * Icon Feature Grid
 *
 * 2x2 grid layout for displaying 4+ feature highlights.
 * Each card has an icon, title, and description centered in a card.
 */
export const IconFeatureGrid: FC<IconFeatureProps> = ({ features }) => {
  if (!features || features.length === 0) return null;

  return (
    <section class="py-8 md:py-12 bg-base-200/50">
      <div class="container mx-auto px-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, idx) => (
            <div
              class="card bg-base-100 shadow-sm p-6 text-center"
              key={idx}
            >
              <div
                class="text-primary mx-auto mb-3"
                dangerouslySetInnerHTML={{
                  __html: iconMap[feature.icon] ?? iconMap.star,
                }}
              />
              <h3 class="font-semibold text-sm md:text-base mb-1">{feature.title}</h3>
              <p class="text-xs md:text-sm text-base-content/60">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};