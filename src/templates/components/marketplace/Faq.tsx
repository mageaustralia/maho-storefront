/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqProps {
  items: FaqItem[];
}

/** Strip HTML tags from a string for use in schema.org plain-text fields. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Accordion FAQ section backed by native <details>/<summary> elements
 * (no JS required). Also emits a FAQPage JSON-LD script when items exist.
 * Renders nothing when the items array is empty.
 */
export const Faq: FC<FaqProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripHtml(item.answer),
      },
    })),
  };

  return (
    <>
      <div class="my-10">
        <h2 class="mb-6 text-xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div class="divide-y divide-base-300 border border-base-300">
          {items.map((item, i) => (
            <details key={i} class="group">
              <summary class="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-base-content hover:bg-base-200 list-none">
                <span>{item.question}</span>
                <span class="ml-4 shrink-0 text-base-content/50 transition-transform group-open:rotate-180">
                  &#x25BE;
                </span>
              </summary>
              <div
                class="px-5 pb-5 pt-2 text-sm leading-relaxed text-base-content/70"
                dangerouslySetInnerHTML={{ __html: item.answer }}
              />
            </details>
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/<\/script>/gi, '<\\/script>') }}
      />
    </>
  );
};
