/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface AccordionFaqProps {
  items: Array<FaqItem>;
}

/**
 * Accordion FAQ — Standard
 *
 * List of collapsible Q&A items using DaisyUI collapse-arrow within a
 * join join-vertical container. First item open by default.
 */
export const AccordionFaqStandard: FC<AccordionFaqProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]">
      <div class="join join-vertical w-full">
        {items.map((item, i) => (
          <div key={i} class="collapse collapse-arrow join-item border border-base-300">
            <input type="radio" name="faq-accordion" checked={i === 0} />
            <div class="collapse-title text-base font-medium">{item.question}</div>
            <div class="collapse-content">
              <p class="text-base-content/70">{item.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};