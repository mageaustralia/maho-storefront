/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Notify Me — Variant Index
 *
 * Re-exports the active NotifyMe variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { NotifyMeStandard } from './NotifyMeStandard';
import type { NotifyMeStandardProps } from './NotifyMeStandard';

const variants: Record<string, FC<NotifyMeStandardProps>> = {
  standard: NotifyMeStandard,
};

/**
 * Resolves the NotifyMe variant from page.json.
 */
export const NotifyMe: FC<NotifyMeStandardProps> = (props) => {
  const variant = getVariant('product-utility', 'notify-me', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { NotifyMeStandard };