/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  image?: string;
}

export interface TestimonialProps {
  testimonials: Testimonial[];
}

const QuoteIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    class="w-8 h-8 text-primary/20"
  >
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
  </svg>
);

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Testimonial Carousel
 *
 * Horizontal scroll-snap carousel of testimonial cards.
 * Supports keyboard navigation via arrow keys and mobile swipe.
 */
export const TestimonialCarousel: FC<TestimonialProps> = ({ testimonials }) => {
  if (testimonials.length === 0) return null;

  return (
    <div
      class="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mb-4"
      role="region"
      aria-label="Customer testimonials"
      tabindex={0}
    >
      {testimonials.map((t, idx) => (
        <div
          class="card bg-base-100 shadow-sm snap-start shrink-0 w-[300px] sm:w-[350px]"
          key={idx}
        >
          <div class="card-body">
            <QuoteIcon />
            <p class="text-sm leading-relaxed text-base-content/80 mt-2">{t.quote}</p>
            <div class="flex items-center gap-3 mt-4">
              {t.image ? (
                <div class="avatar">
                  <div class="w-10 rounded-full">
                    <img src={t.image} alt={t.author} loading="lazy" />
                  </div>
                </div>
              ) : (
                <div class="avatar placeholder">
                  <div class="bg-neutral text-neutral-content w-10 rounded-full">
                    <span class="text-sm">{getInitials(t.author)}</span>
                  </div>
                </div>
              )}
              <div>
                <span class="font-semibold text-sm block">{t.author}</span>
                {t.role && (
                  <span class="text-xs text-base-content/50">{t.role}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};