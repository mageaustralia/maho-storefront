/**
 * Maho Storefront — Filterable Pages Plugin
 * Types for menu data, brand/filter pages, and enriched layered nav
 */

export interface MenuColumn {
  title: string;
  attributeCode: string;
  items: MenuColumnItem[];
}

export interface MenuColumnItem {
  label: string;
  urlKey: string;
  optionId: number;
  count: number;
}

export interface FeaturedProduct {
  sku: string;
  name: string;
  price: number;
  imageUrl: string;
  url: string;
}

export interface MenuData {
  id: number;
  columns: MenuColumn[];
  featuredProduct: FeaturedProduct | null;
}

export interface FilterablePage {
  id: number;
  title: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  image: string | null;
  canonicalUrl: string | null;
  categoryId: number | null;
  attributeCode: string | null;
  optionId: number | null;
  filters: Record<string, string>;
  cmsBlockId: number | null;
  cmsBlockBottomId: number | null;
  pageId: number | null;
  pageUrl: string | null;
}

export interface EnrichedFilterOption {
  value: string;
  label: string;
  count: number;
  url: string | null;
}

export interface EnrichedFilter {
  code: string;
  label: string;
  type: string;
  position: number;
  options: EnrichedFilterOption[];
}
