/**
 * Maho Storefront — Embeddable Widget
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface EmbedProduct {
  id: number;
  sku: string;
  name: string;
  type: string;
  price: number | null;
  specialPrice: number | null;
  finalPrice: number | null;
  imageUrl: string | null;
  smallImageUrl: string | null;
  thumbnailUrl: string | null;
  mediaGallery: Array<{ url: string; label: string | null; position: number }>;
  urlKey: string | null;
  stockStatus: string;
  shortDescription: string | null;
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
    attributes: Record<string, number>;
    imageUrl: string | null;
  }>;
  hasRequiredOptions: boolean;
}

export interface EmbedCartItem {
  id: number;
  sku: string;
  name: string;
  qty: number;
  price: number;
  priceInclTax: number;
  rowTotal: number;
  rowTotalInclTax: number;
  thumbnailUrl: string | null;
  options: Array<{ label: string; value: string }>;
}

export interface EmbedCart {
  maskedId: string;
  items: EmbedCartItem[];
  itemsQty: number;
  prices: {
    subtotal: number;
    subtotalInclTax: number;
    taxAmount: number;
    shippingAmount: number | null;
    shippingAmountInclTax: number | null;
    grandTotal: number;
    discountAmount: number | null;
  };
  currency: string;
}

export interface ShippingMethod {
  code: string;
  carrierCode: string;
  methodCode: string;
  title: string;
  carrierTitle: string;
  price: number;
}

export interface PaymentMethod {
  code: string;
  title: string;
}

export interface OrderResult {
  orderId: number;
  incrementId: string;
  redirectUrl?: string;
  orderToken?: string;
}

export class EmbedApi {
  private origin: string;
  private storeCode?: string;

  constructor(origin: string, storeCode?: string) {
    this.origin = origin.replace(/\/$/, '');
    this.storeCode = storeCode;
  }

  private storeQuery(prefix = '?'): string {
    return this.storeCode ? `${prefix}store=${this.storeCode}` : '';
  }

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/ld+json', 'Accept': 'application/ld+json' };
  }

  private async post(path: string, body: any): Promise<Response> {
    return fetch(`${this.origin}${path}${this.storeQuery(path.includes('?') ? '&' : '?')}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
  }

  private async get(path: string): Promise<any> {
    const res = await fetch(`${this.origin}${path}${this.storeQuery(path.includes('?') ? '&' : '?')}`, {
      headers: { 'Accept': 'application/ld+json' },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }

  /** Stripe publishable key (populated from /embed/products response) */
  public stripePublishableKey: string | null = null;
  /** Google Maps API key (populated from /embed/products response) */
  public googleMapsKey: string | null = null;
  /** Detected country from Cloudflare geolocation */
  public detectedCountry: string | null = null;

  /** Fetch products by SKUs (also loads store config like Stripe key) */
  async fetchProducts(skus: string[]): Promise<EmbedProduct[]> {
    const params = skus.map(s => `skus[]=${encodeURIComponent(s)}`).join('&');
    const storeParam = this.storeCode ? `&store=${this.storeCode}` : '';
    const res = await fetch(`${this.origin}/embed/products?${params}${storeParam}`);
    if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
    const data = await res.json() as Record<string, any>;
    // Store config from response
    if (data.config?.stripePublishableKey) {
      this.stripePublishableKey = data.config.stripePublishableKey;
    }
    if (data.config?.googleMapsKey) {
      this.googleMapsKey = data.config.googleMapsKey;
    }
    if (data.config?.detectedCountry) {
      this.detectedCountry = data.config.detectedCountry;
    }
    return data.products ?? [];
  }

  /** Create a guest cart, returns masked ID */
  async createCart(): Promise<string> {
    const res = await this.post('/api/guest-carts', {});
    if (!res.ok) throw new Error(`Failed to create cart: ${res.status}`);
    const data = await res.json() as { maskedId: string };
    return data.maskedId;
  }

  /** Add item to cart */
  async addToCart(cartId: string, sku: string, qty: number, options?: Record<string, number>): Promise<any> {
    const body: any = { sku, qty };
    if (options && Object.keys(options).length) {
      body.superAttribute = options;
    }
    const res = await this.post(`/api/guest-carts/${cartId}/items`, body);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, string>;
      throw new Error(err.detail || err.message || `Failed to add to cart: ${res.status}`);
    }
    return res.json();
  }

  /** Get cart details */
  async getCart(cartId: string): Promise<EmbedCart> {
    return this.get(`/api/guest-carts/${cartId}`);
  }

  /** Get available shipping methods for an address */
  async getShippingMethods(cartId: string, address: any): Promise<ShippingMethod[]> {
    const res = await this.post(`/api/guest-carts/${cartId}/shipping-methods`, { address });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, string>;
      throw new Error(err['hydra:description'] || err.detail || 'Could not load shipping methods');
    }
    return res.json();
  }

  /** Get available payment methods */
  async getPaymentMethods(cartId: string): Promise<PaymentMethod[]> {
    return this.get(`/api/guest-carts/${cartId}/payment-methods`);
  }

  /** Get Stripe publishable key */
  async getStripeConfig(): Promise<{ publishableKey: string } | null> {
    try {
      return await this.get('/api/payments/stripe/config');
    } catch {
      return null;
    }
  }

  /** Create a Stripe PaymentIntent */
  async createPaymentIntent(cartId: string, shippingMethod?: string, shippingAddress?: any): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const body: any = { cartId };
    if (shippingMethod) body.shippingMethod = shippingMethod;
    if (shippingAddress) body.shippingAddress = shippingAddress;
    const res = await this.post('/api/payments/stripe/payment-intents', body);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, string>;
      throw new Error(err.message || 'Could not create payment');
    }
    return res.json();
  }

  /** Place order */
  async placeOrder(cartId: string, data: {
    email: string;
    shippingAddress: any;
    billingAddress: any;
    shippingMethod: string;
    paymentMethod: string;
    paymentData?: any;
    storefrontOrigin?: string;
  }): Promise<OrderResult> {
    const res = await this.post(`/api/guest-carts/${cartId}/place-order`, data);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, string>;
      throw new Error(err['hydra:description'] || err.detail || err.message || 'Failed to place order');
    }
    return res.json();
  }

  /** Build checkout handoff URL */
  checkoutUrl(cartId: string): string {
    return `${this.origin}/checkout?cart_id=${cartId}`;
  }

  /** Build product page URL */
  productUrl(urlKey: string): string {
    return `${this.origin}/${urlKey}`;
  }
}
