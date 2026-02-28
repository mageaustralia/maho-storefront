/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface Stat {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
}

interface StatsCounterProps {
  stats: Stat[];
}

/**
 * Stats Counter — Row
 *
 * Row of stat counters using DaisyUI's stats component.
 * Responsive: vertical stack on mobile, horizontal row on desktop.
 */
export const StatsCounterRow: FC<StatsCounterProps> = ({ stats }) => (
  <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]">
    <div class="stats shadow stats-vertical lg:stats-horizontal w-full">
      {stats.map((stat) => (
        <div class="stat">
          <div class="stat-title">{stat.label}</div>
          <div class="stat-value">
            {stat.prefix && <span>{stat.prefix}</span>}
            {stat.value}
            {stat.suffix && <span>{stat.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  </div>
);