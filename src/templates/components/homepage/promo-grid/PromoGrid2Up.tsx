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

interface PromoGrid2UpProps {
  items?: PromoItem[];
}

const defaultItems: PromoItem[] = [
  { title: 'New Season', subtitle: 'Explore the collection', href: '#', bgColor: 'bg-primary/10' },
  { title: 'Best Sellers', subtitle: 'Customer favourites', href: '#', bgColor: 'bg-secondary/10' },
];

/**
 * Promo Grid — 2 Up
 *
 * Two large promo cards side by side. More visual impact than 3-up.
 * Great for major campaigns or seasonal promotions.
 */
export const PromoGrid2Up: FC<PromoGrid2UpProps> = ({ items = defaultItems }) => (
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {items.map((item, i) => (
      <a
        key={i}
        href={item.href}
        class={`group relative rounded-xl overflow-hidden aspect-[3/2] flex items-end p-8 no-underline text-base-content ${item.bgColor ?? 'bg-base-200'}`}
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
          <h3 class="text-2xl font-bold">{item.title}</h3>
          {item.subtitle && <p class="text-sm text-base-content/60 mt-1">{item.subtitle}</p>}
          <span class="inline-block mt-3 text-sm font-medium text-primary group-hover:underline">Shop Now &rarr;</span>
        </div>
      </a>
    ))}
  </div>
);