/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, it, expect } from 'vitest';
import { sanitizeCmsHtml } from './sanitize-html';

describe('sanitizeCmsHtml', () => {
  it('removes <script> tags and their contents', () => {
    const out = sanitizeCmsHtml('<p>Hello</p><script>steal(localStorage.maho_token)</script>');
    expect(out).toContain('<p>Hello</p>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('steal(');
  });

  it('strips inline event-handler attributes', () => {
    const out = sanitizeCmsHtml('<a href="/x" onclick="evil()" onmouseover="evil()">link</a>');
    expect(out).not.toMatch(/onclick|onmouseover/i);
    expect(out).toContain('href="/x"');
    expect(out).toContain('>link</a>');
  });

  it('neutralises javascript: URLs', () => {
    const out = sanitizeCmsHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('preserves the styling/structural attributes CMS layouts depend on', () => {
    const html =
      '<div class="grid gap-4" id="hero" data-foo="bar" style="color:red" aria-label="hero">x</div>';
    const out = sanitizeCmsHtml(html);
    expect(out).toContain('class="grid gap-4"');
    expect(out).toContain('id="hero"');
    expect(out).toContain('data-foo="bar"');
    expect(out).toContain('aria-label="hero"');
    expect(out).toContain('color:red');
  });

  it('keeps ordinary rich-text markup (headings, lists, links, images, tables)', () => {
    const html =
      '<h2>Title</h2><ul><li>a</li></ul><a href="https://x.test">l</a>' +
      '<img src="/media/p.jpg" alt="p"><table><tr><td>c</td></tr></table>';
    const out = sanitizeCmsHtml(html);
    expect(out).toContain('<h2>Title</h2>');
    expect(out).toContain('<li>a</li>');
    expect(out).toContain('src="/media/p.jpg"');
    expect(out).toContain('<td>c</td>');
  });

  it('allows iframe video embeds but sanitises a javascript: src', () => {
    expect(sanitizeCmsHtml('<iframe src="https://www.youtube.com/embed/x"></iframe>')).toContain(
      'src="https://www.youtube.com/embed/x"',
    );
    expect(sanitizeCmsHtml('<iframe src="javascript:evil()"></iframe>')).not.toContain('javascript:');
  });

  it('is a no-op on empty/falsy input', () => {
    expect(sanitizeCmsHtml('')).toBe('');
  });
});
