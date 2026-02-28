/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Step Indicator — Variant Index
 *
 * Re-exports the active StepIndicator variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { StepIndicatorStandard } from './StepIndicatorStandard';
import type { StepIndicatorStandardProps } from './StepIndicatorStandard';

const variants: Record<string, FC<any>> = {
  standard: StepIndicatorStandard,
};

/**
 * Resolves the StepIndicator variant from page.json.
 */
export const StepIndicator: FC<StepIndicatorStandardProps> = (props) => {
  const variant = getVariant('checkout', 'step-indicator', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { StepIndicatorStandard };