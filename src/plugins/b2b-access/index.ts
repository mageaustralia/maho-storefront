/**
 * Maho Storefront — B2B Access Plugin
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Optional B2B plugin. B2B Access is NOT part of storefront core - it lives
 * here as a self-contained plugin, discovered at sync time.
 *
 * Server side (this directory):
 *   - syncB2bAccessConfig - probes /api/rest/v2/b2b/access/config; registers
 *     a b2bPlugin manifest in the store config on 200/enabled=true.
 *
 * Client side: public/plugins/b2b-access.js.txt served at /plugins/b2b-access.js
 * (re-fetches product data after login so hidden prices appear without a full
 * reload).
 *
 * Rendering: the storefront's layout templates check
 * `product.extensions?.b2bAccess?.gateFlags` at render time; when hidePrice is
 * set, they show the login prompt in place of the price. The catalog API
 * already withholds the price when the module says to hide it, so this is
 * belt-and-braces (rendering is defensive, enforcement is server-side).
 *
 * Requires the Mage Australia B2B Access module on the backend exposing
 * /api/rest/v2/b2b/access/config. Absent that, sync no-ops and the plugin
 * is silent.
 */

export { syncB2bAccessConfig, type SyncB2bAccessOptions } from './sync';
