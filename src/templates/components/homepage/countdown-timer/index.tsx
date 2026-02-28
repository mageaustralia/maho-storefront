/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Countdown Timer — Variant Index
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';

import { CountdownStandard } from './CountdownStandard';
import type { CountdownProps } from './CountdownStandard';

export type { CountdownProps };

const variants: Record<string, FC<CountdownProps>> = {
  standard: CountdownStandard,
};

export const CountdownTimer: FC<CountdownProps> = (props) => {
  const variant = getVariant('homepage', 'countdown-timer', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { CountdownStandard };