/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MahoApiClient } from './api-client';

/** Build a minimal Response-like object for the mocked fetch. */
function mockResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
  } as unknown as Response;
}

describe('MahoApiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const lastHeaders = () => (fetchMock.mock.calls.at(-1)?.[1]?.headers ?? {}) as Record<string, string>;
  const lastUrl = () => fetchMock.mock.calls.at(-1)?.[0] as string;

  describe('request headers', () => {
    it('sends X-Worker-Auth only when a workerAuth secret is provided', async () => {
      fetchMock.mockResolvedValue(mockResponse({ member: [], totalItems: 0 }));
      const client = new MahoApiClient('https://api.example.com', 'en', undefined, 's3cr3t');
      await client.fetchCategories();
      expect(lastHeaders()['X-Worker-Auth']).toBe('s3cr3t');
    });

    it('omits X-Worker-Auth entirely when no secret is configured (no hardcoded fallback)', async () => {
      fetchMock.mockResolvedValue(mockResponse({ member: [], totalItems: 0 }));
      const client = new MahoApiClient('https://api.example.com', 'en');
      await client.fetchCategories();
      const headers = lastHeaders();
      expect(headers['X-Worker-Auth']).toBeUndefined();
      // Guard against the old hardcoded value ever reappearing.
      expect(JSON.stringify(headers)).not.toContain('maho-storefront-sync-');
    });

    it('sends the store code and trims a trailing slash from the base URL', async () => {
      fetchMock.mockResolvedValue(mockResponse({ member: [], totalItems: 0 }));
      const client = new MahoApiClient('https://api.example.com/', 'sv_2');
      await client.fetchCategories();
      expect(lastHeaders()['X-Store-Code']).toBe('sv_2');
      expect(lastUrl().startsWith('https://api.example.com/api/')).toBe(true);
    });
  });

  describe('collection envelope unwrapping', () => {
    it('unwraps the Hydra `member` array', async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ member: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }], totalItems: 2 }),
      );
      const client = new MahoApiClient('https://api.example.com', 'en');
      const cats = await client.fetchCategories();
      expect(cats).toHaveLength(2);
      expect(cats[0].name).toBe('A');
    });

    it('degrades gracefully to [] when `member` is absent', async () => {
      fetchMock.mockResolvedValue(mockResponse({ totalItems: 0 }));
      const client = new MahoApiClient('https://api.example.com', 'en');
      expect(await client.fetchCategories()).toEqual([]);
    });
  });

  describe('fetchProduct', () => {
    it('returns null when no result matches the requested urlKey', async () => {
      fetchMock.mockResolvedValue(mockResponse({ member: [{ urlKey: 'something-else' }], totalItems: 1 }));
      const client = new MahoApiClient('https://api.example.com', 'en');
      expect(await client.fetchProduct('wanted-key')).toBeNull();
    });

    it('prefers configurable over simple on urlKey collision and then loads full detail', async () => {
      fetchMock
        // 1st call: collection lookup by urlKey
        .mockResolvedValueOnce(
          mockResponse({
            member: [
              { id: 10, urlKey: 'shoe', type: 'simple' },
              { id: 11, urlKey: 'shoe', type: 'configurable' },
            ],
            totalItems: 2,
          }),
        )
        // 2nd call: full-detail fetch for the chosen product
        .mockResolvedValueOnce(mockResponse({ id: 11, urlKey: 'shoe', type: 'configurable', mediaGallery: null }));

      const client = new MahoApiClient('https://api.example.com', 'en');
      const product = await client.fetchProduct('shoe');
      expect(product?.id).toBe(11);
      // full-detail call targets the configurable's id
      expect(lastUrl()).toContain('/products/11');
      // normalizeProduct turns null mediaGallery into []
      expect(product?.mediaGallery).toEqual([]);
    });
  });

  describe('fetchProductBySku', () => {
    it('exact-matches the SKU even when fuzzy search returns extras', async () => {
      fetchMock
        .mockResolvedValueOnce(
          mockResponse({
            member: [
              { id: 1, sku: 'ABC-100-XL' },
              { id: 2, sku: 'ABC-100' },
            ],
          }),
        )
        .mockResolvedValueOnce(mockResponse({ id: 2, sku: 'ABC-100', mediaGallery: [] }));

      const client = new MahoApiClient('https://api.example.com', 'en');
      const product = await client.fetchProductBySku('ABC-100');
      expect(product?.id).toBe(2);
      expect(lastUrl()).toContain('/products/2');
    });

    it('returns null when no exact SKU match exists', async () => {
      fetchMock.mockResolvedValue(mockResponse({ member: [{ id: 1, sku: 'OTHER' }] }));
      const client = new MahoApiClient('https://api.example.com', 'en');
      expect(await client.fetchProductBySku('ABC-100')).toBeNull();
    });
  });

  describe('error handling', () => {
    it('throws with status and url on a non-ok response', async () => {
      fetchMock.mockResolvedValue(mockResponse({}, false, 503));
      const client = new MahoApiClient('https://api.example.com', 'en');
      await expect(client.fetchStoreConfig()).rejects.toThrow(/503/);
    });
  });
});
