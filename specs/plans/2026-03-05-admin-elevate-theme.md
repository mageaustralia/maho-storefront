# Maho Admin — Elevate Theme (theme-elevate.css)

## Context

The Maho admin loads CSS: `base.css` → `form.css` → `order-fresh.css` → `menu.css` → `maho-admin.css` → **`theme-elevate.css`**

`maho-admin.css` (3137 lines, 100KB) is our comprehensive admin redesign — dark slate sidebar with expand/collapse, CSS Grid layout, SVG nav icons, command palette, card-based UI. The **sidebar CSS (~800 lines)** was carefully crafted over hours and must NOT be touched.

The current `theme-elevate.css` on the server (17KB) is broken — text cutoff, missing tab delineation, double borders, chevron overlap, hollow buttons, horizontal scrollbar.

**Goal**: Rewrite `theme-elevate.css` as a clean ~160-line override that fixes specific issues on both **config pages** and **grid/table pages** (orders, customers), with a cohesive modern aesthetic.

## Design Direction

- **Palette**: Our established custom palette from maho-admin.css (NOT default Maho colors):
  - Sidebar: dark slate `#1e293b`
  - Content bg: `#f8fafc`
  - Card bg: `#ffffff`
  - Borders: `#e2e8f0`
  - Accent: `#3b82f6` (blue-500)
  - Text: slate scale (#1f2937 → #6b7280 → #94a3b8)
- **Aesthetic**: Clean, crisp, modern — Shopify/Stripe density
- **Depth**: Borders-only (flat), consistent with our card system
- **Typography**: System font stack with antialiasing

## Pre-Implementation Safety

1. **Git commit** saved HTML files + current CSS as rollback point
2. **Never modify** maho-admin.css — all fixes in theme-elevate.css only

## Files

| File | Action |
|------|--------|
| `maho_admin_files/theme-elevate.css` | **Rewrite** |
| Server `skin/adminhtml/default/default/theme-elevate.css` | **Upload** after local testing |

## Specific Fixes

### Config Page (maho_admin.html)

| # | Issue | Selector | Fix |
|---|-------|----------|-----|
| 1 | Scope dropdown text cutoff | `.admin-page-left`, `.switcher select` | Widen to 220px, `width: 100%` on select |
| 2 | No tab delineation | `.admin-page-left ul.tabs a`, `dt` headers | Subtle borders between items, stronger border between groups |
| 3 | Double border left-nav/content | `.admin-page-left` | Remove right border (resize handle gap is enough) |
| 4 | Chevron color wrong | `dl.accordion dt a:after`, `div.collapseable a:after` | Change border-color from `#888` to `#94a3b8`. **Keep existing mechanism** — base.css border-triangles work fine |
| 5 | Configure buttons hollow | `table.form-list td button[type="button"]` | Solid fill: `bg: #f8fafc`, `border: 1px solid #d1d5db`, `color: #334155` |
| 6 | Horizontal scrollbar | `html, body`, `.admin-page-cols` | `overflow-x: hidden/clip` |

### Grid/Table Pages (sales_orders.html)

| # | Issue | Selector | Fix |
|---|-------|----------|-----|
| 7 | Action buttons (Export, Search, Reset) | `.filter-actions button`, `table.actions button` | Same solid fill as #5 |
| 8 | Filter input focus | `.grid tr.filter input:focus` | Blue focus ring |
| 9 | Grid row hover | `.grid tbody tr:hover td` | Subtle `rgba(0,0,0,0.012)` |

### Shared Refinements

| # | What | Selector | Fix |
|---|------|----------|-----|
| 10 | Font antialiasing | `body` | `-webkit-font-smoothing: antialiased` |
| 11 | Save button | `.content-header button.scalable.save` | Solid `#2563eb`, no gradient, no text-shadow |
| 12 | Form focus ring | `input:focus, select:focus, textarea:focus` | `border-color: #3b82f6`, `box-shadow: 0 0 0 3px rgba(59,130,246,0.1)` |
| 13 | Help text | `.form-list p.note` | `font-size: 12px`, `color: #94a3b8` |
| 14 | Scope labels | `td.scope-label` | `10px`, uppercase, `#94a3b8` |
| 15 | Warning text | `.form-list .note strong` | `color: #d97706` |

## Implementation Steps

1. `git add` + commit local HTML/CSS files
2. Write new `theme-elevate.css` (~160 lines)
3. Test locally with Playwright on both HTML pages
4. SCP upload to server
5. SSH clear Maho cache
6. Verify on live admin (config + orders pages)

## Key Principle

**Don't fight base.css — adjust it.** Chevrons, accordions, and form structure all work. Just fix colors, fill states, and spacing to match our slate/blue palette.
