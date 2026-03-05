# Maho Admin Theme — Modern Restyle Plan

Target: `maho.tenniswarehouse.com.au` (branch: `feature/admin-theme`)
Files live on staging at `/var/www/maho.tenniswarehouse.com.au/web/` — deployed via SSH, not git-committed yet.

---

## Overview

Three-phase modernisation of the Maho admin UI. Phases 1 and 2 are complete. Phase 3 (Turbo) not started.

---

## Phase 1 — Layout & CSS ✅ DONE

**Goal:** Replace the old wrapper/header/content layout with a modern left-sidebar shell.

### What was done

**`app/design/adminhtml/default/default/template/page.phtml`** — full rewrite:
- Replaced `.wrapper` + `.header` layout with CSS Grid `admin-shell`
- Dark sidebar (`#1e293b`, 240px) with: logo, collapse toggle button, nav, user footer (account + logout)
- Main content area takes remaining width
- Added `<script type="speculationrules">` to disable browser prefetch (admin URLs have session tokens — prefetch causes PHP session lock 503s)
- Stimulus `data-controller="admin-sidebar"` on shell, `data-controller="admin-nav"` on nav

**`public/skin/adminhtml/default/default/maho-admin.css`** (~94KB, updated Mar 3):
- Full admin CSS: sidebar, topbar, content-header, cards, grids, forms, modals
- CSS custom properties (`--sidebar-w`, `--header-h`, etc.)
- Responsive collapse behaviour

**`app/design/adminhtml/default/default/layout/main.xml`** — modified:
- Added `order-fresh.css` after `form.css`

---

## Phase 2 — Stimulus JS ✅ DONE

**Goal:** Wired-up interactive behaviours using Hotwired Stimulus.

**`public/skin/adminhtml/default/default/js/maho-admin.js`** (~19KB, updated Mar 3):

### Stimulus controllers (loaded from jsDelivr CDN)
- **`AdminSidebarController`** — collapse/expand sidebar, persists to `localStorage`
- **`AdminNavController`** — click-to-expand submenus at all levels, auto-expands active branch, persists open state to `localStorage`. Handles edge case: clicking a level-0 item when sidebar is collapsed expands sidebar first.

### Command Palette (⌘K / ⌘J)
- **⌘K** → "Pages" tab: indexes entire `#nav` sidebar DOM into flat array, client-side fuzzy search with scoring/highlighting, navigate to any admin page
- **⌘J** → "Records" tab: posts to Maho's existing `/admin/index/globalSearch` AJAX endpoint, searches orders/products/customers
- Auto-populates from nav DOM — new extensions appear automatically
- Badge button injected into `.content-header` on every page
- `turbo:load` listeners already wired (no-ops until Phase 3)

### Other
- Resizable left panel (drag handle, persists width to `localStorage`)
- Topbar height tracker → `--admin-topbar-h` CSS var for sticky offset

---

## Order View Reskin — In Progress 🔄

**Goal:** Make the sales order view match the `sales_orders.html` local prototype.

**`public/skin/adminhtml/default/default/order-fresh.css`** (~49KB, deployed Mar 3-4):
- Loaded after `form.css` via `main.xml`
- Redesigns order view: card-based layout, sidebar panels, compact data tables, badge statuses
- **NOT yet committed to git** — only deployed directly to staging skin dir

### Known issues worked on today
- Commented out `.entry-edit fieldset > table.form-list` margin/width rule (was breaking layout)
- Fixed `#maho-cmd-palette { display: none }` which was killing ⌘K/⌘J (the rule was hiding the palette entirely)

### Still needs work
- Various sections of the order view likely still need CSS fixes
- Compare live page against `sales_orders.html` prototype to identify remaining gaps

---

## Phase 3 — Turbo Navigation ❌ NOT STARTED

**Goal:** SPA-style navigation within the admin (no full page reloads).

### What's needed
- Load `@hotwired/turbo` in admin head (add to `main.xml` or `head.phtml`)
- Audit all page-specific JS for Turbo compatibility (event listeners that only fire once, etc.)
- Test command palette lifecycle with Turbo navigation (already has `turbo:load` hooks)
- Test Stimulus controller reconnect/disconnect
- Handle admin AJAX forms (many use prototype.js patterns) — may need `data-turbo="false"` on some forms
- Test Flash messages / session-based notifications

### Risk areas
- Maho admin has lots of legacy inline JS and prototype.js event wiring
- Some pages use `Event.observe` / `$('element').observe()` — won't re-fire after Turbo navigation
- Form submissions with file uploads need `data-turbo="false"`

---

## File Locations

| File | Location |
|------|----------|
| Page template | `app/design/adminhtml/default/default/template/page.phtml` |
| Layout XML | `app/design/adminhtml/default/default/layout/main.xml` |
| Admin CSS | `public/skin/adminhtml/default/default/maho-admin.css` |
| Admin JS | `public/skin/adminhtml/default/default/js/maho-admin.js` |
| Order CSS | `public/skin/adminhtml/default/default/order-fresh.css` |
| Local prototype | `~/Development/maho-storefront/sales_orders_files/order-fresh.css` |
| Local HTML mock | `~/Development/maho-storefront/sales_orders.html` |

## Deploy

```bash
# CSS only
scp -P 22582 sales_orders_files/order-fresh.css web26@staging.tenniswarehouse.com.au:/var/www/maho.tenniswarehouse.com.au/web/public/skin/adminhtml/default/default/order-fresh.css

# Flush cache after layout XML changes
ssh web26@staging.tenniswarehouse.com.au -p 22582 "cd /var/www/maho.tenniswarehouse.com.au/web && php maho cache:flush"
```
