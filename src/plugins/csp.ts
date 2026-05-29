/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Plugin Content-Security-Policy aggregator. Each plugin that loads third-party
 * resources owns its CSP sources (e.g. src/plugins/stripe/csp.ts); this file
 * merges those contributions into per-directive arrays that the core
 * security-headers middleware folds into the policy. Adding/removing a plugin's
 * CSP is a one-line edit to CONTRIBUTIONS here — the same explicit-wiring model
 * used for server-plugin routes in index.tsx.
 */

import { STRIPE_CSP } from './stripe/csp';
import { BRAINTREE_CSP } from './braintree/csp';

/** CSP source lists a plugin contributes, keyed by directive (without the `-src`). */
export interface PluginCsp {
  scriptSrc?: string[];
  styleSrc?: string[];
  fontSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  frameSrc?: string[];
}

// One entry per CSP-contributing plugin. Delete a plugin → delete its line.
const CONTRIBUTIONS: PluginCsp[] = [STRIPE_CSP, BRAINTREE_CSP];

function merge(key: keyof PluginCsp): string[] {
  return [...new Set(CONTRIBUTIONS.flatMap(c => c[key] ?? []))];
}

export const PLUGIN_CSP: Required<PluginCsp> = {
  scriptSrc: merge('scriptSrc'),
  styleSrc: merge('styleSrc'),
  fontSrc: merge('fontSrc'),
  imgSrc: merge('imgSrc'),
  connectSrc: merge('connectSrc'),
  frameSrc: merge('frameSrc'),
};
