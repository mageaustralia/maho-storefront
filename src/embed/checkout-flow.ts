/**
 * Maho Storefront — Embeddable Widget — Inline Checkout
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EmbedApi, type EmbedCart, type ShippingMethod, type PaymentMethod } from './api';
import type { CartManager } from './cart-manager';
import { lightboxStyles } from './styles';

type Step = 'cart' | 'shipping' | 'delivery' | 'payment' | 'confirm';

const STRIPE_JS_URL = 'https://js.stripe.com/v3/';
// Google Maps API key is passed via config; empty = autocomplete disabled

interface CountryOption {
  id: string;
  name: string;
  regions?: Array<{ id: number; code: string; name: string }>;
}

export class CheckoutFlow {
  private container: HTMLElement;
  private api: EmbedApi;
  private cartManager: CartManager;
  private currency: string;
  private storeOrigin: string;
  private defaultCountry: string;
  private countries: CountryOption[];
  private googleMapsKey: string;
  private detectedCountry: string;

  private step: Step = 'cart';
  private cart: EmbedCart | null = null;
  private shippingMethods: ShippingMethod[] = [];
  private paymentMethods: PaymentMethod[] = [];
  private selectedShipping: string = '';
  private selectedPayment: string = '';

  // Address form state
  private address = {
    email: '', firstName: '', lastName: '', street: '', street2: '',
    city: '', postcode: '', countryId: '', regionId: '', region: '', telephone: '',
  };

  // Stripe
  private stripe: any = null;
  private stripeElements: any = null;
  private cardElement: any = null;
  private cardComplete = false;

  // Order result
  private orderResult: { incrementId: string } | null = null;

  constructor(
    container: HTMLElement,
    api: EmbedApi,
    cartManager: CartManager,
    currency: string,
    storeOrigin: string,
    defaultCountry: string,
    countries: CountryOption[],
    googleMapsKey: string = '',
    detectedCountry: string = '',
  ) {
    this.container = container;
    this.api = api;
    this.cartManager = cartManager;
    this.currency = currency;
    this.storeOrigin = storeOrigin;
    this.defaultCountry = defaultCountry;
    this.countries = countries;
    this.googleMapsKey = googleMapsKey;
    this.detectedCountry = detectedCountry;
    this.address.countryId = detectedCountry || defaultCountry;
  }

  async start() {
    this.step = 'cart';
    await this.loadCart();
    this.render();
  }

  private async loadCart() {
    const cartId = this.cartManager.getCartId();
    if (!cartId) return;
    try {
      this.cart = await this.api.getCart(cartId);
    } catch {
      this.cart = null;
    }
  }

  private formatPrice(amount: number | null | undefined): string {
    if (amount == null) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: this.currency }).format(amount);
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private escHtml(s: string): string {
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }

  private get stepIndex(): number {
    return ['cart', 'shipping', 'delivery', 'payment', 'confirm'].indexOf(this.step);
  }

  private renderDots(): string {
    const steps = ['cart', 'shipping', 'delivery', 'payment'];
    return steps.map((s, i) =>
      `<span class="maho-co-dot ${i < this.stepIndex ? 'done' : ''} ${i === this.stepIndex ? 'active' : ''}"></span>`
    ).join('');
  }

  render() {
    // Replace :host with .maho-embed-root for light DOM compatibility
    const css = lightboxStyles.replace(/:host\s*\{/g, '.maho-embed-root {');

    let html = `<style>${css}</style>`;
    html += `<div class="maho-embed-root"><div class="maho-overlay"><div class="maho-lightbox">`;

    switch (this.step) {
      case 'cart': html += this.renderCart(); break;
      case 'shipping': html += this.renderShipping(); break;
      case 'delivery': html += this.renderDelivery(); break;
      case 'payment': html += this.renderPayment(); break;
      case 'confirm': html += this.renderConfirm(); break;
    }

    html += `</div></div></div>`;
    this.container.innerHTML = html;
    this.bindCommon();

    if (this.step === 'payment') {
      this.mountStripe();
    }

    if (this.step === 'shipping') {
      this.initAddressAutocomplete();
    }
  }

  private renderCart(): string {
    if (!this.cart || !this.cart.items?.length) {
      return `
        <div class="maho-co-header">
          <span class="maho-co-title">Your Cart</span>
          <button class="maho-lb-close" type="button" data-close>&times;</button>
        </div>
        <div class="maho-co-body" style="text-align:center;padding:32px;">
          <p style="color:var(--maho-text-muted)">Your cart is empty.</p>
        </div>
      `;
    }

    const items = this.cart.items.map(item => `
      <div class="maho-co-item">
        ${item.thumbnailUrl ? `<img class="maho-co-item-thumb" src="${this.esc(item.thumbnailUrl)}" alt="" />` : ''}
        <div class="maho-co-item-info">
          <div class="maho-co-item-name">${this.escHtml(item.name)}</div>
          <div class="maho-co-item-meta">Qty: ${item.qty}${item.options?.length ? ' &middot; ' + item.options.map(o => this.escHtml(o.value)).join(', ') : ''}</div>
        </div>
        <div class="maho-co-item-price">${this.formatPrice(item.rowTotalInclTax || item.rowTotal)}</div>
      </div>
    `).join('');

    const p = this.cart.prices;
    return `
      <div class="maho-co-header">
        <span class="maho-co-title">Your Cart</span>
        <div class="maho-co-steps">${this.renderDots()}</div>
        <button class="maho-lb-close" type="button" data-close>&times;</button>
      </div>
      <div class="maho-co-body">
        <div class="maho-co-summary">${items}</div>
        <div class="maho-co-totals">
          <div class="maho-co-total-row"><span>Subtotal</span><span>${this.formatPrice(p.subtotalInclTax || p.subtotal)}</span></div>
          ${p.taxAmount ? `<div class="maho-co-total-row"><span>Tax</span><span>${this.formatPrice(p.taxAmount)}</span></div>` : ''}
          <div class="maho-co-total-row grand"><span>Total</span><span>${this.formatPrice(p.grandTotal)}</span></div>
        </div>
      </div>
      <div class="maho-co-actions">
        <button class="maho-co-btn" type="button" data-action="to-shipping">Checkout</button>
      </div>
    `;
  }

  private renderShipping(): string {
    const c = this.address;
    const countryOptions = this.countries.map(co =>
      `<option value="${this.esc(co.id)}" ${co.id === c.countryId ? 'selected' : ''}>${this.escHtml(co.name)}</option>`
    ).join('');

    const selectedCountry = this.countries.find(co => co.id === c.countryId);
    const hasRegions = selectedCountry?.regions && selectedCountry.regions.length > 0;
    const regionOptions = hasRegions
      ? `<option value="">Select Region</option>` + selectedCountry!.regions!.map(r =>
          `<option value="${r.id}" ${String(r.id) === c.regionId ? 'selected' : ''}>${this.escHtml(r.name)}</option>`
        ).join('')
      : '';

    return `
      <div class="maho-co-header">
        <button class="maho-co-back" type="button" data-action="to-cart">&larr;</button>
        <span class="maho-co-title">Shipping Address</span>
        <div class="maho-co-steps">${this.renderDots()}</div>
        <button class="maho-lb-close" type="button" data-close>&times;</button>
      </div>
      <div class="maho-co-body">
        <fieldset>
          <legend>Email *</legend>
          <input class="maho-co-input" type="email" data-field="email" value="${this.esc(c.email)}" placeholder="you@example.com" autocomplete="email" />
        </fieldset>
        <div class="maho-co-row">
          <fieldset>
            <legend>First Name *</legend>
            <input class="maho-co-input" type="text" data-field="firstName" value="${this.esc(c.firstName)}" autocomplete="given-name" />
          </fieldset>
          <fieldset>
            <legend>Last Name *</legend>
            <input class="maho-co-input" type="text" data-field="lastName" value="${this.esc(c.lastName)}" autocomplete="family-name" />
          </fieldset>
        </div>
        <fieldset style="position:relative">
          <legend>Street Address *</legend>
          <input class="maho-co-input" type="text" data-field="street" value="${this.esc(c.street)}" placeholder="Street address" autocomplete="off" />
          <div data-street-suggestions style="display:none;position:absolute;top:100%;left:0;right:0;z-index:10;background:var(--maho-bg);border:1px solid var(--maho-border);border-top:none;border-radius:0 0 6px 6px;max-height:200px;overflow-y:auto;"></div>
        </fieldset>
        <fieldset>
          <input class="maho-co-input" type="text" data-field="street2" value="${this.esc(c.street2)}" placeholder="Apt, suite, etc. (optional)" autocomplete="address-line2" />
        </fieldset>
        <div class="maho-co-row">
          <fieldset>
            <legend>City *</legend>
            <input class="maho-co-input" type="text" data-field="city" value="${this.esc(c.city)}" />
          </fieldset>
          <fieldset>
            <legend>Postcode *</legend>
            <input class="maho-co-input" type="text" data-field="postcode" value="${this.esc(c.postcode)}" />
          </fieldset>
        </div>
        <div class="maho-co-row">
          <fieldset>
            <legend>Country *</legend>
            <select class="maho-co-select" data-field="countryId">
              <option value="">Select Country</option>
              ${countryOptions}
            </select>
          </fieldset>
          <fieldset>
            <legend>State / Region</legend>
            <div data-region-container>
              ${hasRegions
                ? `<select class="maho-co-select" data-field="regionId">${regionOptions}</select>`
                : `<input class="maho-co-input" type="text" data-field="region" value="${this.esc(c.region)}" placeholder="Region (optional)" />`
              }
            </div>
          </fieldset>
        </div>
        <fieldset>
          <legend>Phone *</legend>
          <input class="maho-co-input" type="tel" data-field="telephone" value="${this.esc(c.telephone)}" />
        </fieldset>
        <div class="maho-co-error" data-error></div>
      </div>
      <div class="maho-co-actions">
        <button class="maho-co-btn" type="button" data-action="to-delivery">Continue to Shipping Method</button>
      </div>
    `;
  }

  private renderDelivery(): string {
    const methodsHtml = this.shippingMethods.length === 0
      ? '<p style="color:var(--maho-text-muted);font-size:14px;">Loading shipping methods...</p>'
      : this.shippingMethods.map((m, i) => {
          const label = m.carrierTitle && m.carrierTitle !== m.title
            ? `${m.carrierTitle} – ${m.title}` : (m.carrierTitle || m.title);
          const isSelected = this.selectedShipping === m.code || (!this.selectedShipping && i === 0);
          return `
            <label class="maho-co-method ${isSelected ? 'selected' : ''}" data-method="${this.esc(m.code)}">
              <input type="radio" name="shipping" value="${this.esc(m.code)}" ${isSelected ? 'checked' : ''} />
              <div class="maho-co-method-info">
                <div class="maho-co-method-title">${this.escHtml(label)}</div>
              </div>
              <div class="maho-co-method-price">${this.formatPrice(m.price)}</div>
            </label>
          `;
        }).join('');

    return `
      <div class="maho-co-header">
        <button class="maho-co-back" type="button" data-action="to-shipping">&larr;</button>
        <span class="maho-co-title">Shipping Method</span>
        <div class="maho-co-steps">${this.renderDots()}</div>
        <button class="maho-lb-close" type="button" data-close>&times;</button>
      </div>
      <div class="maho-co-body">
        <div class="maho-co-methods" data-methods>${methodsHtml}</div>
        <div class="maho-co-error" data-error></div>
      </div>
      <div class="maho-co-actions">
        <button class="maho-co-btn" type="button" data-action="to-payment" ${this.shippingMethods.length === 0 ? 'disabled' : ''}>Continue to Payment</button>
      </div>
    `;
  }

  private renderPayment(): string {
    // Show order summary + card input
    const p = this.cart?.prices;
    const shipping = this.shippingMethods.find(m => m.code === this.selectedShipping);

    return `
      <div class="maho-co-header">
        <button class="maho-co-back" type="button" data-action="to-delivery">&larr;</button>
        <span class="maho-co-title">Payment</span>
        <div class="maho-co-steps">${this.renderDots()}</div>
        <button class="maho-lb-close" type="button" data-close>&times;</button>
      </div>
      <div class="maho-co-body">
        <div class="maho-co-totals" style="margin-bottom:16px;">
          <div class="maho-co-total-row"><span>Subtotal</span><span>${this.formatPrice(p?.subtotalInclTax || p?.subtotal)}</span></div>
          ${shipping ? `<div class="maho-co-total-row"><span>Shipping</span><span>${this.formatPrice(shipping.price)}</span></div>` : ''}
          ${p?.taxAmount ? `<div class="maho-co-total-row"><span>Tax</span><span>${this.formatPrice(p.taxAmount)}</span></div>` : ''}
          <div class="maho-co-total-row grand"><span>Total</span><span>${this.formatPrice(p?.grandTotal)}</span></div>
        </div>

        <div class="maho-co-label">Card Details</div>
        <div class="maho-co-stripe-card" data-stripe-card>
          <p style="font-size:13px;color:var(--maho-text-muted)">Loading payment...</p>
        </div>
        <div class="maho-co-error" data-error></div>
      </div>
      <div class="maho-co-actions">
        <button class="maho-co-btn" type="button" data-action="place-order" disabled>
          Pay ${this.formatPrice(p?.grandTotal)}
        </button>
      </div>
    `;
  }

  private renderConfirm(): string {
    return `
      <div class="maho-co-header">
        <span class="maho-co-title"></span>
        <button class="maho-lb-close" type="button" data-close>&times;</button>
      </div>
      <div class="maho-co-confirm">
        <div class="maho-co-confirm-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3>Order Confirmed!</h3>
        <p>Thank you for your purchase.<br>
        Your order number is <span class="order-id">#${this.escHtml(this.orderResult?.incrementId ?? '')}</span>.</p>
        <p style="margin-top:12px;">A confirmation email has been sent to<br><strong>${this.escHtml(this.address.email)}</strong></p>
      </div>
      <div class="maho-co-actions">
        <button class="maho-co-btn" type="button" data-close>Done</button>
      </div>
    `;
  }

  // ---- Event binding ----

  private bindCommon() {
    // Close button
    this.container.querySelectorAll('[data-close]').forEach(el =>
      el.addEventListener('click', () => this.onClose())
    );
    // Overlay click
    this.container.querySelector('.maho-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('maho-overlay')) this.onClose();
    });

    // Form field binding
    this.container.querySelectorAll('[data-field]').forEach(el => {
      const field = (el as HTMLElement).dataset.field as keyof typeof this.address;
      el.addEventListener('input', () => {
        (this.address as any)[field] = (el as HTMLInputElement).value;
      });
      el.addEventListener('change', () => {
        (this.address as any)[field] = (el as HTMLInputElement).value;
        // Update region field on country change without full re-render
        if (field === 'countryId') {
          this.address.regionId = '';
          this.address.region = '';
          this.updateRegionField();
        }
      });
    });

    // Shipping method selection
    this.container.querySelectorAll('[data-method]').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedShipping = (el as HTMLElement).dataset.method!;
        this.container.querySelectorAll('.maho-co-method').forEach(m => m.classList.remove('selected'));
        el.classList.add('selected');
        (el.querySelector('input') as HTMLInputElement).checked = true;
      });
    });

    // Action buttons
    this.container.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', () => {
        const action = (el as HTMLElement).dataset.action!;
        this.handleAction(action, el as HTMLButtonElement);
      });
    });
  }

  private async handleAction(action: string, btn: HTMLButtonElement) {
    const errorEl = this.container.querySelector('[data-error]') as HTMLElement | null;
    const showError = (msg: string) => {
      if (errorEl) { errorEl.textContent = msg; errorEl.classList.add('visible'); }
    };
    const clearError = () => {
      if (errorEl) errorEl.classList.remove('visible');
    };

    switch (action) {
      case 'to-cart':
        this.step = 'cart';
        await this.loadCart();
        this.render();
        break;

      case 'to-shipping':
        this.step = 'shipping';
        this.render();
        break;

      case 'to-delivery':
        clearError();
        // Validate address
        if (!this.address.email || !this.address.firstName || !this.address.lastName ||
            !this.address.street || !this.address.city || !this.address.postcode ||
            !this.address.countryId || !this.address.telephone) {
          showError('Please fill in all required fields.');
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Loading...';
        try {
          const addr = this.buildAddress();
          const cartId = this.cartManager.getCartId()!;
          this.shippingMethods = await this.api.getShippingMethods(cartId, addr);
          if (this.shippingMethods.length > 0 && !this.selectedShipping) {
            this.selectedShipping = this.shippingMethods[0].code;
          }
          this.step = 'delivery';
          this.render();
        } catch (err: any) {
          btn.disabled = false;
          btn.textContent = 'Continue to Shipping Method';
          showError(err.message || 'Failed to load shipping methods');
        }
        break;

      case 'to-payment':
        clearError();
        if (!this.selectedShipping && this.shippingMethods.length > 0) {
          this.selectedShipping = this.shippingMethods[0].code;
        }
        if (!this.selectedShipping) {
          showError('Please select a shipping method.');
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Loading...';
        try {
          // Refresh cart totals (they update after shipping is set)
          await this.loadCart();
          // Load payment methods
          const cartId = this.cartManager.getCartId()!;
          this.paymentMethods = await this.api.getPaymentMethods(cartId);
          // Default to stripe_card if available, otherwise first method
          const stripeMethod = this.paymentMethods.find(m => m.code === 'stripe_card');
          this.selectedPayment = stripeMethod ? 'stripe_card' : (this.paymentMethods[0]?.code ?? '');
          this.step = 'payment';
          this.render();
        } catch (err: any) {
          btn.disabled = false;
          btn.textContent = 'Continue to Payment';
          showError(err.message || 'Failed to load payment methods');
        }
        break;

      case 'place-order':
        clearError();
        btn.disabled = true;
        btn.textContent = 'Processing...';
        try {
          await this.placeOrder();
        } catch (err: any) {
          btn.disabled = false;
          btn.textContent = `Pay ${this.formatPrice(this.cart?.prices?.grandTotal)}`;
          showError(err.message || 'Failed to place order');
        }
        break;
    }
  }

  private _placesSessionToken: string = '';
  private _streetTimer: any = null;

  private initAddressAutocomplete() {
    if (!this.googleMapsKey) return;
    const streetInput = this.container.querySelector('[data-field="street"]') as HTMLInputElement;
    const suggestionsDiv = this.container.querySelector('[data-street-suggestions]') as HTMLElement;
    if (!streetInput || !suggestionsDiv) return;

    this._placesSessionToken = crypto.randomUUID();

    streetInput.addEventListener('input', () => {
      clearTimeout(this._streetTimer);
      const q = streetInput.value.trim();
      if (q.length > 4) {
        streetInput.setAttribute('autocomplete', 'off');
        this._streetTimer = setTimeout(() => this.fetchStreetSuggestions(q, suggestionsDiv), 250);
      } else {
        streetInput.setAttribute('autocomplete', 'address-line1');
        suggestionsDiv.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (!suggestionsDiv.contains(e.target as Node) && e.target !== streetInput) {
        suggestionsDiv.style.display = 'none';
      }
    });
  }

  private async fetchStreetSuggestions(query: string, suggestionsDiv: HTMLElement) {
    try {
      const biasCountry = this.detectedCountry || this.address.countryId || '';
      const body: any = {
        input: query,
        sessionToken: this._placesSessionToken,
        includedPrimaryTypes: ['street_address', 'subpremise', 'premise'],
      };
      if (biasCountry) body.includedRegionCodes = [biasCountry.toUpperCase()];

      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': this.googleMapsKey },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const data = await res.json();
      const suggestions = data.suggestions || [];
      if (!suggestions.length) { suggestionsDiv.style.display = 'none'; return; }

      suggestionsDiv.innerHTML = suggestions.map((s: any, i: number) => `
        <div data-suggestion-idx="${i}" style="padding:10px 12px;cursor:pointer;font-size:13px;color:var(--maho-text);border-bottom:1px solid var(--maho-border);transition:background 0.15s;"
          onmouseover="this.style.background='rgba(0,0,0,0.05)'" onmouseout="this.style.background='transparent'">
          ${this.escHtml(s.placePrediction?.text?.text || '')}
        </div>
      `).join('');
      suggestionsDiv.style.display = 'block';

      suggestionsDiv.querySelectorAll('[data-suggestion-idx]').forEach(el => {
        el.addEventListener('click', async () => {
          const idx = parseInt((el as HTMLElement).dataset.suggestionIdx!, 10);
          suggestionsDiv.style.display = 'none';
          const suggestion = suggestions[idx];
          const placeId = suggestion?.placePrediction?.placeId;
          if (!placeId) return;
          try {
            const detailRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=addressComponents,formattedAddress&sessionToken=${this._placesSessionToken}`, {
              headers: { 'X-Goog-Api-Key': this.googleMapsKey },
            });
            if (!detailRes.ok) return;
            const place = await detailRes.json();
            if (place.addressComponents) this.applyGooglePlace(place.addressComponents);
            this._placesSessionToken = crypto.randomUUID();
          } catch {}
        });
      });
    } catch {}
  }

  private applyGooglePlace(components: any[]) {
    const get = (type: string) => components.find((c: any) => c.types.includes(type));
    const streetNumber = get('street_number')?.longText || '';
    const route = get('route')?.longText || '';
    const subpremise = get('subpremise')?.longText || '';
    const city = get('locality')?.longText || get('sublocality_level_1')?.longText || get('postal_town')?.longText || '';
    const state = get('administrative_area_level_1')?.longText || '';
    const stateShort = get('administrative_area_level_1')?.shortText || '';
    const postcode = get('postal_code')?.longText || '';
    const countryCode = get('country')?.shortText || '';

    this.address.street = [streetNumber, route].filter(Boolean).join(' ');
    this.address.city = city;
    this.address.postcode = postcode;

    if (countryCode) {
      this.address.countryId = countryCode;
      const country = this.countries.find(c => c.id === countryCode);
      if (country?.regions?.length) {
        const region = country.regions.find(reg =>
          reg.name.toLowerCase() === state.toLowerCase() ||
          reg.code.toLowerCase() === stateShort.toLowerCase()
        );
        if (region) {
          this.address.regionId = String(region.id);
          this.address.region = '';
        }
      }
    }

    // Update form fields without full re-render
    const fields: Record<string, string> = {
      street: this.address.street,
      city: this.address.city,
      postcode: this.address.postcode,
      countryId: this.address.countryId,
    };
    for (const [key, val] of Object.entries(fields)) {
      const el = this.container.querySelector(`[data-field="${key}"]`) as HTMLInputElement | HTMLSelectElement;
      if (el) el.value = val;
    }

    // Update street2 (clear if no subpremise)
    const street2 = this.container.querySelector('[data-field="street2"]') as HTMLInputElement;
    if (street2) street2.value = subpremise;

    // Update region
    this.updateRegionField();
    if (this.address.regionId) {
      const regionSel = this.container.querySelector('[data-field="regionId"]') as HTMLSelectElement;
      if (regionSel) regionSel.value = this.address.regionId;
    } else if (this.address.region) {
      const regionInput = this.container.querySelector('[data-field="region"]') as HTMLInputElement;
      if (regionInput) regionInput.value = this.address.region;
    }
  }

  private updateRegionField() {
    const regionContainer = this.container.querySelector('[data-region-container]') as HTMLElement;
    if (!regionContainer) return;
    const selectedCountry = this.countries.find(co => co.id === this.address.countryId);
    const hasRegions = selectedCountry?.regions && selectedCountry.regions.length > 0;
    if (hasRegions) {
      const options = `<option value="">Select Region</option>` + selectedCountry!.regions!.map(r =>
        `<option value="${r.id}">${this.escHtml(r.name)}</option>`
      ).join('');
      regionContainer.innerHTML = `<select class="maho-co-select" data-field="regionId">${options}</select>`;
      const select = regionContainer.querySelector('select')!;
      select.addEventListener('change', () => { this.address.regionId = select.value; });
    } else {
      regionContainer.innerHTML = `<input class="maho-co-input" type="text" data-field="region" value="" placeholder="Region (optional)" />`;
      const input = regionContainer.querySelector('input')!;
      input.addEventListener('input', () => { this.address.region = input.value; });
    }
  }

  private buildAddress(): any {
    const a = this.address;
    return {
      firstName: a.firstName,
      lastName: a.lastName,
      street: a.street2 ? [a.street, a.street2] : [a.street],
      city: a.city,
      postcode: a.postcode,
      countryId: a.countryId,
      regionId: a.regionId || '',
      region: a.region || '',
      telephone: a.telephone,
    };
  }

  // ---- Stripe ----

  private async mountStripe() {
    const container = this.container.querySelector('[data-stripe-card]') as HTMLElement;
    if (!container) return;

    try {
      // Load Stripe.js if needed
      if (!(window as any).Stripe) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = STRIPE_JS_URL;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Stripe'));
          document.head.appendChild(script);
        });
      }

      // Get publishable key (pre-loaded from /embed/products response)
      const publishableKey = this.api.stripePublishableKey;
      if (!publishableKey) {
        // Fallback: try fetching from API
        const config = await this.api.getStripeConfig();
        if (!config?.publishableKey) {
          container.innerHTML = '<p style="font-size:13px;color:var(--maho-error)">Payment not configured.</p>';
          return;
        }
        this.api.stripePublishableKey = config.publishableKey;
      }

      this.stripe = (window as any).Stripe(this.api.stripePublishableKey);
      this.stripeElements = this.stripe.elements();
      this.cardElement = this.stripeElements.create('card', {
        style: {
          base: {
            fontSize: '15px',
            color: '#1f2937',
            '::placeholder': { color: '#9ca3af' },
          },
        },
      });

      container.innerHTML = '';
      this.cardElement.mount(container);

      this.cardElement.on('change', (event: any) => {
        this.cardComplete = event.complete;
        const placeBtn = this.container.querySelector('[data-action="place-order"]') as HTMLButtonElement;
        if (placeBtn) placeBtn.disabled = !event.complete;
        if (event.error) {
          const errorEl = this.container.querySelector('[data-error]') as HTMLElement;
          if (errorEl) { errorEl.textContent = event.error.message; errorEl.classList.add('visible'); }
        }
      });
    } catch (err: any) {
      container.innerHTML = `<p style="font-size:13px;color:var(--maho-error)">${this.escHtml(err.message || 'Payment error')}</p>`;
    }
  }

  private async placeOrder() {
    const cartId = this.cartManager.getCartId()!;
    let paymentData: any = null;

    // Stripe card payment flow
    if (this.selectedPayment === 'stripe_card' && this.stripe && this.cardElement) {
      if (!this.cardComplete) throw new Error('Please complete your card details.');

      // Create PaymentIntent
      const pi = await this.api.createPaymentIntent(cartId);

      // Confirm card payment (handles 3DS)
      const result = await this.stripe.confirmCardPayment(pi.clientSecret, {
        payment_method: { card: this.cardElement },
      });

      if (result.error) throw new Error(result.error.message || 'Payment failed.');

      paymentData = { stripe_payment_intent_id: result.paymentIntent.id };
    }

    // Place the order
    const order = await this.api.placeOrder(cartId, {
      email: this.address.email,
      shippingAddress: this.buildAddress(),
      billingAddress: this.buildAddress(),
      shippingMethod: this.selectedShipping,
      paymentMethod: this.selectedPayment,
      paymentData,
      storefrontOrigin: this.storeOrigin,
    });

    // Handle redirect-based payments
    if (order.redirectUrl) {
      window.open(order.redirectUrl, '_blank');
      return;
    }

    // Success — show confirmation
    this.orderResult = { incrementId: order.incrementId };
    this.cartManager.clearCart();
    this.step = 'confirm';
    this.render();
  }

  private onClose() {
    // Clean up Stripe elements (they can't survive being hidden)
    if (this.cardElement) {
      try { this.cardElement.destroy(); } catch {}
      this.cardElement = null;
    }
    this.stripeElements = null;

    if (this.step === 'confirm') {
      // After order confirmation, fully destroy the checkout
      this.container.innerHTML = '';
      this.step = 'cart';
      this.cart = null;
      this.orderResult = null;
    }

    // Hide overlay (lightbox handles display:none)
    this.container.style.display = 'none';
    document.body.style.overflow = '';
  }
}
