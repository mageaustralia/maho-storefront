/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Newsletter — Variant Index
 *
 * Re-exports the active Newsletter variant based on page.json config.
 * Import from this index to get the configured variant automatically.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { NewsletterInline } from './NewsletterInline';
import type { NewsletterInlineProps } from './NewsletterInline';
import { NewsletterPopup } from './NewsletterPopup';
import type { NewsletterPopupProps } from './NewsletterPopup';
import { NewsletterFlyout } from './NewsletterFlyout';
import type { NewsletterFlyoutProps } from './NewsletterFlyout';

export type NewsletterProps = NewsletterInlineProps & NewsletterPopupProps & NewsletterFlyoutProps;

const variants: Record<string, FC<any>> = {
  inline: NewsletterInline,
  popup: NewsletterPopup,
  flyout: NewsletterFlyout,
};

/**
 * Resolves the Newsletter variant from page.json.
 */
export const Newsletter: FC<NewsletterProps> = (props) => {
  const variant = getVariant('engagement', 'newsletter', 'inline');
  const Component = variants[variant] ?? variants.inline;
  return <Component {...props} />;
};

export { NewsletterInline, NewsletterPopup, NewsletterFlyout };