/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface CountdownProps {
  heading: string;
  endDate: string;
  ctaText?: string;
  ctaUrl?: string;
  bgClass?: string;
}

/**
 * Standard Countdown Timer
 *
 * Sale countdown banner with days/hours/minutes/seconds boxes.
 * Uses Stimulus controller data attributes for client-side countdown logic.
 * Server renders with placeholder values; the controller hydrates on connect.
 */
export const CountdownStandard: FC<CountdownProps> = ({
  heading,
  endDate,
  ctaText,
  ctaUrl,
  bgClass = 'bg-primary',
}) => {
  return (
    <section
      class={`${bgClass} text-primary-content py-8 md:py-12`}
      data-controller="countdown"
      data-countdown-target-value={endDate}
    >
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-2xl md:text-3xl font-bold mb-2">{heading}</h2>
        <p class="text-sm md:text-base opacity-80 mb-6">
          Hurry — offer ends soon!
        </p>

        <div class="flex justify-center gap-3 md:gap-4 mb-6">
          <div class="bg-base-200 text-base-content rounded-lg p-3 min-w-[64px] text-center">
            <span
              class="text-2xl md:text-3xl font-bold tabular-nums block"
              data-countdown-target="days"
            >
              00
            </span>
            <span class="text-xs uppercase tracking-wide opacity-70">Days</span>
          </div>
          <div class="bg-base-200 text-base-content rounded-lg p-3 min-w-[64px] text-center">
            <span
              class="text-2xl md:text-3xl font-bold tabular-nums block"
              data-countdown-target="hours"
            >
              00
            </span>
            <span class="text-xs uppercase tracking-wide opacity-70">Hours</span>
          </div>
          <div class="bg-base-200 text-base-content rounded-lg p-3 min-w-[64px] text-center">
            <span
              class="text-2xl md:text-3xl font-bold tabular-nums block"
              data-countdown-target="minutes"
            >
              00
            </span>
            <span class="text-xs uppercase tracking-wide opacity-70">Mins</span>
          </div>
          <div class="bg-base-200 text-base-content rounded-lg p-3 min-w-[64px] text-center">
            <span
              class="text-2xl md:text-3xl font-bold tabular-nums block"
              data-countdown-target="seconds"
            >
              00
            </span>
            <span class="text-xs uppercase tracking-wide opacity-70">Secs</span>
          </div>
        </div>

        {ctaText && ctaUrl && (
          <a href={ctaUrl} class="btn btn-accent btn-lg shadow-lg">
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
};