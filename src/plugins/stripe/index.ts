/**
 * Maho Storefront — Stripe Plugin
 *
 * Optional payment plugin. Stripe is NOT part of storefront core — it lives
 * here as a self-contained plugin and is wired into the worker entry the same
 * way the filterable-pages plugin is (manual route + sync registration, since
 * those aren't part of the auto-discovered PluginManifest slot/controller/
 * headScript surface).
 *
 * Server side (this directory):
 *   - registerStripeRoutes — /api/payments/stripe/payment-intents (+ preflight)
 *   - syncStripeConfig      — pulls keys from the Maho Stripe module on /sync
 *   - getStripePublishableKey — config reader for core endpoints
 *
 * Client side (already plugin-shaped, unchanged): public/plugins/stripe-payment.js.txt,
 * served at /plugins/stripe-payment.js and registered via syncStripeConfig.
 *
 * Requires the Maho Stripe module on the backend exposing
 * /api/payments/stripe/config. Absent that, every entry point no-ops.
 */

export { registerStripeRoutes, type StripeRouteDeps } from './routes';
export { syncStripeConfig, type SyncStripeOptions } from './sync';
export { getStripePublishableKey } from './config';
