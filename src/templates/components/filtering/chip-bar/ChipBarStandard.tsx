/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Active filter chip bar — shows currently applied filters with remove buttons.
 * Content populated dynamically by category-filter Stimulus controller.
 */
export const ChipBarStandard: FC = () => (
  <div class="flex flex-wrap gap-2 mb-4" data-category-filter-target="activeFilters" style="display:none"></div>
);