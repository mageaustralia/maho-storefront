# Page-config copy — keep brand voice out of core templates

Core templates ship with **generic, brand-neutral copy**. Anything that
sounds like a particular brand's voice — taglines, location markers,
commercial-policy strings, opinionated headlines — lives in the brand's
`themes/<theme>/page.json`, not in the JSX.

This is the same trade-off Hydrogen, Vercel Commerce, and Stripe Elements
make: rich opinionated defaults, **but every visible string is overridable
without forking the template**.

## Reading copy in a template

```tsx
import { getSection } from '../page-config';

const headline = getSection<string>('blog', 'headline', 'Latest articles', currentStoreCode);
```

Signature: `getSection<T>(page, key, fallback, storeCode?)` returns the
brand-overridable value at `pages.<page>.<key>` from the resolved
theme's `page.json`, falling back to the third arg if the key is unset.

## Where defaults live

`themes/maho/page.json` ships generic, deliberately unvoiced defaults:

```json
{
  "pages": {
    "blog": {
      "kicker": "Journal",
      "headline": "Latest articles",
      "headlineAccent": "",
      "subheadline": ""
    },
    "marketplace": {
      "kicker": "Catalogue",
      "headline": "Extensions",
      "headlineAccent": "",
      "subheadline": "Composer-installable extensions for Maho.",
      "taglineChips": ["Honest pricing", "Maho Storefront ready"],
      "seoDescription": "Curated Maho e-commerce extensions."
    }
  }
}
```

Anything voiced — "crafted in Melbourne," "Notes from the build floor,"
"Year-one updates included" — is **not in core**.

## Where brand voice lives

Brands set their voice in `themes/<theme>/page.json`. For Mageaustralia
that's the overlay repo at `mageaustralia-storefront/overlay/themes/mageaustralia/page.json`:

```json
{
  "pages": {
    "blog": {
      "kicker": "Journal",
      "headline": "Notes from the",
      "headlineAccent": "build floor.",
      "subheadline": "Thinking out loud about Maho, modern PHP commerce, …"
    },
    "marketplace": {
      "kicker": "Catalogue",
      "headline": "Modern Maho extensions,",
      "headlineAccent": "crafted in Melbourne.",
      "subheadline": "Composer-installable. Pay-once with year-one updates. …",
      "taglineChips": ["Honest pricing", "Maho Storefront ready"],
      "seoDescription": "Curated Maho e-commerce extensions, maintained by Mage Australia."
    },
    "marketplaceExtension": {
      "warrantyNote": "Year-one updates included. Optional 30%/yr maintenance after."
    }
  }
}
```

## The headline + headlineAccent pattern

Editorial templates pair a headline with an italicised accent fragment
("Modern Maho extensions, *crafted in Melbourne.*"). To keep markup out of
JSON, expose two keys:

```json
"headline": "Modern Maho extensions,",
"headlineAccent": "crafted in Melbourne."
```

The template renders the accent inside an italic span when present. Brands
that don't want a two-line headline simply leave `headlineAccent` empty.

## When NOT to add a copy token

- **Field labels and aria text** are UX furniture — keep them in the
  template, run them through the i18n layer.
- **Generic UI affordances** like "View extension →" or pagination labels
  belong to the template's structure, not the brand's voice.
- **Per-product/per-page content** comes from Maho data, not page-config.

The line: if it's a string a brand might want to *rewrite*, it's a copy
token. If it's a string that gets *translated*, it's i18n.

## Adding a new copy token

1. Use `getSection<T>('page', 'key', 'Sensible generic default')` in the
   template.
2. Document the key under `themes/maho/page.json` (the canonical default)
   so other themes know it exists.
3. (Optional) Add the brand-specific value to your overlay theme's
   `page.json`.

The `themes/<theme>/page.json` is treated like a public surface — only add
values brands are expected to override.
