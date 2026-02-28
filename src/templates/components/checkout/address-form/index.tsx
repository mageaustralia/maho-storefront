/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Address Form — Variant Index
 *
 * Re-exports the active AddressForm variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { AddressFormStandard } from './AddressFormStandard';
import type { AddressFormStandardProps } from './AddressFormStandard';

const variants: Record<string, FC<any>> = {
  standard: AddressFormStandard,
};

/**
 * Resolves the AddressForm variant from page.json.
 */
export const AddressForm: FC<AddressFormStandardProps> = (props) => {
  const variant = getVariant('checkout', 'address-form', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { AddressFormStandard };