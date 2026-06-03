/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, it, expect } from 'vitest';
import { translate, createTranslator, toLanguage, toBcp47, hasCatalog } from './index';
import { buildHreflangAlternates } from './hreflang';
import type { StorefrontStore } from '../types';

describe('toLanguage', () => {
  it('strips region from Maho + BCP-47 locales', () => {
    expect(toLanguage('en_US')).toBe('en');
    expect(toLanguage('en-AU')).toBe('en');
    expect(toLanguage('sv_SE')).toBe('sv');
  });
  it('falls back to en for empty/nullish', () => {
    expect(toLanguage('')).toBe('en');
    expect(toLanguage(null)).toBe('en');
    expect(toLanguage(undefined)).toBe('en');
  });
});

describe('toBcp47', () => {
  it('converts underscore to hyphen', () => {
    expect(toBcp47('en_US')).toBe('en-US');
    expect(toBcp47(null)).toBe('en');
  });
});

describe('translate', () => {
  it('returns the en string for a known key', () => {
    expect(translate('en_US', 'common.add_to_cart')).toBe('Add to Cart');
  });
  it('interpolates {placeholders}', () => {
    expect(translate('en_US', 'product.sku', { sku: 'ABC-1' })).toBe('SKU: ABC-1');
    expect(translate('en_US', 'cart.item_count', { count: 3 })).toBe('3 items');
  });
  it('falls back to the base language when a locale has no catalog', () => {
    expect(translate('fr_FR', 'common.search')).toBe('Search');
  });
  it('returns the key itself for an unknown key (visible, not blank)', () => {
    expect(translate('en_US', 'does.not.exist')).toBe('does.not.exist');
  });
  it('leaves unmatched placeholders intact', () => {
    expect(translate('en_US', 'product.sku', {})).toBe('SKU: {sku}');
  });
});

describe('createTranslator', () => {
  it('binds a locale and translates', () => {
    const t = createTranslator('en_US');
    expect(t('cart.checkout')).toBe('Checkout');
    expect(t('product.reviews_count', { count: 12 })).toBe('12 reviews');
  });
});

describe('hasCatalog', () => {
  it('is true for en, false for an unregistered language', () => {
    expect(hasCatalog('en_US')).toBe(true);
    expect(hasCatalog('sv_SE')).toBe(false);
  });
});

describe('buildHreflangAlternates', () => {
  const stores: StorefrontStore[] = [
    { code: 'us', name: 'US', url: 'https://example.com', locale: 'en_US' },
    { code: 'se', name: 'SE', url: 'https://example.se/', locale: 'sv_SE' },
  ];

  it('returns [] when fewer than two store-views have a locale', () => {
    expect(buildHreflangAlternates({ stores: [stores[0]!], path: '/x' })).toEqual([]);
    const oneLocalized = [stores[0]!, { code: 'de', name: 'DE', url: 'https://example.de' }];
    expect(buildHreflangAlternates({ stores: oneLocalized, path: '/x' })).toEqual([]);
  });

  it('emits one alternate per localized view plus x-default', () => {
    const alts = buildHreflangAlternates({ stores, path: '/men/shirts', defaultStoreCode: 'us' });
    expect(alts).toEqual([
      { hreflang: 'en-US', href: 'https://example.com/men/shirts' },
      { hreflang: 'sv-SE', href: 'https://example.se/men/shirts' },
      { hreflang: 'x-default', href: 'https://example.com/men/shirts' },
    ]);
  });

  it('normalizes a missing leading slash and trims store-url trailing slashes', () => {
    const alts = buildHreflangAlternates({ stores, path: 'about' });
    expect(alts[1]).toEqual({ hreflang: 'sv-SE', href: 'https://example.se/about' });
  });

  it('falls back x-default to the first localized view when defaultStoreCode is unknown', () => {
    const alts = buildHreflangAlternates({ stores, path: '/', defaultStoreCode: 'zz' });
    expect(alts[alts.length - 1]).toEqual({ hreflang: 'x-default', href: 'https://example.com/' });
  });
});
