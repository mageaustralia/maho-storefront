/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface FaqItem {
  question: string;
  answer: string;
}

interface CmsAccordionFaqProps {
  title?: string;
  items: FaqItem[];
}

/**
 * CMS Accordion FAQ
 *
 * Collapsible FAQ sections using DaisyUI collapse/join components.
 * First item open by default.
 */
export const CmsAccordionFaq: FC<CmsAccordionFaqProps> = ({ title, items }) => (
  <div class="max-w-3xl mx-auto py-8">
    {title && <h2 class="text-2xl font-bold mb-6 text-center">{title}</h2>}
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