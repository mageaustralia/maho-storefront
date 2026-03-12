/**
 * Maho Storefront — Embeddable Widget
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EmbedApi } from './api';

const CART_KEY = 'maho_embed_cart_id';

export class CartManager {
  private api: EmbedApi;
  private cartId: string | null = null;
  private itemCount = 0;
  private onUpdate: (count: number) => void;

  constructor(api: EmbedApi, onUpdate: (count: number) => void) {
    this.api = api;
    this.onUpdate = onUpdate;
    this.cartId = this.loadCartId();
  }

  private loadCartId(): string | null {
    try {
      return localStorage.getItem(CART_KEY);
    } catch {
      return null;
    }
  }

  private saveCartId(id: string) {
    this.cartId = id;
    try {
      localStorage.setItem(CART_KEY, id);
    } catch {}
  }

  private async ensureCart(): Promise<string> {
    if (this.cartId) return this.cartId;
    const id = await this.api.createCart();
    this.saveCartId(id);
    return id;
  }

  async addItem(sku: string, qty: number, options?: Record<string, number>): Promise<void> {
    const cartId = await this.ensureCart();
    await this.api.addToCart(cartId, sku, qty, options);
    this.itemCount += qty;
    this.onUpdate(this.itemCount);
  }

  async refreshCount(): Promise<void> {
    if (!this.cartId) return;
    try {
      const cart = await this.api.getCart(this.cartId);
      this.itemCount = cart.itemsQty ?? 0;
      this.onUpdate(this.itemCount);
    } catch {
      // Cart may have expired
      this.cartId = null;
      try { localStorage.removeItem(CART_KEY); } catch {}
      this.itemCount = 0;
      this.onUpdate(0);
    }
  }

  getCheckoutUrl(): string | null {
    if (!this.cartId) return null;
    return this.api.checkoutUrl(this.cartId);
  }

  getItemCount(): number {
    return this.itemCount;
  }

  getCartId(): string | null {
    return this.cartId;
  }

  clearCart(): void {
    this.cartId = null;
    this.itemCount = 0;
    try { localStorage.removeItem(CART_KEY); } catch {}
    this.onUpdate(0);
  }
}
