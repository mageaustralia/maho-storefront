# Maho Storefront — Core Development

Public, open-source headless commerce frontend on Cloudflare Workers.
GitHub: `mageaustralia/maho-storefront`

## Stack

| Layer | Technology |
|-------|------------|
| Edge Runtime | Cloudflare Workers |
| Framework | Hono.js |
| CSS | DaisyUI v5 (CSS-only) + UnoCSS utility classes |
| JS | Hotwired Stimulus + Turbo |
| Build | esbuild (JS) + UnoCSS CLI (CSS) |
| Templating | Hono JSX (SSR) |
| Cache | Cloudflare KV |

## Build

```bash
npm run build        # CSS + JS
CI=true npm run build  # Non-interactive (required for SSH/CI)
```

`CI=true` prevents UnoCSS from entering interactive watch mode.

## Deploy (Demo Sites)

```bash
./deploy.sh
```

Deploys to demo.mageaustralia.com.au (and demo2, demo3, cafe).
Credentials in `.env` (gitignored).

## Directory Structure

```
src/
├── index.tsx           # Worker entry point (all routes)
├── dev-auth.ts         # Password gate, tokens, preview, toolbar
├── api-client.ts       # Maho API client
├── content-store.ts    # KV abstraction (CloudflareKVStore, TrackedKVStore)
├── types.ts            # TypeScript types
├── page-config.ts      # Variant resolver (reads page.json)
├── theme-resolver.ts   # Theme resolver (reads stores.json → theme-*.json)
├── templates/          # Hono JSX templates
│   ├── Layout.tsx      # Base layout
│   ├── Home.tsx        # Homepage (CMS carousel + ShopByCategory)
│   └── components/     # Variant system components
│       ├── navigation/header/    # Header variants
│       ├── homepage/             # Homepage components
│       └── product-display/      # Product page variants
├── js/                 # Client-side JavaScript (Stimulus)
│   ├── app.js          # Entry + controller registration
│   └── controllers/    # Stimulus controllers
└── css/                # Legacy CSS (product.css, responsive.css)

theme.json              # Default theme tokens
stores.json             # Store → theme/pageConfig mapping
page.json               # Default component variant config
uno.config.ts           # UnoCSS config (DaisyUI preflights, theme tokens, safelist)
```

## Theme System

`theme.json` → UnoCSS preflights → CSS custom properties + DaisyUI theme variables.
Each store maps to a theme via `stores.json`. Multiple themes built into one CSS file.

## Component Variant System

`page.json` maps component slots to variant implementations:
```json
{ "product-display.gallery": "gallery-zoom", "navigation.header": "header-sticky" }
```

Variants live in `src/templates/components/{domain}/{slot}/`.

## Key Patterns

- **DaisyUI v5 forms**: `fieldset`+`fieldset-legend`, `<label class="input w-full"><input class="grow">`
- **UnoCSS safelist**: Dynamic CMS/widget content uses utility classes not in source files — add to safelist in `uno.config.ts`
- **Freshness**: Client-side controller checks API for stale content, patches DOM in-place, updates KV
- **Dev auth**: Password gate + dev tokens + preview mode + toolbar (src/dev-auth.ts)
- **TrackedKVStore**: Wraps KV reads with timing for dev toolbar metrics

## Private Deployments

This is the PUBLIC core. Private store deployments (e.g., Pickle Warehouse) are separate repos that fork this one and add their own config. They pull core updates via `git fetch upstream`.

Never commit store-specific credentials, themes, or configs to this repo.
