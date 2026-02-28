/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MahoApiClient, type PaginatedResponse } from './api-client';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

describe('MahoApiClient pagination', () => {
  let client: MahoApiClient;

  beforeEach(() => {
    client = new MahoApiClient('https://api.example.com');
    mockFetch.mockReset();
  });

  describe('fetchCategoryProducts', () => {
    it('returns items and totalItems from paginated response', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: [{ id: 1, name: 'Product A' }, { id: 2, name: 'Product B' }],
        totalItems: 50,
      }));

      const result = await client.fetchCategoryProducts(10, 1, 24);

      expect(result.products).toHaveLength(2);
      expect(result.totalItems).toBe(50);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('categoryId=10'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('itemsPerPage=24'),
        expect.any(Object),
      );
    });

    it('handles empty response', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: [],
        totalItems: 0,
      }));

      const result = await client.fetchCategoryProducts(99);

      expect(result.products).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    it('defaults totalItems to 0 when missing', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: [{ id: 1 }],
      }));

      const result = await client.fetchCategoryProducts(10);

      expect(result.totalItems).toBe(0);
    });

    it('defaults member to empty array when missing', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        totalItems: 5,
      }));

      const result = await client.fetchCategoryProducts(10);

      expect(result.products).toEqual([]);
    });
  });

  describe('searchProducts', () => {
    it('passes search query and pagination params', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: [{ id: 1 }],
        totalItems: 1,
      }));

      const result = await client.searchProducts('tennis racket', 2, 12);

      expect(result.products).toHaveLength(1);
      expect(result.totalItems).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=tennis%20racket'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object),
      );
    });
  });

  describe('fetchAllPages (auto-pagination)', () => {
    it('fetches single page when totalItems fits in one page', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: [{ id: 1 }, { id: 2 }, { id: 3 }],
        totalItems: 3,
      }));

      const result = await client.fetchCategories();

      expect(result).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('fetches multiple pages when totalItems exceeds page size', async () => {
      // First page
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })),
        totalItems: 120,
      }));
      // Page 2
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: Array.from({ length: 50 }, (_, i) => ({ id: i + 51 })),
        totalItems: 120,
      }));
      // Page 3
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: Array.from({ length: 20 }, (_, i) => ({ id: i + 101 })),
        totalItems: 120,
      }));

      const result = await client.fetchBlogPosts();

      expect(result).toHaveLength(120);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Verify page 1
      expect(mockFetch).toHaveBeenNthCalledWith(1,
        expect.stringContaining('page=1'),
        expect.any(Object),
      );
      // Pages 2 and 3 fetched in parallel
      const urls = mockFetch.mock.calls.map((c: [string]) => c[0]);
      expect(urls.some((u: string) => u.includes('page=2'))).toBe(true);
      expect(urls.some((u: string) => u.includes('page=3'))).toBe(true);
    });

    it('handles empty collection', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: [],
        totalItems: 0,
      }));

      const result = await client.fetchAllCmsPages();

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchBlogPosts', () => {
    it('uses correct page size of 50 (API max)', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: [{ id: 1 }],
        totalItems: 1,
      }));

      await client.fetchBlogPosts();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('itemsPerPage=50'),
        expect.any(Object),
      );
    });
  });

  describe('fetchAllCmsPages', () => {
    it('uses page size of 100', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: [],
        totalItems: 0,
      }));

      await client.fetchAllCmsPages();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('itemsPerPage=100'),
        expect.any(Object),
      );
    });
  });

  describe('fetchCategories', () => {
    it('uses page size of 100', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: [],
        totalItems: 0,
      }));

      await client.fetchCategories();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('itemsPerPage=100'),
        expect.any(Object),
      );
    });
  });

  describe('totalPages calculation edge cases', () => {
    it('calculates correct totalPages for exact boundary', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: Array.from({ length: 24 }, (_, i) => ({ id: i + 1 })),
        totalItems: 48,
      }));

      const result = await client.fetchCategoryProducts(10, 1, 24);

      // 48 / 24 = exactly 2 pages
      expect(result.totalItems).toBe(48);
      expect(Math.ceil(result.totalItems / 24)).toBe(2);
    });

    it('calculates correct totalPages for off-by-one', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: Array.from({ length: 24 }, (_, i) => ({ id: i + 1 })),
        totalItems: 49,
      }));

      const result = await client.fetchCategoryProducts(10, 1, 24);

      // 49 / 24 = 2.04 → ceil = 3 pages
      expect(result.totalItems).toBe(49);
      expect(Math.ceil(result.totalItems / 24)).toBe(3);
    });

    it('handles single item', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        member: [{ id: 1 }],
        totalItems: 1,
      }));

      const result = await client.fetchCategoryProducts(10, 1, 24);

      expect(result.totalItems).toBe(1);
      expect(Math.ceil(result.totalItems / 24)).toBe(1);
    });
  });

  describe('error handling', () => {
    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'server error' }),
      });

      await expect(client.fetchCategoryProducts(10)).rejects.toThrow('API error 500');
    });
  });
});