/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Review, ReviewListProps } from './ReviewListStandard';

const StarIcon: FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    class={`w-3.5 h-3.5 ${filled ? 'text-warning' : 'text-base-300'}`}
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const Stars: FC<{ rating: number }> = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(<StarIcon filled={i <= rating} />);
  }
  return <div class="flex gap-0.5">{stars}</div>;
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Compact Review List
 *
 * Condensed layout — no title, shorter body (line-clamped), inline metadata.
 * Good for sidebars or secondary placements where space is limited.
 */
export const ReviewListCompact: FC<ReviewListProps> = ({ reviews }) => {
  if (reviews.length === 0) {
    return (
      <div class="text-center py-4 text-base-content/60 text-sm">
        <p>No reviews yet.</p>
      </div>
    );
  }

  return (
    <div class="divide-y divide-base-200">
      {reviews.map((review, idx) => (
        <div class="py-3 first:pt-0 last:pb-0" key={idx}>
          <div class="flex items-center gap-2 mb-1">
            <Stars rating={review.rating} />
            <span class="font-medium text-sm">{review.nickname}</span>
            {review.verified && (
              <span class="badge badge-success badge-sm">Verified</span>
            )}
            <span class="text-xs text-base-content/40 ml-auto">{formatDate(review.createdAt)}</span>
          </div>
          <p class="text-sm text-base-content/70 line-clamp-2">{review.detail}</p>
        </div>
      ))}
    </div>
  );
};