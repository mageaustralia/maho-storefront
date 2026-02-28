/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface PromoItem {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  href: string;
  bgColor?: string;
}

interface PromoGrid3UpProps {
  items?: PromoItem[];
}

const defaultItems: PromoItem[] = [
  { title: 'New Arrivals', subtitle: 'Shop the latest', href: '#', bgColor: 'bg-primary/10' },
  { title: 'Sale', subtitle: 'Up to 50% off', href: '#', bgColor: 'bg-error/10' },
  { title: 'Collections', subtitle: 'Curated picks', href: '#', bgColor: 'bg-accent/10' },
];

/**
 * Promo Grid — 3 Up
 *
 * Three equal-width promo cards in a row.
 * Each card links to a collection/category. Stacks on mobile.
 */
export const PromoGrid3Up: FC<PromoGrid3UpProps> = ({ items = defaultItems }) => (
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    {items.map((item, i) => (
      <a
        key={i}
        href={item.href}
        class={`group relative rounded-xl overflow-hidden aspect-[4/3] flex items-end p-6 no-underline text-base-content ${item.bgColor ?? 'bg-base-200'}`}
      >
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div class="relative z-10">
          <h3 class="text-xl font-bold">{item.title}</h3>
          {item.subtitle && <p class="text-sm text-base-content/60 mt-1">{item.subtitle}</p>}
        </div>
      </a>
    ))}
  </div>
);