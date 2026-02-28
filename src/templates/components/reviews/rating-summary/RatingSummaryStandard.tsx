/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface RatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution: { stars: number; count: number }[];
}

const StarIcon: FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    class={`w-5 h-5 ${filled ? 'text-warning' : 'text-base-300'}`}
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const Stars: FC<{ rating: number }> = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(<StarIcon filled={i <= Math.round(rating)} />);
  }
  return <div class="flex gap-0.5">{stars}</div>;
};

/**
 * Standard Rating Summary
 *
 * Shows overall rating as a large number with stars, bar breakdown
 * by star level, and total review count.
 */
export const RatingSummaryStandard: FC<RatingSummaryProps> = ({
  averageRating,
  totalReviews,
  distribution,
}) => {
  // Sort distribution descending by star count (5 first)
  const sorted = [...distribution].sort((a, b) => b.stars - a.stars);
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <div class="flex flex-col sm:flex-row gap-6">
          {/* Overall rating */}
          <div class="flex flex-col items-center justify-center min-w-[140px]">
            <span class="text-5xl font-bold">{averageRating.toFixed(1)}</span>
            <Stars rating={averageRating} />
            <span class="text-sm text-base-content/60 mt-1">
              {totalReviews.toLocaleString()} {totalReviews === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          {/* Distribution bars */}
          <div class="flex-1 space-y-2">
            {sorted.map((row) => {
              const pct = totalReviews > 0 ? Math.round((row.count / totalReviews) * 100) : 0;
              return (
                <div class="flex items-center gap-3 text-sm" key={row.stars}>
                  <span class="w-12 text-right whitespace-nowrap">{row.stars} star</span>
                  <progress
                    class="progress progress-warning flex-1"
                    value={row.count}
                    max={maxCount}
                  />
                  <span class="w-10 text-base-content/60">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};