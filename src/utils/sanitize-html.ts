/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { FilterXSS, getDefaultWhiteList, escapeAttrValue } from 'xss';

/**
 * Sanitiser for admin-authored HTML (CMS pages/blocks, blog posts, product and
 * category descriptions, marketplace copy) before it is injected via
 * `dangerouslySetInnerHTML`.
 *
 * The headless storefront treats the Maho backend as trusted for *data* but NOT
 * for *script execution*: Magento's WYSIWYG does not strip `<script>` / event
 * handlers, so a compromised or low-privilege admin (or imported catalog data)
 * could otherwise store XSS that runs on the storefront and exfiltrates the
 * customer session. This strips the executable bits while preserving the markup
 * CMS authors actually use.
 *
 * Built on js-xss (pure JS, no DOM — works in the Workers runtime).
 *
 * Kept (so layouts don't break): all standard structural/formatting tags, plus
 * `class` / `id` / `style` / `data-*` / `aria-*` / `role` on any allowed tag
 * (CMS relies on DaisyUI/Uno utility classes), images, links, tables, `<style>`
 * blocks, and `<iframe>` for video embeds (src sanitised to http/https).
 *
 * Stripped: `<script>` (tag + body), inline event handlers (`onclick`, …),
 * and `javascript:` / `vbscript:` URLs (js-xss `safeAttrValue` handles these).
 */
const whiteList = { ...getDefaultWhiteList() };

// Allow video embeds; js-xss sanitises the src to a safe http(s) URL.
whiteList.iframe = ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading', 'title'];
// Allow inline <style> blocks so CMS-authored styling survives (CSS can't
// execute script in modern browsers; the real XSS vectors are handled below).
whiteList.style = [];

const GLOBAL_ATTRS = /^(class|id|style|role|tabindex|data-[\w-]+|aria-[\w-]+)$/;

const filter = new FilterXSS({
  whiteList,
  // Keep the global styling/structural attributes on any allowed tag — without
  // this, js-xss drops class/style and CMS layouts render unstyled.
  onIgnoreTagAttr(_tag, name, value) {
    if (GLOBAL_ATTRS.test(name)) {
      return `${name}="${escapeAttrValue(value)}"`;
    }
    return undefined; // strip every other non-whitelisted attribute
  },
  // Drop the entire <script> element including its body (default only escapes it).
  stripIgnoreTagBody: ['script'],
});

export function sanitizeCmsHtml(html: string): string {
  if (!html) return html;
  return filter.process(html);
}
