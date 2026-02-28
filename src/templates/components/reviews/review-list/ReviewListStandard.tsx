/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface Review {
  nickname: string;
  title: string;
  detail: string;
  rating: number;
  createdAt: string;
  verified?: boolean;
}

export interface ReviewListProps {
  reviews: Review[];
}

const StarIcon: FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    class={`w-4 h-4 ${filled ? 'text-warning' : 'text-base-300'}`}
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

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Standard Review List
 *
 * Vertical stack of review cards. Each card shows avatar with initials,
 * reviewer name, date, star rating, title, body text, and verified badge.
 */
export const ReviewListStandard: FC<ReviewListProps> = ({ reviews }) => {
  if (reviews.length === 0) {
    return (
      <div class="text-center py-8 text-base-content/60">
        <p>No reviews yet. Be the first to share your experience.</p>
      </div>
    );
  }

  return (
    <div class="space-y-4">
      {reviews.map((review, idx) => (
        <div class="card bg-base-100 shadow-sm" key={idx}>
          <div class="card-body">
            {/* Header: avatar, name, date, verified */}
            <div class="flex items-center gap-3 mb-2">
              <div class="avatar placeholder">
                <div class="bg-neutral text-neutral-content w-10 rounded-full">
                  <span class="text-sm">{getInitials(review.nickname)}</span>
                </div>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-sm">{review.nickname}</span>
                  {review.verified && (
                    <span class="badge badge-success badge-sm">Verified</span>
                  )}
                </div>
                <span class="text-xs text-base-content/50">{formatDate(review.createdAt)}</span>
              </div>
            </div>

            {/* Stars */}
            <Stars rating={review.rating} />

            {/* Title and body */}
            <h4 class="font-semibold mt-1">{review.title}</h4>
            <p class="text-sm text-base-content/80 leading-relaxed">{review.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
};