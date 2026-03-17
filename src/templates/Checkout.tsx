/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Checkout layout variant resolver.
 * Selects between single-page and multi-step checkout based on page.json config.
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, Country, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { getVariant } from '../page-config';
import { CheckoutPage as SinglePage } from './components/checkout/layout/CheckoutSinglePage';
import { CheckoutPage as MultiStep } from './components/checkout/layout/CheckoutMultiStep';

interface CheckoutPageProps {
  config: StoreConfig;
  categories: Category[];
  countries: Country[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
  googleMapsKey?: string;
  detectedCountry?: string;
}

const variants: Record<string, FC<CheckoutPageProps>> = {
  'single-page': SinglePage,
  'multi-step': MultiStep,
};

export const CheckoutPage: FC<CheckoutPageProps> = (props) => {
  const variant = getVariant('checkout', 'layout', 'single-page');
  const Component = variants[variant] ?? variants['single-page'];
  return <Component {...props} />;
};
