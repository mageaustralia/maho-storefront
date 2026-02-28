/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface ContentStore {
  get<T>(key: string): Promise<T | null>;
  put(key: string, value: unknown, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export class CloudflareKVStore implements ContentStore {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key, 'text');
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async put(key: string, value: unknown, ttl?: number): Promise<void> {
    const options: KVNamespacePutOptions = {};
    if (ttl) {
      options.expirationTtl = ttl;
    }
    await this.kv.put(key, JSON.stringify(value), options);
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    const result = await this.kv.list({ prefix });
    return result.keys.map((k) => k.name);
  }
}

/**
 * Dev-only wrapper that records KV read timing for the dev toolbar.
 * Delegates all operations to the underlying store.
 */
export class TrackedKVStore implements ContentStore {
  constructor(
    private inner: ContentStore,
    private tracker: { trackKv: <T>(key: string, fn: () => Promise<T | null>) => Promise<T | null> },
  ) {}

  get<T>(key: string): Promise<T | null> {
    return this.tracker.trackKv(key, () => this.inner.get<T>(key));
  }

  put(key: string, value: unknown, ttl?: number): Promise<void> {
    return this.inner.put(key, value, ttl);
  }

  delete(key: string): Promise<void> {
    return this.inner.delete(key);
  }

  list(prefix: string): Promise<string[]> {
    return this.inner.list(prefix);
  }
}