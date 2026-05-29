/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Characters JSON.stringify leaves raw but which are unsafe inside an inline
// <script>: `<` `>` `&` and the JS line separators U+2028 / U+2029.
// Keyed by code point so no literal separator char appears in this source file
// (a literal U+2028/U+2029 in a regex literal is itself a line terminator and
// would not compile).
const JSON_LD_ESCAPES: Record<number, string> = {
  60: '\\u003c', // <
  62: '\\u003e', // >
  38: '\\u0026', // &
  8232: '\\u2028',
  8233: '\\u2029',
};

const JSON_LD_UNSAFE = /[\u003c\u003e\u0026\u2028\u2029]/g;

/**
 * Serialise a value for safe embedding inside an inline
 * `<script type="application/ld+json">` tag.
 *
 * `JSON.stringify` does NOT escape the characters above, so backend-controlled
 * fields (product name, description, category name, etc.) containing
 * `</script>` would break out of the tag and inject markup — a stored-XSS
 * vector. We escape them into their unicode form, which is still valid
 * JSON/JSON-LD but inert as HTML.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(JSON_LD_UNSAFE, (ch) => JSON_LD_ESCAPES[ch.charCodeAt(0)] ?? ch);
}
