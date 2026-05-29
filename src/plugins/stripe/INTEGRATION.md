# Stripe Plugin

Optional payment plugin. **Stripe is not part of storefront core** — it is a
self-contained plugin under `src/plugins/stripe/`. Removing this directory (and
its two wiring lines in `src/index.tsx`) fully removes Stripe from the build.

## What it provides

| Export | Kind | Wired in `index.tsx` by |
|--------|------|--------------------------|
| `registerStripeRoutes(app, deps)` | Server routes | a single call alongside the other route registrations |
| `syncStripeConfig(opts)` | Sync hook | called inside the `/sync` per-store loop |
| `getStripePublishableKey(config)` | Config reader | used by the embed cart-recommendations endpoint |

Routes registered:

- `OPTIONS /api/payments/stripe/payment-intents` — CORS preflight (embed widget posts cross-origin)
- `POST /api/payments/stripe/payment-intents` — creates a Stripe PaymentIntent
  (`capture_method=manual`) from the Maho cart total. No-ops (falls through to
  the next handler) when no secret key is configured.

The **client** script (`public/plugins/stripe-payment.js.txt`, served at
`/plugins/stripe-payment.js`) is already plugin-shaped and unchanged;
`syncStripeConfig` registers it in the store config's `paymentPlugins`.

## Backend requirement

Requires the Maho Stripe module exposing `GET /api/payments/stripe/config`,
returning `{ publishableKey, secretKey }`. The secret key is only returned when
the request carries `X-Storefront-Sync: <SYNC_SECRET>`. On `/sync`,
`syncStripeConfig`:

1. registers the `stripe` payment plugin in `config.extensions.paymentPlugins`
   (publishable key only — safe to expose), and
2. persists the secret key to KV at `${prefix}stripe:secretKey` for
   server-side PaymentIntent creation.

`STRIPE_SECRET_KEY` may also be supplied via a Worker env var as a fallback.

## CSP

Stripe's Content-Security-Policy sources (`js.stripe.com`, `api.stripe.com`,
`hooks.stripe.com`) are declared by the plugin in `csp.ts` (`STRIPE_CSP`) and
merged into the storefront policy via the aggregator at `src/plugins/csp.ts` —
they are **not** hardcoded in core. See the "Payment plugins" section of
`architecture/plugins.md`.

## Removing Stripe

1. Delete `src/plugins/stripe/`.
2. Remove the `registerStripeRoutes(...)`, `syncStripeConfig(...)` and
   `getStripePublishableKey(...)` usages from `src/index.tsx`.
3. Remove the `STRIPE_CSP` entry from `CONTRIBUTIONS` in `src/plugins/csp.ts`.
4. (Optional) drop `public/plugins/stripe-payment.js.txt`.

> The **embed widget** (`src/embed/*`) still uses Stripe directly in its own
> bundle — de-hardcoding that into a plugin-provided payment adapter is a
> separate, pending follow-up (the "embed plugin refactor").
