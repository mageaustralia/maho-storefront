/**
 * Maho Storefront — Filterable Pages Plugin
 *
 * Optional module: megamenu with brand columns, brand/filter pages,
 * and enriched layered nav with clean SEO URLs.
 *
 * Requires the MageAustralia_FilterablePages Maho module on the backend.
 */

export { FilterablePagesApi } from './api';
export { syncFilterablePages, syncMenuDataOnly } from './sync';
export { registerFilterablePagesRoutes } from './routes';
export { resolveFilterPage, getMenuData } from './resolver';
export { MegaMenuPanel } from './templates/components/megamenu/MegaMenuPanel';
export { FilterPage } from './templates/FilterPage';
export type {
  MenuData,
  MenuColumn,
  MenuColumnItem,
  FeaturedProduct,
  FilterablePage,
  EnrichedFilter,
  EnrichedFilterOption,
} from './types';
