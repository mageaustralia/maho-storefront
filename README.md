# Maho Storefront

A high-performance, themeable headless storefront for [Maho Commerce](https://mahocommerce.com), built on Cloudflare Workers.

## Stack

| Layer | Technology |
|-------|------------|
| Edge Runtime | [Cloudflare Workers](https://workers.cloudflare.com) |
| Framework | [Hono.js](https://hono.dev) (~14kb) |
| Caching | Cloudflare KV |
| Templating | Hono JSX (SSR) |
| Interactivity | [Hotwire](https://hotwired.dev) (Turbo + Stimulus) |
| Styling | [DaisyUI v5](https://daisyui.com) + [UnoCSS](https://unocss.dev) |
| Build | esbuild + UnoCSS CLI |

## Features

- **Edge-first** — Sub-100ms TTFB globally via Cloudflare Workers with three-tier caching (edge, KV, origin)
- **Themeable** — JSON-driven design tokens with 35+ built-in DaisyUI themes and custom palette themes
- **Multi-store** — One Worker serves multiple stores with isolated themes, configs, and catalog data
- **Component variants** — 36 swappable component slots across 8 domains, configured per-store via `page.json`
- **No framework runtime** — Server-rendered HTML with progressive enhancement via Stimulus controllers
- **SEO-friendly** — Full HTML rendered server-side, works without JavaScript

## Quick Start

```bash
# Install dependencies
npm install

# Local development
npm run dev

# Build CSS + JS
npm run build

# Deploy to Cloudflare
./deploy.sh
```

## Project Structure

```
maho-storefront/
├── src/
│   ├── index.tsx              # Worker entry point + routes
│   ├── api-client.ts          # Maho backend API client
│   ├── content-store.ts       # KV cache abstraction
│   ├── page-config.ts         # Component variant resolver
│   ├── templates/             # Hono JSX templates
│   │   ├── Layout.tsx
│   │   ├── Home.tsx, Product.tsx, Category.tsx, ...
│   │   └── components/        # Variant-based components
│   │       ├── navigation/    # Header, footer, megamenu
│   │       ├── product-display/  # Cards, galleries, layouts
│   │       ├── cart/          # Cart drawer variants
│   │       └── ...
│   ├── js/                    # Client-side Stimulus controllers
│   │   ├── app.js             # Entry point
│   │   └── controllers/       # 19 Stimulus controllers
│   └── css/                   # Legacy CSS (product page, responsive)
├── public/                    # Built assets (generated)
├── stores.json                # Per-store theme + page config mapping
├── palette-themes.json        # Custom color palette themes
├── theme.json                 # Design token definitions
├── uno.config.ts              # UnoCSS + DaisyUI configuration
└── deploy.sh                  # Build & deploy to Cloudflare
```

## Theming

Each store maps to a theme via `stores.json`:

```json
{
  "stores": {
    "en": { "theme": "nord", "pageConfig": "page.json" },
    "sv_2": { "theme": "corporate", "pageConfig": "page-tech.json" }
  }
}
```

Themes can be DaisyUI built-in themes (`nord`, `luxury`, `corporate`, etc.) or custom palette themes defined in `palette-themes.json`.

## Documentation

Full documentation is available at **[docs.mageaustralia.com.au](https://docs.mageaustralia.com.au/)**.

Documentation source: [mageaustralia/maho-storefront-docs](https://github.com/mageaustralia/maho-storefront-docs)

## Requirements

- Node.js 18+
- [Maho Commerce](https://mahocommerce.com) backend
- **[Maho API Platform](https://github.com/mageaustralia/maho/tree/feature/api-platform)** — The storefront requires the Maho REST API (currently on the `feature/api-platform` branch). This provides the product catalog, cart, checkout, customer, and CMS endpoints that the storefront consumes.
- Cloudflare account (Workers + KV)

## License

Copyright (c) 2026 Mage Australia Pty Ltd

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-or-later).

Commercial licensing is available for organisations that require proprietary modifications without open-source obligations. Contact [hello@mageaustralia.com.au](mailto:hello@mageaustralia.com.au) for details.
