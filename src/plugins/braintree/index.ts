/**
 * Maho Storefront — Braintree Plugin
 *
 * Optional payment plugin (Braintree Hosted Fields). Like Stripe, Braintree is
 * NOT core — it lives here and is wired into the worker entry via one sync call.
 * Unlike Stripe it has no server route and stores no secret: the client adapter
 * (public/plugins/braintree-payment.js.txt) fetches a client token at runtime
 * from the backend.
 *
 *   - syncBraintreeConfig — registers the `braintree` payment plugin on /sync
 *   - BRAINTREE_CSP        — the Hosted Fields / 3DS CSP sources
 *
 * Requires the Maho Braintree module exposing two headless endpoints — see
 * INTEGRATION.md. Until those exist, every entry point no-ops.
 */

export { syncBraintreeConfig, type SyncBraintreeOptions } from './sync';
export { BRAINTREE_CSP } from './csp';
