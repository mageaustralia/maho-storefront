/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, it, expect } from 'vitest';
import { safeJsonLd } from './json-ld';

describe('safeJsonLd', () => {
  it('neutralises a </script> breakout in a string field', () => {
    const out = safeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toMatch(/<\/script>/i);
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
  });

  it('escapes ampersands', () => {
    expect(safeJsonLd({ a: 'x & y' })).not.toContain('&');
  });

  it('escapes the U+2028 / U+2029 line separators', () => {
    const out = safeJsonLd({ a: `x${String.fromCharCode(0x2028)}y${String.fromCharCode(0x2029)}z` });
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
    expect(out).not.toContain(String.fromCharCode(0x2028));
    expect(out).not.toContain(String.fromCharCode(0x2029));
  });

  it('round-trips back to the original value', () => {
    const value = { '@type': 'Product', name: 'Wilson Pro <Staff>', price: 199.95, tags: ['a&b', 'c'] };
    expect(JSON.parse(safeJsonLd(value))).toEqual(value);
  });

  it('leaves ordinary spaces untouched', () => {
    expect(safeJsonLd({ a: 'hello world' })).toBe('{"a":"hello world"}');
  });
});
