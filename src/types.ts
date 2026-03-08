/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface Product {
  id: number | null;
  sku: string;
  name: string;
  type: string;
  status: string;
  visibility: string;
  stockStatus: string;
  stockQty: number | null;
  weight: number | null;
  price: number | null;
  specialPrice: number | null;
  finalPrice: number | null;
  minimalPrice: number | null;
  tierPrices: Array<{ qty: number; price: number; savePercent: number }>;
  description: string | null;
  shortDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  pageLayout: string | null;
  metaKeywords: string | null;
  urlKey: string | null;
  imageUrl: string | null;
  smallImageUrl: string | null;
  thumbnailUrl: string | null;
  mediaGallery: Array<{ url: string; label: string | null; position: number }>;
  categoryIds: number[];
  configurableOptions: Array<{
    id: number;
    code: string;
    label: string;
    values: Array<{ id: number; label: string }>;
  }>;
  variants: Array<{
    id: number;
    sku: string;
    price: number | null;
    finalPrice: number | null;
    stockQty: number | null;
    inStock: boolean;
    stockStatus?: string;
    attributes: Record<string, number>;
    imageUrl: string | null;
  }>;
  customOptions: Array<{
    id: number;
    title: string;
    type: string;
    isRequired: boolean;
    sortOrder: number;
    price: number | null;
    priceType: string | null;
    values: Array<{ id: number; title: string; price: number; priceType: string | null; sortOrder: number }>;
  }>;
  groupedProducts: Array<{
    id: number;
    sku: string;
    name: string;
    price: number | null;
    finalPrice: number | null;
    stockStatus: string;
    thumbnailUrl: string | null;
    defaultQty: number;
    position: number;
  }> | null;
  bundleOptions: Array<{
    id: number;
    title: string;
    type: string; // select, radio, checkbox, multi
    required: boolean;
    position: number;
    selections: Array<{
      id: number;
      sku: string;
      name: string;
      price: number;
      priceType: string; // fixed, percent
      qty: number;
      defaultQty: number;
      isDefault: boolean;
      canChangeQty: boolean;
      position: number;
      tierPrices?: Array<{ qty: number; price: number; savePercent: number }>;
    }>;
  }> | null;
  downloadableLinks: Array<{
    id: number;
    title: string;
    price: number;
    sortOrder: number;
    sampleUrl: string | null;
  }> | null;
  linksPurchasedSeparately: boolean;
  hasRequiredOptions: boolean;
  additionalAttributes?: Array<{ label: string; value: string; code: string }>;
  reviewCount: number;
  averageRating: number | null;
  relatedProducts: Product[] | null;
  crosssellProducts: Product[] | null;
  upsellProducts: Product[] | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Category {
  id: number | null;
  parentId: number | null;
  name: string;
  menuTitle: string | null;
  categoryHeading: string | null;
  description: string | null;
  urlKey: string | null;
  urlPath: string | null;
  image: string | null;
  level: number;
  position: number;
  isActive: boolean;
  includeInMenu: boolean;
  productCount: number;
  children: Category[];
  childrenIds: number[];
  path: string | null;
  displayMode: string | null;
  cmsBlock: string | null;
  megaMenuDescription: string | null;
  metaTitle: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
  pageLayout: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StoreConfig {
  id: string;
  storeCode: string;
  storeName: string;
  baseCurrencyCode: string;
  defaultDisplayCurrencyCode: string;
  locale: string;
  timezone: string;
  weightUnit: string;
  baseUrl: string;
  baseMediaUrl: string;
  allowedCountries: string[];
  isGuestCheckoutAllowed: boolean;
  newsletterEnabled: boolean;
  wishlistEnabled: boolean;
  reviewsEnabled: boolean;
  logoUrl: string | null;
  logoAlt: string | null;
  defaultTitle: string | null;
  defaultDescription: string | null;
  cmsHomePage: string;
  extensions?: StoreConfigExtensions;
}

export interface PaymentPlugin {
  code: string;
  script: string;
  config?: Record<string, string>;
}

export interface StoreConfigExtensions {
  paymentPlugins?: PaymentPlugin[];
  [key: string]: unknown;
}

export interface CmsPage {
  id: number | null;
  identifier: string;
  title: string;
  contentHeading: string | null;
  content: string | null;
  imageUrl?: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
  pageLayout: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  categoryIds?: number[];   // blog posts only
}

export interface CartItem {
  id: number | null;
  sku: string;
  name: string;
  productId: number | null;
  productType: string | null;
  thumbnailUrl: string | null;
  qty: number;
  price: number;
  priceInclTax: number;
  rowTotal: number;
  rowTotalInclTax: number;
  rowTotalWithDiscount: number;
  discountAmount: number | null;
  discountPercent: number | null;
  taxAmount: number | null;
  taxPercent: number | null;
  options: Array<{ label: string; value: string }>;
  fulfillmentType: string;
  stockStatus: string;
}

export interface Cart {
  id: number | null;
  maskedId: string | null;
  customerId: number | null;
  storeId: number;
  isActive: boolean;
  items: CartItem[];
  prices: {
    subtotal: number;
    subtotalInclTax: number;
    subtotalWithDiscount: number;
    discountAmount: number | null;
    shippingAmount: number | null;
    shippingAmountInclTax: number | null;
    taxAmount: number;
    grandTotal: number;
    giftcardAmount: number | null;
  };
  appliedCoupon: { code: string; discountAmount: number } | null;
  appliedGiftcards: Array<{ code: string; balance: number; appliedAmount: number }>;
  currency: string;
  itemsCount: number;
  itemsQty: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Country {
  id: string;
  name: string;
  iso2Code: string;
  iso3Code: string;
  availableRegions: Array<{ id: number; code: string; name: string }>;
}

export interface ShippingMethod {
  code: string;
  carrierCode: string;
  methodCode: string;
  title: string;
  description: string | null;
  price: number;
}

export interface PaymentMethod {
  code: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isOffline: boolean;
}

export interface OrderResult {
  orderId: number;
  incrementId: string;
  status: string;
  grandTotal: number;
}

export interface Review {
  id: number | null;
  productId: number | null;
  productName: string | null;
  title: string;
  detail: string;
  nickname: string;
  rating: number;
  status: string;
  createdAt: string | null;
}

export interface BlogPost {
  id: number | null;
  title: string;
  urlKey: string;
  content: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  publishDate: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  status: string;
  categoryIds: number[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BlogCategory {
  id: number;
  name: string;
  urlKey: string;
  parentId: number | null;
  path: string | null;
  level: number;
  position: number;
  isActive: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
}

export interface WishlistItem {
  id: number | null;
  productId: number;
  productName: string;
  productSku: string;
  productPrice: number | null;
  productImageUrl: string | null;
  productUrl: string | null;
  productType: string | null;
  qty: number;
  description: string | null;
  addedAt: string | null;
  inStock: boolean;
}

export interface PulseData {
  hash: string;
  updatedAt: string;
}

// Env bindings for Cloudflare Workers
export interface StorefrontStore {
  code: string;
  name: string;
  url: string;
  apiUrl?: string;
}

export interface Env {
  CONTENT: KVNamespace;
  MAHO_API_URL: string;
  SYNC_SECRET: string;
  DEV_SECRET?: string;        // HMAC signing key for dev session cookies
  MAHO_API_BASIC_AUTH?: string; // Optional basic auth for API (user:pass)
  STORES?: string;       // JSON array of StorefrontStore
}