/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, it, expect } from 'vitest';
import { paginationLinks } from './pagination-links';

const BASE = 'https://shop.example.com/women';

describe('paginationLinks', () => {
  it('single page (totalPages=1): bare canonical, no prev/next', () => {
    expect(paginationLinks(BASE, 1, 1)).toEqual({ canonical: BASE, prev: null, next: null });
  });

  it('first of many: canonical=base, next=page 2, no prev', () => {
    expect(paginationLinks(BASE, 1, 5)).toEqual({
      canonical: BASE,
      prev: null,
      next: `${BASE}?page=2`,
    });
  });

  it('middle page: page-aware canonical + both prev/next', () => {
    expect(paginationLinks(BASE, 3, 5)).toEqual({
      canonical: `${BASE}?page=3`,
      prev: `${BASE}?page=2`,
      next: `${BASE}?page=4`,
    });
  });

  it('prev from page 2 is the bare base (not ?page=1)', () => {
    expect(paginationLinks(BASE, 2, 5).prev).toBe(BASE);
  });

  it('last page: canonical + prev, no next', () => {
    expect(paginationLinks(BASE, 5, 5)).toEqual({
      canonical: `${BASE}?page=5`,
      prev: `${BASE}?page=4`,
      next: null,
    });
  });
});
