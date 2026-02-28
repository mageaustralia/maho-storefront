/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Contact Form — Variant Index
 *
 * Re-exports the active ContactForm variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { ContactFormStandard } from './ContactFormStandard';
import type { ContactFormStandardProps } from './ContactFormStandard';

const variants: Record<string, FC<any>> = {
  standard: ContactFormStandard,
};

/**
 * Resolves the ContactForm variant from page.json.
 */
export const ContactForm: FC<ContactFormStandardProps> = (props) => {
  const variant = getVariant('engagement', 'contact-form', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { ContactFormStandard };