# Filterable Pages Plugin — Integration Guide

## Prerequisites

The `MageAustralia_FilterablePages` Maho module must be installed and the Amasty data imported.

## 1. Register Routes

In `src/index.tsx`, **before** the catch-all `/:parent/:child` route:

```typescript
import { registerFilterablePagesRoutes, FilterablePagesApi } from './plugins/filterable-pages';

// After other app.post/app.get routes, before URL resolver section:
registerFilterablePagesRoutes(app, {
  createStore: (env) => new CloudflareKVStore(env.CONTENT),
  getStoreContext,
  getStoreData,
  getApiUrl,
  checkSyncAuth,
  createFilterApi: (env, stores, storeCode) =>
    new FilterablePagesApi(getApiUrl(env, stores, storeCode), storeCode, env.MAHO_API_BASIC_AUTH),
});
```

## 2. Add to Full Sync

In the `app.post('/sync', ...)` handler, after category/product sync:

```typescript
import { syncFilterablePages, FilterablePagesApi } from './plugins/filterable-pages';

// Inside the store loop, after products sync:
try {
  const filterApi = new FilterablePagesApi(
    getApiUrl(c.env, stores, storeCode),
    storeCode,
    c.env.MAHO_API_BASIC_AUTH,
  );
  const filterResult = await syncFilterablePages(filterApi, store, prefix);
  results[`${storeCode || 'default'}:filterable-pages`] =
    `${filterResult.menuData} menus, ${filterResult.filterPages} pages`;
} catch { /* FilterablePages module not available — skip */ }
```

## 3. Intercept /:parent/:child for Filter Pages

In the first `app.get('/:parent/:child', ...)` handler, add at the top:

```typescript
import { resolveFilterPage } from './plugins/filterable-pages/resolver';
import { FilterPage } from './plugins/filterable-pages';

// After getting prefix and store:
const filterPage = await resolveFilterPage(store, prefix, parentSlug, childSlug);
if (filterPage && filterPage.categoryId) {
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const productsData = await store.get<{ products: Product[]; totalItems: number }>(
    `${prefix}products:category:${filterPage.categoryId}:page:${page}`
  );
  // TODO: filter products by the attribute value client-side or fetch filtered from API
  const products = productsData?.products ?? [];
  const totalItems = productsData?.totalItems ?? 0;
  const totalPages = Math.ceil(totalItems / 12);
  const parentCategory = categories.find(c => c.id === filterPage.categoryId) ?? null;

  return c.html(
    <FilterPage
      config={config}
      categories={categories}
      category={parentCategory!}
      filterPage={filterPage}
      products={products}
      currentPage={page}
      totalPages={totalPages}
      totalItems={totalItems}
      stores={stores}
      currentStoreCode={currentStoreCode}
      devData={devData}
    />
  );
}
```

## 4. Megamenu Enhancement (Optional)

Replace subcategory columns in the header with attribute-based columns:

```typescript
import { getMenuData } from './plugins/filterable-pages/resolver';
import { MegaMenuPanel } from './plugins/filterable-pages';

// In header rendering, for each category:
const menuData = await getMenuData(store, prefix, cat.id);
if (menuData) {
  // Render MegaMenuPanel instead of default subcategory list
  return <MegaMenuPanel menuData={menuData} categoryUrlKey={cat.urlKey} />;
}
```

## KV Keys

| Key Pattern | Content |
|-------------|---------|
| `{prefix}menu:{categoryId}` | MenuData (columns + featured product) |
| `{prefix}filter-page:{category}/{option}` | FilterablePage content |
| `{prefix}enriched-filters:{categoryId}` | EnrichedFilter[] (layered nav with URLs) |

## Sync Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /sync/filterable-pages` | Full sync: menu data + filter pages + enriched filters |
| `POST /sync/menu-data` | Menu data only (quick megamenu refresh) |

## Client API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/menu-data/:categoryId` | Menu data from KV |
| `GET /api/enriched-filters/:categoryId` | Enriched filters from KV |
| `GET /api/filter-page/:category/:option` | Filter page content from KV |
