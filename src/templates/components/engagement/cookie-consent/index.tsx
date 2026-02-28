/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Cookie Consent — Variant Index
 *
 * Re-exports the active CookieConsent variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { CookieConsentBar } from './CookieConsentBar';
import type { CookieConsentBarProps } from './CookieConsentBar';
import { CookieConsentMinimal } from './CookieConsentMinimal';

const variants: Record<string, FC<any>> = {
  standard: CookieConsentBar,
  minimal: CookieConsentMinimal,
};

/**
 * Resolves the CookieConsent variant from page.json.
 */
export const CookieConsent: FC<CookieConsentBarProps> = (props) => {
  const variant = getVariant('engagement', 'cookie-consent', 'standard');
  const Component = variants[variant] ?? variants.standard;
  return <Component {...props} />;
};

export { CookieConsentBar, CookieConsentMinimal };