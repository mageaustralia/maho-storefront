/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { SearchBar } from './SearchBar';

const variants: Record<string, FC> = {
  overlay: SearchBar,
};

export const SearchBarComponent: FC = (props) => {
  const Component = variants.overlay;
  return <Component {...props} />;
};

export { SearchBar };