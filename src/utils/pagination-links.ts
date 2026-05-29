/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface PaginationLinks {
  /** Self-referencing canonical for the current page. */
  canonical: string;
  /** rel="prev" target, or null on the first page / when not paginated. */
  prev: string | null;
  /** rel="next" target, or null on the last page / when not paginated. */
  next: string | null;
}

/**
 * Compute the canonical + rel prev/next URLs for a paginated listing.
 *
 * - Self-referencing canonical per page (Google's current guidance — don't
 *   collapse every page onto page 1).
 * - `?page=N` only for pages > 1; page 1 is the bare base URL.
 * - When `totalPages <= 1` there is no pagination: canonical = base, no prev/next.
 */
export function paginationLinks(base: string, currentPage: number, totalPages: number): PaginationLinks {
  const paginated = totalPages > 1;
  const pageUrl = (p: number) => (p > 1 ? `${base}?page=${p}` : base);
  return {
    canonical: paginated && currentPage > 1 ? pageUrl(currentPage) : base,
    prev: paginated && currentPage > 1 ? pageUrl(currentPage - 1) : null,
    next: paginated && currentPage < totalPages ? pageUrl(currentPage + 1) : null,
  };
}
