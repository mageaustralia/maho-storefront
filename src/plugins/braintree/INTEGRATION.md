# Braintree Plugin

Optional payment plugin (Braintree Hosted Fields). **Braintree is not core** —
it's a self-contained plugin under `src/plugins/braintree/`, mirroring the
Stripe plugin. The client adapter
(`public/plugins/braintree-payment.js.txt`, served at
`/plugins/braintree-payment.js`) handles `gene_braintree_creditcard`.

## What it provides (storefront side)

| Export | Kind | Wired in `index.tsx` / sync by |
|--------|------|--------------------------------|
| `syncBraintreeConfig(opts)` | Sync hook | called inside the `/sync` per-store loop (`src/sync/routes.ts`) |
| `BRAINTREE_CSP` | CSP sources | registered in `src/plugins/csp.ts` |

`syncBraintreeConfig` probes the backend and, if Braintree is enabled, registers
the `braintree` entry in `config.extensions.paymentPlugins` (script
`/plugins/braintree-payment.js`). Unlike Stripe it persists **no** secret — the
client adapter fetches a short-lived client token at runtime.

There is **no server route** in the storefront for Braintree: the adapter's two
backend calls go straight through the generic `/api/*` proxy.

## Backend contract (required — not yet present)

The storefront is wired and inert until the Maho Braintree module exposes these
as **API Platform v2** resources (the storefront's `/api/*` proxy maps
`/api/x` → `/api/rest/v2/x`):

| Friendly path (browser/sync) | Backend resource | Purpose |
|---|---|---|
| `GET /api/payments/braintree/config` | `/api/rest/v2/payments/braintree/config` | Availability + env. Returns e.g. `{ "enabled": true, "environment": "sandbox" }`. Drives `syncBraintreeConfig` (mirror of `StripeConfig`). |
| `GET /api/payments/braintree/client-token` | `/api/rest/v2/payments/braintree/client-token` | Returns `{ "success": true, "clientToken": "…" }`. Called by the client adapter at runtime. |

> As of writing, **both 404 on the backend** — only Stripe's
> `/api/rest/v2/payments/stripe/config` exists. Add these to the Maho Braintree
> (Gene_Braintree) module and Braintree activates automatically:
> the next `/sync` registers the plugin, the script loads, and the adapter
> tokenises against `client-token`. The nonce flows to place-order as
> `payment_method_nonce` (the adapter already does this).

## Embed widget

The embed (`src/embed/*`) has a `StripeCardAdapter` only. A Braintree embed
adapter (`src/embed/payments/braintree.ts`, behind the existing `PaymentAdapter`
interface) is a small follow-up once the backend `client-token` endpoint exists.

## Removing Braintree

1. Delete `src/plugins/braintree/`.
2. Remove the `syncBraintreeConfig(...)` call from `src/sync/routes.ts`.
3. Remove the `BRAINTREE_CSP` entry from `CONTRIBUTIONS` in `src/plugins/csp.ts`.
4. Remove `braintree-payment.js` from the serve map in `src/routes/static-assets.ts`.
5. (Optional) drop `public/plugins/braintree-payment.js.txt`.
