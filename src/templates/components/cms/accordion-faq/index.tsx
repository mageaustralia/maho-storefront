/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Accordion FAQ — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { AccordionFaqStandard } from './AccordionFaqStandard';
import type { AccordionFaqProps, FaqItem } from './AccordionFaqStandard';

export type { AccordionFaqProps, FaqItem };

const variants: Record<string, FC<AccordionFaqProps>> = {
  standard: AccordionFaqStandard,
};

export const AccordionFaq: FC<AccordionFaqProps> = (props) => {
  const variant = getVariant('cms', 'accordion-faq', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { AccordionFaqStandard };