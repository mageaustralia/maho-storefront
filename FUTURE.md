# Future Plans

## Traditional (Non-Headless) Maho Theme

A traditional Maho theme using the same design system as the headless storefront — same look, same JS behaviour, no Cloudflare/KV/API infrastructure required.

### Concept

- **DaisyUI** components + utility classes for all UI
- **Stimulus + Turbo** for JS behaviour (same controllers, same `data-controller` attributes)
- **phtml templates** instead of Hono JSX — structurally similar, ~60-70% portable
- **Standard Maho FPC** instead of Cloudflare edge cache
- **No build step required for end users** (see CSS options below)

### CSS Strategy Options

1. **Bundled pre-built CSS** _(recommended)_ — run UnoCSS once at release time with a comprehensive safelist, ship `theme.css` as part of the theme package. Zero tooling needed for end users. Same model as Shopify themes.
2. **CDN runtime** — include `@unocss/runtime` via CDN script tag, browser scans DOM and generates styles at runtime. No build step, minor FOUC tradeoff.
3. **Node build step** — same as current headless workflow (`unocss` CLI). Appropriate for agencies/developers who already have a build pipeline.

### Migration Path

The goal is that a site could start on the traditional theme and migrate to headless later — templates and JS controllers are largely compatible, infrastructure is the main difference.

### Work Required

- [ ] Scaffold a standard Maho theme directory structure (`app/design/frontend/maho/default/`)
- [ ] Port JSX templates to phtml (mechanical but thorough)
- [ ] Replace API data fetching with Mage model/collection calls
- [ ] Remove headless-specific layout handling (LayoutShell, variant system → use layout XML handles instead)
- [ ] Generate bundled `theme.css` with full safelist and include in theme
- [ ] Test Turbo + Stimulus lifecycle with standard Maho page structure
- [ ] Verify FPC compatibility with Turbo navigation
