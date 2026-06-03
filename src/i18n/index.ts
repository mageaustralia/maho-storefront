/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Lightweight i18n for SSR. No runtime deps, no global mutable state (the
 * Worker handles concurrent requests for different store-views), and tree-shake
 * friendly — catalogs are plain objects imported here.
 *
 * Usage in a template (locale comes from the store config):
 *
 *   import { createTranslator } from '../i18n';
 *   const t = createTranslator(config.locale);
 *   <button>{t('common.add_to_cart')}</button>
 *   <span>{t('cart.item_count', { count: 3 })}</span>
 *
 * Resolution order for a key: requested locale's catalog → its base language →
 * the `en` base catalog → the key itself. So a missing/partial translation
 * never throws and never renders an empty node.
 */
import { en, type MessageKey } from './catalogs/en';

export type { MessageKey };

type Catalog = Partial<Record<string, string>>;

/**
 * Registry of language catalogs, keyed by BASE language code (e.g. 'en', 'sv').
 * `en` is the required fallback. Add a language by importing its catalog and
 * registering it here — that's the only wiring a new locale needs.
 */
const CATALOGS: Record<string, Catalog> = {
  en,
};

export const BASE_LANGUAGE = 'en';

/**
 * Normalise a Maho/BCP-47 locale to a base language code.
 * 'en_US' → 'en', 'en-AU' → 'en', 'sv_SE' → 'sv', '' → 'en'.
 */
export function toLanguage(locale: string | null | undefined): string {
  if (!locale) return BASE_LANGUAGE;
  return locale.replace('_', '-').split('-')[0]!.toLowerCase() || BASE_LANGUAGE;
}

/**
 * Convert a Maho locale to a BCP-47 tag for `<html lang>` / `hreflang`.
 * 'en_US' → 'en-US'. Falls back to 'en'.
 */
export function toBcp47(locale: string | null | undefined): string {
  if (!locale) return BASE_LANGUAGE;
  return locale.replace('_', '-');
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in params ? String(params[key]) : match,
  );
}

/**
 * Translate a single key for a given locale. Pure — safe to call concurrently.
 * Unknown keys return the key itself (so missing copy is visible, not blank).
 */
export function translate(
  locale: string | null | undefined,
  key: MessageKey | string,
  params?: Record<string, string | number>,
): string {
  const lang = toLanguage(locale);
  const message =
    CATALOGS[lang]?.[key] ??
    (lang === BASE_LANGUAGE ? undefined : CATALOGS[BASE_LANGUAGE]?.[key]) ??
    en[key as MessageKey] ??
    key;
  return interpolate(message, params);
}

/** Translator function bound to a locale. */
export type Translator = (key: MessageKey | string, params?: Record<string, string | number>) => string;

/**
 * Create a translator bound to a store's locale. Build one per request/template
 * from `config.locale` and pass `t` down, or call inline.
 */
export function createTranslator(locale: string | null | undefined): Translator {
  return (key, params) => translate(locale, key, params);
}

/** True when a non-base language has a registered catalog. */
export function hasCatalog(locale: string | null | undefined): boolean {
  return toLanguage(locale) in CATALOGS;
}
