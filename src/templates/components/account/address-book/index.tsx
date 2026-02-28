/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { AddressBookStandard } from './AddressBookStandard';
import type { AddressBookProps } from './AddressBookStandard';

const variants: Record<string, FC<AddressBookProps>> = {
  standard: AddressBookStandard,
};

export const AccountAddressBook: FC<AddressBookProps> = (props) => {
  const variant = getVariant('account', 'address-book', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export type { AddressBookProps };
export { AddressBookStandard };