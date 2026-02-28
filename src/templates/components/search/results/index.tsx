/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { ResultsStandard } from './ResultsStandard';
import type { SearchResultsProps } from './ResultsStandard';

const variants: Record<string, FC<SearchResultsProps>> = {
  standard: ResultsStandard,
};

export const SearchResults: FC<SearchResultsProps> = (props) => {
  const variant = getVariant('search', 'results', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export type { SearchResultsProps };
export { ResultsStandard };