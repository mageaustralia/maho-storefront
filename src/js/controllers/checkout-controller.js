/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';
import { analytics } from '../analytics.js';
import { hydrateTemplate, setSlotHtml, setSlotAttributes, showSlot, PLACEHOLDER_IMAGE } from '../template-helpers.js';
import { getAdapter, hasAdapter, getAbsorbedMethods } from '../payment-methods/index.js';

export default class CheckoutController extends Controller {
  static targets = [
    'guestLogin', 'loginForm', 'loginEmail', 'loginPassword', 'loginBtn', 'loginError',
    'email', 'firstName', 'lastName', 'company', 'street', 'street2', 'city', 'postcode', 'country', 'region', 'regionText', 'telephone',
    'addressSelector', 'addressSelect', 'addressSummary', 'summaryContent', 'addressForm',
    'step1', 'step2', 'step3', 'body1', 'body2', 'body3', 'check1', 'check2', 'check3',
    'shippingMethods', 'shippingError', 'continuePaymentBtn',
    'paymentMethods', 'placeOrderBtn', 'orderError', 'paymentFields',
    'sidebarLoading', 'sidebarItems', 'sidebarTotals',
    'sidebarSubtotal', 'sidebarDiscount', 'sidebarDiscountRow',
    'sidebarShipping', 'sidebarShippingRow', 'sidebarTax',
    'sidebarGiftcard', 'sidebarGiftcardRow', 'sidebarTotal',
    'promoTabs', 'couponTab', 'couponForm', 'couponApplied', 'couponInput', 'couponBadge',
    'giftcardTab', 'giftcardInput', 'giftcardsApplied',
    'gatewayError', 'gatewayErrorText',
    'streetSuggestions',
  ];
  static values = {
    countries: String,
    currency: { type: String, default: 'USD' },
    country: { type: String, default: 'US' },
    googleMapsKey: { type: String, default: '' },
    detectedCountry: { type: String, default: '' },
  };

  connect() {
    this._debounceTimer = null;
    this._addressKey = '';
    this._selectedShipping = null;
    this._selectedPayment = null;
    this._paymentAdapter = null;
    this._countries = [];
    this._cart = null;
    this._customerAddresses = [];
    this._customerEmail = '';

    try { this._countries = JSON.parse(this.countriesValue || '[]'); } catch { this._countries = []; }

    // Cart handoff from embed widget: ?cart_id=xxx
    const params = new URLSearchParams(window.location.search);
    const handoffCartId = params.get('cart_id');
    if (handoffCartId) {
      api.setCartId(handoffCartId);
      localStorage.setItem('maho_cart_qty', '0'); // will be refreshed by loadSidebar
      history.replaceState(null, '', window.location.pathname);
    }

    // Show error from payment gateway redirect (e.g. unsupported currency)
    const errorParam = params.get('error');
    if (errorParam) {
      if (this.hasGatewayErrorTarget) {
        this.gatewayErrorTextTarget.textContent = errorParam;
        this.gatewayErrorTarget.style.display = '';
      }
      // Clean URL
      history.replaceState(null, '', window.location.pathname);
    }

    // Initialize address autocomplete
    this._initAddressSearch();

    // Load cart summary
    this.loadSidebar();

    // If logged in, pre-fill from customer profile and hide guest login
    const token = localStorage.getItem('maho_token');
    if (token) {
      if (this.hasGuestLoginTarget) this.guestLoginTarget.style.display = 'none';
      this._prefillFromCustomer();
    } else {
      // Show guest login prompt
      if (this.hasGuestLoginTarget) this.guestLoginTarget.style.display = '';
      // Default country to detected country (via Cloudflare IP geolocation)
      if (this.detectedCountryValue && this.hasCountryTarget) {
        const detected = this.detectedCountryValue.toUpperCase();
        const validCountry = Array.from(this.countryTarget.options).some(o => o.value === detected);
        if (validCountry) this.countryTarget.value = detected;
      }
      // Trigger country change to populate regions for default country
      if (this.hasCountryTarget && this.countryTarget.value) {
        this.onCountryChange();
      }
    }
  }

  // ---- Guest Login ----

  showLoginForm() {
    if (this.hasLoginFormTarget) this.loginFormTarget.style.display = '';
    if (this.hasLoginEmailTarget) this.loginEmailTarget.focus();
  }

  hideLoginForm() {
    if (this.hasLoginFormTarget) this.loginFormTarget.style.display = 'none';
    if (this.hasLoginErrorTarget) this.loginErrorTarget.style.display = 'none';
  }

  async doLogin() {
    const email = this.hasLoginEmailTarget ? this.loginEmailTarget.value.trim() : '';
    const password = this.hasLoginPasswordTarget ? this.loginPasswordTarget.value : '';

    if (!email || !password) {
      this._showLoginError('Please enter email and password.');
      return;
    }

    if (this.hasLoginBtnTarget) {
      this.loginBtnTarget.disabled = true;
      this.loginBtnTarget.textContent = 'Signing in...';
    }

    try {
      const response = await api.post('/api/auth/token', { email, password });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err['hydra:description'] || 'Invalid email or password');
      }
      const data = await response.json();

      // Store token
      localStorage.setItem('maho_token', data.token);
      if (data.customer) {
        localStorage.setItem('maho_customer', JSON.stringify({
          firstName: data.customer.firstName,
          lastName: data.customer.lastName,
          email: data.customer.email
        }));
      }

      // Hide guest login, load customer data
      if (this.hasGuestLoginTarget) this.guestLoginTarget.style.display = 'none';
      document.dispatchEvent(new CustomEvent('auth:changed'));

      // Now prefill from customer
      await this._prefillFromCustomer();

    } catch (e) {
      this._showLoginError(e.message);
    } finally {
      if (this.hasLoginBtnTarget) {
        this.loginBtnTarget.disabled = false;
        this.loginBtnTarget.textContent = 'Sign In';
      }
    }
  }

  _showLoginError(msg) {
    if (this.hasLoginErrorTarget) {
      this.loginErrorTarget.textContent = msg;
      this.loginErrorTarget.style.display = '';
    }
  }

  async _prefillFromCustomer() {
    try {
      const data = await api.get('/api/auth/me');

      // Store customer email
      this._customerEmail = data.email || '';
      if (this.hasEmailTarget && data.email) {
        this.emailTarget.value = data.email;
      }

      // Store addresses and populate selector
      this._customerAddresses = data.addresses || [];
      if (this._customerAddresses.length > 0) {
        this._populateAddressSelector();
      }

      // Find default shipping address (fall back to first address)
      const addr = data.addresses?.find(a => a.isDefaultShipping)
        || data.addresses?.find(a => a.isDefaultBilling)
        || data.addresses?.[0];

      if (addr) {
        // Select in dropdown and fill form (but show summary, not form)
        if (this.hasAddressSelectTarget) {
          this.addressSelectTarget.value = addr.id;
        }
        this._fillAddressForm(addr, false); // false = show summary, not form
      } else {
        // No saved address — fill name/email from profile
        if (this.hasFirstNameTarget && !this.firstNameTarget.value) this.firstNameTarget.value = data.firstName || '';
        if (this.hasLastNameTarget && !this.lastNameTarget.value) this.lastNameTarget.value = data.lastName || '';

        if (this.hasCountryTarget && this.countryTarget.value) {
          this.onCountryChange();
        }
      }
    } catch {
      // Not logged in or token expired — just init normally
      if (this.hasCountryTarget && this.countryTarget.value) {
        this.onCountryChange();
      }
    }
  }

  _populateAddressSelector() {
    if (!this.hasAddressSelectorTarget || !this.hasAddressSelectTarget) return;

    // Show the selector
    this.addressSelectorTarget.style.display = '';

    // Populate dropdown
    const options = this._customerAddresses.map(addr => {
      const streetLine = Array.isArray(addr.street) ? addr.street[0] : addr.street;
      const label = `${addr.firstName} ${addr.lastName}, ${streetLine}, ${addr.city}`;
      const badges = [];
      if (addr.isDefaultShipping) badges.push('Default Shipping');
      if (addr.isDefaultBilling) badges.push('Default Billing');
      const badgeText = badges.length ? ` (${badges.join(', ')})` : '';
      return `<option value="${addr.id}">${escapeHtml(label)}${badgeText}</option>`;
    });

    this.addressSelectTarget.innerHTML = '<option value="new">+ Enter a new address</option>' + options.join('');
  }

  _showAddressSummary(addr) {
    if (!this.hasAddressSummaryTarget || !this.hasSummaryContentTarget) return;

    // Build summary HTML
    const streetArr = Array.isArray(addr.street) ? addr.street : [addr.street || ''];
    const streetLines = streetArr.filter(s => s).join(', ');
    const regionName = typeof addr.region === 'object' ? addr.region?.name : addr.region;
    const countryObj = this._countries.find(c => c.id === addr.countryId);
    const countryName = countryObj?.name || addr.countryId;

    let html = `<div class="summary-name">${escapeHtml(addr.firstName)} ${escapeHtml(addr.lastName)}</div>`;
    if (addr.company) {
      html += `<div>${escapeHtml(addr.company)}</div>`;
    }
    html += `<div>${escapeHtml(streetLines)}</div>`;
    html += `<div>${escapeHtml(addr.city)}${regionName ? ', ' + escapeHtml(regionName) : ''} ${escapeHtml(addr.postcode)}</div>`;
    html += `<div>${escapeHtml(countryName)}</div>`;
    html += `<div>${escapeHtml(addr.telephone)}</div>`;

    this.summaryContentTarget.innerHTML = html;
    this.addressSummaryTarget.style.display = '';

    // Hide the form
    if (this.hasAddressFormTarget) this.addressFormTarget.style.display = 'none';
  }

  _fillAddressForm(addr, showForm = false) {
    if (this.hasFirstNameTarget) this.firstNameTarget.value = addr.firstName || '';
    if (this.hasLastNameTarget) this.lastNameTarget.value = addr.lastName || '';
    if (this.hasCompanyTarget) this.companyTarget.value = addr.company || '';

    // Handle street array
    const streetArr = Array.isArray(addr.street) ? addr.street : [addr.street || ''];
    if (this.hasStreetTarget) this.streetTarget.value = streetArr[0] || '';
    if (this.hasStreet2Target) this.street2Target.value = streetArr[1] || '';

    if (this.hasCityTarget) this.cityTarget.value = addr.city || '';
    if (this.hasPostcodeTarget) this.postcodeTarget.value = addr.postcode || '';
    if (this.hasTelephoneTarget) this.telephoneTarget.value = addr.telephone || '';

    if (this.hasCountryTarget && addr.countryId) {
      this.countryTarget.value = addr.countryId;
    }

    // Populate regions for the address country, then set region
    this.onCountryChange();

    // Set region after dropdown is populated
    setTimeout(() => {
      if (addr.regionId && this.hasRegionTarget && this.regionTarget.style.display !== 'none') {
        this.regionTarget.value = addr.regionId;
      } else if (addr.region && this.hasRegionTextTarget && this.regionTextTarget.style.display !== 'none') {
        this.regionTextTarget.value = typeof addr.region === 'object' ? addr.region.name || '' : addr.region;
      }
      // Trigger shipping method fetch with full address
      this.onAddressChange();
    }, 50);

    // Show summary instead of form (unless explicitly showing form)
    if (!showForm) {
      this._showAddressSummary(addr);
    } else {
      if (this.hasAddressFormTarget) this.addressFormTarget.style.display = '';
      if (this.hasAddressSummaryTarget) this.addressSummaryTarget.style.display = 'none';
    }
  }

  onAddressSelect() {
    const selectedId = this.hasAddressSelectTarget ? this.addressSelectTarget.value : '';

    if (selectedId === 'new') {
      // Clear form and show it for new entry
      this._clearAddressFields();
      if (this.hasAddressFormTarget) this.addressFormTarget.style.display = '';
      if (this.hasAddressSummaryTarget) this.addressSummaryTarget.style.display = 'none';
      // Re-fill email from stored customer
      if (this.hasEmailTarget && this._customerEmail) {
        this.emailTarget.value = this._customerEmail;
      }
      // Reset shipping methods since address changed
      this._addressKey = '';
      if (this.hasShippingMethodsTarget) {
        this.shippingMethodsTarget.innerHTML = '<p class="text-muted">Enter your address to see shipping options.</p>';
      }
      return;
    }

    const addr = this._customerAddresses.find(a => String(a.id) === selectedId);
    if (addr) {
      this._fillAddressForm(addr, false); // false = show summary, not form
    }
  }

  _clearAddressFields() {
    ['firstName', 'lastName', 'company', 'street', 'street2', 'city', 'postcode', 'telephone'].forEach(f => {
      const target = `${f}Target`;
      const hasTarget = `has${f.charAt(0).toUpperCase() + f.slice(1)}Target`;
      if (this[hasTarget]) this[target].value = '';
    });
  }

  editAddress() {
    // Show the form for editing
    if (this.hasAddressFormTarget) this.addressFormTarget.style.display = '';
    if (this.hasAddressSummaryTarget) this.addressSummaryTarget.style.display = 'none';
  }

  // ---- Address Step ----

  onCountryChange() {
    const countryId = this.countryTarget.value;
    const country = this._countries.find(c => c.id === countryId);

    if (country && country.availableRegions && country.availableRegions.length > 0) {
      // Show select, hide text input
      if (this.hasRegionTarget) {
        this.regionTarget.innerHTML = '<option value="">Select Region</option>' +
          country.availableRegions.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
        this.regionTarget.style.display = '';
      }
      if (this.hasRegionTextTarget) this.regionTextTarget.style.display = 'none';
    } else {
      // Hide select, show text input
      if (this.hasRegionTarget) this.regionTarget.style.display = 'none';
      if (this.hasRegionTextTarget) this.regionTextTarget.style.display = '';
    }

    this.onAddressChange();
  }

  onAddressChange() {
    // Debounce shipping method fetching
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._fetchShippingMethods(), 500);
  }

  _getAddress() {
    const street1 = this.hasStreetTarget ? this.streetTarget.value.trim() : '';
    const street2 = this.hasStreet2Target ? this.street2Target.value.trim() : '';
    const streetArr = street2 ? [street1, street2] : [street1];

    return {
      firstName: this.hasFirstNameTarget ? this.firstNameTarget.value.trim() : '',
      lastName: this.hasLastNameTarget ? this.lastNameTarget.value.trim() : '',
      company: this.hasCompanyTarget ? this.companyTarget.value.trim() : '',
      street: streetArr,
      city: this.hasCityTarget ? this.cityTarget.value.trim() : '',
      postcode: this.hasPostcodeTarget ? this.postcodeTarget.value.trim() : '',
      countryId: this.hasCountryTarget ? this.countryTarget.value : '',
      regionId: (this.hasRegionTarget && this.regionTarget.style.display !== 'none') ? this.regionTarget.value : '',
      region: (this.hasRegionTextTarget && this.regionTextTarget.style.display !== 'none') ? this.regionTextTarget.value.trim() : '',
      telephone: this.hasTelephoneTarget ? this.telephoneTarget.value.trim() : '',
    };
  }

  _isAddressComplete(addr) {
    const hasStreet = Array.isArray(addr.street) ? addr.street[0] : addr.street;
    return addr.firstName && addr.lastName && hasStreet && addr.city && addr.postcode && addr.countryId && addr.telephone;
  }

  async _fetchShippingMethods() {
    const addr = this._getAddress();
    const streetLine = Array.isArray(addr.street) ? addr.street[0] : addr.street;
    // Need at least country, city, and postcode for shipping estimate
    if (!addr.countryId || !addr.city || !addr.postcode || !streetLine) return;

    const key = `${addr.countryId}|${addr.city}|${addr.postcode}|${addr.regionId || addr.region}|${streetLine}`;
    if (key === this._addressKey) return;
    this._addressKey = key;

    const maskedId = api.cartId();
    if (!maskedId) return;

    if (this.hasShippingMethodsTarget) {
      this.shippingMethodsTarget.innerHTML = '<p class="methods-loading">Loading shipping methods...</p>';
    }
    if (this.hasShippingErrorTarget) this.shippingErrorTarget.style.display = 'none';

    try {
      const response = await api.post(`/api/guest-carts/${maskedId}/shipping-methods`, { address: addr });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err['hydra:description'] || err.detail || err.message || 'Could not load shipping methods');
      }
      const methods = await response.json();

      if (!methods || methods.length === 0) {
        if (this.hasShippingMethodsTarget) {
          this.shippingMethodsTarget.innerHTML = '<p>No shipping methods available for this address.</p>';
        }
        return;
      }

      if (this.hasShippingMethodsTarget) {
        this.shippingMethodsTarget.innerHTML = '';
        methods.forEach((m, i) => {
          const label = m.carrierTitle && m.carrierTitle !== m.title
            ? `${m.carrierTitle} – ${m.title}`
            : (m.carrierTitle || m.title);
          const el = hydrateTemplate('tpl-shipping-method', {
            title: label,
            price: formatPrice(m.price, this.currencyValue),
          });
          setSlotAttributes(el, {
            'radio': {
              value: m.code,
              'data-carrier': m.carrierCode,
              'data-method': m.methodCode,
              'data-price': String(m.price),
            },
          });
          if (i === 0) el.querySelector('[data-slot="radio"]').checked = true;
          this.shippingMethodsTarget.appendChild(el);
        });

        // Auto-select first method and update sidebar
        this._selectedShipping = methods[0].code;
        this._selectedShippingPrice = methods[0].price || 0;
        this._updateSidebarShipping(this._selectedShippingPrice);
        if (this.hasContinuePaymentBtnTarget) this.continuePaymentBtnTarget.disabled = false;
      }
    } catch (e) {
      if (this.hasShippingErrorTarget) {
        this.shippingErrorTarget.textContent = e.message;
        this.shippingErrorTarget.style.display = '';
      }
      if (this.hasShippingMethodsTarget) this.shippingMethodsTarget.innerHTML = '';
    }
  }

  selectShipping(event) {
    this._selectedShipping = event.target.value;
    this._selectedShippingPrice = parseFloat(event.target.dataset.price) || 0;
    this._updateSidebarShipping(this._selectedShippingPrice);
    if (this.hasContinuePaymentBtnTarget) this.continuePaymentBtnTarget.disabled = false;
  }

  _updateSidebarShipping(amount) {
    if (this.hasSidebarShippingRowTarget) {
      this.sidebarShippingRowTarget.style.display = '';
      if (this.hasSidebarShippingTarget) this.sidebarShippingTarget.textContent = formatPrice(amount, this.currencyValue);
    }
    // Recalculate grand total: subtotal - discount + shipping - giftcard + tax
    this._recalcTotal();
  }

  _recalcTotal() {
    if (!this._cart) return;
    const prices = this._cart.prices || {};
    const subtotal = prices.subtotal || 0;
    const discount = prices.discountAmount || 0;
    const shipping = this._selectedShippingPrice || 0;
    const tax = prices.taxAmount || 0;
    const gcAmount = prices.giftcardAmount || (this._cart.appliedGiftcards?.reduce((s, gc) => s + gc.appliedAmount, 0) || 0);
    const total = subtotal - discount + shipping + tax - gcAmount;
    if (this.hasSidebarTotalTarget) this.sidebarTotalTarget.textContent = formatPrice(Math.max(0, total), this.currencyValue);
  }

  // ---- Step Navigation ----

  continueToShipping(event) {
    event.preventDefault();
    const addr = this._getAddress();
    const email = this.hasEmailTarget ? this.emailTarget.value.trim() : '';

    if (!email || !this._isAddressComplete(addr)) {
      // Highlight empty required fields
      const fields = ['email', 'firstName', 'lastName', 'street', 'city', 'postcode', 'telephone'];
      fields.forEach(f => {
        const target = this[`has${f.charAt(0).toUpperCase() + f.slice(1)}Target`] ? this[`${f}Target`] : null;
        if (target && !target.value.trim()) target.classList.add('input-error');
        else if (target) target.classList.remove('input-error');
      });
      if (!this.countryTarget.value) this.countryTarget.classList.add('input-error');
      return;
    }

    // Mark step 1 complete, open step 2
    this._openStep(2);

    // Fetch shipping methods if not already loaded
    if (!this._selectedShipping) this._fetchShippingMethods();
  }

  continueToPayment(event) {
    event.preventDefault();
    if (!this._selectedShipping) return;

    // Analytics: track shipping info
    if (this._cart?.items?.length) {
      analytics.addShippingInfo(this._cart.items, this._cart.prices?.grandTotal || 0, this._selectedShipping, this.currencyValue);
    }

    this._openStep(3);
    this._fetchPaymentMethods();
  }

  async _fetchPaymentMethods() {
    const maskedId = api.cartId();
    if (!maskedId) return;

    if (this.hasPaymentMethodsTarget) {
      this.paymentMethodsTarget.innerHTML = '<p class="methods-loading">Loading payment methods...</p>';
    }

    try {
      const methods = await api.get(`/api/guest-carts/${maskedId}/payment-methods`);

      if (!methods || methods.length === 0) {
        if (this.hasPaymentMethodsTarget) {
          this.paymentMethodsTarget.innerHTML = '<p>No payment methods available.</p>';
        }
        return;
      }

      // Filter out methods absorbed by adapters (e.g. Google Pay / Apple Pay
      // are handled inline by the Stripe card adapter's Payment Request Button)
      const absorbed = getAbsorbedMethods();
      const visibleMethods = methods.filter(m => !absorbed.has(m.code));

      if (this.hasPaymentMethodsTarget) {
        this.paymentMethodsTarget.innerHTML = '';
        visibleMethods.forEach((m, i) => {
          const el = hydrateTemplate('tpl-payment-method', {
            title: m.title,
          });
          setSlotAttributes(el, { 'radio': { value: m.code } });
          if (i === 0) el.querySelector('[data-slot="radio"]').checked = true;
          if (m.description) {
            const descSlot = el.querySelector('[data-slot="description"]');
            if (descSlot) {
              descSlot.textContent = m.description;
              descSlot.classList.remove('hidden');
            }
          }
          this.paymentMethodsTarget.appendChild(el);
        });

        // Auto-select first
        this._selectedPayment = visibleMethods[0].code;
        if (this.hasPlaceOrderBtnTarget) this.placeOrderBtnTarget.disabled = false;
        this._activatePaymentAdapter(this._selectedPayment);
      }
    } catch {
      if (this.hasPaymentMethodsTarget) {
        this.paymentMethodsTarget.innerHTML = '<p>Could not load payment methods.</p>';
      }
    }
  }

  selectPayment(event) {
    this._selectedPayment = event.target.value;
    if (this.hasPlaceOrderBtnTarget) this.placeOrderBtnTarget.disabled = false;
    this._activatePaymentAdapter(this._selectedPayment);

    // Analytics: track payment info
    if (this._cart?.items?.length) {
      analytics.addPaymentInfo(this._cart.items, this._cart.prices?.grandTotal || 0, this._selectedPayment, this.currencyValue);
    }
  }

  /**
   * Activate the payment adapter for the selected method.
   * Adapters live in src/js/payment-methods/ and are auto-discovered via the registry.
   * The checkout controller has zero gateway-specific code.
   */
  _activatePaymentAdapter(methodCode) {
    // Tear down previous adapter
    if (this._paymentAdapter) {
      this._paymentAdapter.destroy();
      this._paymentAdapter = null;
    }

    // Hide all inline fields containers
    if (this.hasPaymentMethodsTarget) {
      this.paymentMethodsTarget.querySelectorAll('[data-slot="fields"]').forEach(f => {
        f.style.display = 'none';
        f.innerHTML = '';
      });
    }

    // Also hide the legacy standalone container
    const legacyContainer = this.hasPaymentFieldsTarget ? this.paymentFieldsTarget : null;
    if (legacyContainer) legacyContainer.style.display = 'none';

    const adapter = getAdapter(methodCode);
    if (!adapter) return;

    // Find the inline fields container for the selected method
    const radio = this.hasPaymentMethodsTarget
      ? this.paymentMethodsTarget.querySelector(`input[value="${methodCode}"]`)
      : null;
    const wrapper = radio?.closest('[data-slot="wrapper"]');
    const container = wrapper?.querySelector('[data-slot="fields"]') || legacyContainer;

    if (container) {
      this._paymentAdapter = adapter;
      container.style.display = '';
      adapter.init(container, { currency: this.currencyValue, country: this.countryValue, api, formatPrice });
    }
  }

  toggleStep(event) {
    const step = parseInt(event.currentTarget.dataset.step, 10);
    // Only allow opening completed or current steps
    this._openStep(step);
  }

  _openStep(activeStep) {
    [1, 2, 3].forEach(n => {
      const stepEl = this[`hasStep${n}Target`] ? this[`step${n}Target`] : null;
      const bodyEl = this[`hasBody${n}Target`] ? this[`body${n}Target`] : null;
      const checkEl = this[`hasCheck${n}Target`] ? this[`check${n}Target`] : null;

      if (!stepEl) return;

      if (n === activeStep) {
        stepEl.classList.remove('collapsed');
        stepEl.classList.add('active');
        if (bodyEl) bodyEl.style.display = '';
      } else if (n < activeStep) {
        stepEl.classList.remove('active');
        stepEl.classList.add('collapsed');
        if (bodyEl) bodyEl.style.display = 'none';
        if (checkEl) checkEl.style.display = '';
      } else {
        stepEl.classList.remove('active');
        stepEl.classList.add('collapsed');
        if (bodyEl) bodyEl.style.display = 'none';
        if (checkEl) checkEl.style.display = 'none';
      }
    });
  }

  // ---- Place Order ----

  async placeOrder(event) {
    event.preventDefault();
    if (!this._selectedShipping || !this._selectedPayment) return;

    const btn = this.hasPlaceOrderBtnTarget ? this.placeOrderBtnTarget : event.currentTarget;
    const originalText = btn.textContent;
    btn.textContent = 'Placing Order...';
    btn.disabled = true;

    if (this.hasOrderErrorTarget) this.orderErrorTarget.style.display = 'none';

    const maskedId = api.cartId();
    if (!maskedId) {
      btn.textContent = originalText;
      btn.disabled = false;
      return;
    }

    const addr = this._getAddress();
    const email = this.hasEmailTarget ? this.emailTarget.value.trim() : '';

    try {
      // Let the payment adapter tokenize (get nonce, etc.) before submitting
      const paymentData = this._paymentAdapter
        ? await this._paymentAdapter.tokenize()
        : null;

      const response = await api.post(`/api/guest-carts/${maskedId}/place-order`, {
        email,
        shippingAddress: addr,
        billingAddress: addr,
        shippingMethod: this._selectedShipping,
        paymentMethod: this._selectedPayment,
        paymentData,
        storefrontOrigin: window.location.origin,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err['hydra:description'] || err.detail || err.message || 'Failed to place order');
      }

      const order = await response.json();

      // Redirect-based payment methods (PayPal, Stripe hosted checkout, etc.)
      if (order.redirectUrl) {
        // Store cart ID + order token so we can restore cart if payment fails
        // and verify the order when customer returns from payment gateway
        sessionStorage.setItem('maho_pending_order', JSON.stringify({
          incrementId: order.incrementId,
          orderToken: order.orderToken,
          cartId: localStorage.getItem('maho_cart_id'),
          email,
        }));
        // Don't clear cart yet — only clear after successful payment return
        window.location.href = order.redirectUrl;
        return;
      }

      // Direct checkout (no redirect) — clear cart now
      localStorage.removeItem('maho_cart_id');
      localStorage.removeItem('maho_cart_qty');
      updateCartBadge();

      // Navigate to success page with token verification
      window.Turbo?.visit(`/order/success?order=${encodeURIComponent(order.incrementId)}&token=${encodeURIComponent(order.orderToken)}`);
    } catch (e) {
      if (this.hasOrderErrorTarget) {
        this.orderErrorTarget.textContent = e.message;
        this.orderErrorTarget.style.display = '';
      }
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  // ---- Order Summary Sidebar ----

  async loadSidebar() {
    const maskedId = api.cartId();
    if (!maskedId) {
      if (this.hasSidebarLoadingTarget) this.sidebarLoadingTarget.textContent = 'Your cart is empty.';
      return;
    }

    try {
      const cart = await api.get(`/api/guest-carts/${maskedId}`);
      this._cart = cart;

      if (this.hasSidebarLoadingTarget) this.sidebarLoadingTarget.style.display = 'none';

      // Analytics: track checkout begin
      if (cart.items && cart.items.length > 0) {
        analytics.beginCheckout(cart.items, cart.prices?.grandTotal || 0);
      }

      if (!cart.items || cart.items.length === 0) {
        if (this.hasSidebarLoadingTarget) {
          this.sidebarLoadingTarget.style.display = '';
          this.sidebarLoadingTarget.textContent = 'Your cart is empty.';
        }
        return;
      }

      // Render items
      if (this.hasSidebarItemsTarget) {
        this.sidebarItemsTarget.style.display = '';
        this.sidebarItemsTarget.innerHTML = '';
        cart.items.forEach(item => {
          const el = hydrateTemplate('tpl-checkout-sidebar-item', {
            image: item.thumbnailUrl,
            name: item.name,
            qty: `Qty: ${item.qty}`,
            price: formatPrice(item.rowTotalInclTax, this.currencyValue),
          });
          setSlotAttributes(el, { 'image': { alt: item.name || '' } });
          if (item.options?.length) {
            setSlotHtml(el, 'options', item.options.map(o => `<div>${escapeHtml(o.label)}: ${escapeHtml(o.value)}</div>`).join(''));
          }
          this.sidebarItemsTarget.appendChild(el);
        });
      }

      // Render totals
      this._updateTotals(cart.prices);

      // Render coupon/giftcard state
      this._updatePromo(cart);

    } catch {
      if (this.hasSidebarLoadingTarget) {
        this.sidebarLoadingTarget.textContent = 'Could not load cart.';
      }
    }
  }

  _updateTotals(prices) {
    if (!prices) return;
    if (this.hasSidebarTotalsTarget) this.sidebarTotalsTarget.style.display = '';
    if (this.hasSidebarSubtotalTarget) this.sidebarSubtotalTarget.textContent = formatPrice(prices.subtotal || 0, this.currencyValue);
    if (this.hasSidebarTaxTarget) this.sidebarTaxTarget.textContent = formatPrice(prices.taxAmount || 0, this.currencyValue);

    if (this.hasSidebarDiscountRowTarget) {
      if (prices.discountAmount && prices.discountAmount !== 0) {
        this.sidebarDiscountRowTarget.style.display = '';
        if (this.hasSidebarDiscountTarget) this.sidebarDiscountTarget.textContent = `-${formatPrice(prices.discountAmount, this.currencyValue)}`;
      } else {
        this.sidebarDiscountRowTarget.style.display = 'none';
      }
    }

    // Shipping: use selected shipping price if we have one, otherwise from API
    if (this.hasSidebarShippingRowTarget) {
      const shipAmount = this._selectedShippingPrice != null ? this._selectedShippingPrice : prices.shippingAmount;
      if (shipAmount != null) {
        this.sidebarShippingRowTarget.style.display = '';
        if (this.hasSidebarShippingTarget) this.sidebarShippingTarget.textContent = formatPrice(shipAmount, this.currencyValue);
      } else {
        this.sidebarShippingRowTarget.style.display = 'none';
      }
    }

    // Gift card: from prices.giftcardAmount or sum of appliedGiftcards
    const gcAmount = prices.giftcardAmount || (this._cart?.appliedGiftcards?.reduce((s, gc) => s + gc.appliedAmount, 0) || 0);
    if (this.hasSidebarGiftcardRowTarget) {
      if (gcAmount > 0) {
        this.sidebarGiftcardRowTarget.style.display = '';
        if (this.hasSidebarGiftcardTarget) this.sidebarGiftcardTarget.textContent = `-${formatPrice(gcAmount, this.currencyValue)}`;
      } else {
        this.sidebarGiftcardRowTarget.style.display = 'none';
      }
    }

    // Recalculate grand total with shipping and giftcard
    this._recalcTotal();
  }

  _updatePromo(cart) {
    // Show promo tabs once cart is loaded
    if (this.hasPromoTabsTarget) this.promoTabsTarget.style.display = '';

    // Determine which tab to show by default: giftcard if applied, coupon if applied, else coupon
    const hasGc = cart.appliedGiftcards?.length > 0;
    const hasCoupon = !!cart.couponCode;
    const defaultTab = hasGc && !hasCoupon ? 'giftcard' : 'coupon';

    // Smart promo tab defaulting (DaisyUI radio tabs — CSS handles show/hide)
    if (this.hasPromoTabsTarget) {
      if (defaultTab === 'giftcard' && this.hasGiftcardTabTarget) {
        this.giftcardTabTarget.checked = true;
      } else if (this.hasCouponTabTarget) {
        this.couponTabTarget.checked = true;
      }
    }

    // Coupon
    if (cart.couponCode) {
      if (this.hasCouponFormTarget) this.couponFormTarget.style.display = 'none';
      if (this.hasCouponAppliedTarget) {
        this.couponAppliedTarget.style.display = '';
        if (this.hasCouponBadgeTarget) this.couponBadgeTarget.textContent = cart.couponCode;
      }
    } else {
      if (this.hasCouponFormTarget) this.couponFormTarget.style.display = '';
      if (this.hasCouponAppliedTarget) this.couponAppliedTarget.style.display = 'none';
    }

    // Gift cards
    if (this.hasGiftcardsAppliedTarget) {
      this.giftcardsAppliedTarget.innerHTML = '';
      if (hasGc) {
        this.giftcardsAppliedTarget.style.display = '';
        cart.appliedGiftcards.forEach(gc => {
          const el = hydrateTemplate('tpl-giftcard-badge', {
            label: `${gc.code} (-${formatPrice(gc.appliedAmount, this.currencyValue)})`,
          });
          setSlotAttributes(el, {
            'remove': { 'data-action': 'click->checkout#removeGiftcard', 'data-gc-code': gc.code },
          });
          this.giftcardsAppliedTarget.appendChild(el);
        });
      } else {
        this.giftcardsAppliedTarget.style.display = 'none';
      }
    }
  }


  async applyCoupon() {
    const code = this.hasCouponInputTarget ? this.couponInputTarget.value.trim() : '';
    if (!code) return;
    const maskedId = api.cartId();
    if (!maskedId) return;
    try {
      const response = await api.post(`/api/guest-carts/${maskedId}/coupon`, { code });
      if (!response.ok) {
        const err = await response.json();
        alert(err.message || 'Invalid coupon');
        return;
      }
      const cart = await response.json();
      this._cart = cart;
      this._updateTotals(cart.prices);
      this._updatePromo(cart);
      dispatchCartEvent();
    } catch {}
  }

  async removeCoupon() {
    const maskedId = api.cartId();
    if (!maskedId) return;
    try {
      const response = await api.del(`/api/guest-carts/${maskedId}/coupon`);
      if (response.ok) {
        const cart = await response.json();
        this._cart = cart;
        this._updateTotals(cart.prices);
        this._updatePromo(cart);
      }
      dispatchCartEvent();
    } catch {}
  }

  async applyGiftcard() {
    const code = this.hasGiftcardInputTarget ? this.giftcardInputTarget.value.trim() : '';
    if (!code) return;
    const maskedId = api.cartId();
    if (!maskedId) return;
    try {
      const response = await api.post(`/api/guest-carts/${maskedId}/giftcard`, { code });
      if (!response.ok) {
        const err = await response.json();
        alert(err.message || 'Invalid gift card');
        return;
      }
      if (this.hasGiftcardInputTarget) this.giftcardInputTarget.value = '';
      const cart = await response.json();
      this._cart = cart;
      this._updateTotals(cart.prices);
      this._updatePromo(cart);
      dispatchCartEvent();
    } catch {}
  }

  async removeGiftcard(event) {
    const code = event.currentTarget.dataset.gcCode;
    const maskedId = api.cartId();
    if (!maskedId || !code) return;
    try {
      const response = await api.del(`/api/guest-carts/${maskedId}/giftcard/${encodeURIComponent(code)}`);
      if (response.ok) {
        const cart = await response.json();
        this._cart = cart;
        this._updateTotals(cart.prices);
        this._updatePromo(cart);
      }
      dispatchCartEvent();
    } catch {}
  }

  // ---- Address Autocomplete (Google Places API New — REST) ----

  _initAddressSearch() {
    if (!this.googleMapsKeyValue || !this.hasStreetTarget) return;
    this._streetAutocompleteTimer = null;
    this._streetSuggestions = [];
    this._placesSessionToken = crypto.randomUUID();

    const input = this.streetTarget;

    input.addEventListener('input', () => {
      clearTimeout(this._streetAutocompleteTimer);
      const q = input.value.trim();
      if (q.length > 4) {
        // Suppress browser/1Password autocomplete when Google kicks in
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('data-1p-ignore', '');
        input.setAttribute('data-lpignore', 'true');
        input.setAttribute('data-form-type', 'other');
        this._streetAutocompleteTimer = setTimeout(() => this._fetchStreetSuggestions(q), 250);
      } else {
        // Restore browser autocomplete for short input
        input.setAttribute('autocomplete', 'address-line1');
        input.removeAttribute('data-1p-ignore');
        input.removeAttribute('data-lpignore');
        input.removeAttribute('data-form-type');
        this._hideStreetSuggestions();
      }
    });

    document.addEventListener('click', (e) => {
      if (this.hasStreetSuggestionsTarget && !this.streetSuggestionsTarget.contains(e.target) && e.target !== this.streetTarget) {
        this._hideStreetSuggestions();
      }
    });
  }

  _hideStreetSuggestions() {
    if (this.hasStreetSuggestionsTarget) this.streetSuggestionsTarget.style.display = 'none';
  }

  async _fetchStreetSuggestions(query) {
    if (!this.hasStreetSuggestionsTarget) return;
    try {
      const biasCountry = this.detectedCountryValue || (this.hasCountryTarget ? this.countryTarget.value : '') || '';
      const body = {
        input: query,
        sessionToken: this._placesSessionToken,
        includedPrimaryTypes: ['street_address', 'subpremise', 'premise'],
      };
      if (biasCountry) body.includedRegionCodes = [biasCountry.toUpperCase()];

      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': this.googleMapsKeyValue },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const data = await res.json();
      const suggestions = data.suggestions || [];
      if (!suggestions.length) { this._hideStreetSuggestions(); return; }

      this._streetSuggestions = suggestions;
      this.streetSuggestionsTarget.innerHTML = suggestions.map((s, i) =>
        `<div data-idx="${i}" class="px-3 py-2.5 cursor-pointer text-sm hover:bg-base-200 border-b border-base-200 last:border-b-0">${escapeHtml(s.placePrediction?.text?.text || '')}</div>`
      ).join('');
      this.streetSuggestionsTarget.style.display = 'block';

      this.streetSuggestionsTarget.querySelectorAll('[data-idx]').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.idx, 10);
          this._selectStreetSuggestion(this._streetSuggestions[idx]);
        });
      });
    } catch (err) {
      console.warn('[Checkout] Address suggestion error:', err);
    }
  }

  async _selectStreetSuggestion(suggestion) {
    this._hideStreetSuggestions();
    const placeId = suggestion?.placePrediction?.placeId;
    if (!placeId) return;
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=addressComponents,formattedAddress&sessionToken=${this._placesSessionToken}`, {
        headers: { 'X-Goog-Api-Key': this.googleMapsKeyValue },
      });
      if (!res.ok) return;
      const place = await res.json();
      if (place.addressComponents) this._applyGooglePlace(place.addressComponents);
      // New session token
      this._placesSessionToken = crypto.randomUUID();
    } catch (err) {
      console.warn('[Checkout] Place fetch error:', err);
    }
  }

  _applyGooglePlace(components) {
    const get = (type) => components.find(c => c.types.includes(type));
    const streetNumber = get('street_number')?.longText || '';
    const route = get('route')?.longText || '';
    const subpremise = get('subpremise')?.longText || '';
    const city = get('locality')?.longText || get('sublocality_level_1')?.longText || get('postal_town')?.longText || '';
    const state = get('administrative_area_level_1')?.longText || '';
    const stateShort = get('administrative_area_level_1')?.shortText || '';
    const postcode = get('postal_code')?.longText || '';
    const countryCode = get('country')?.shortText || '';

    const street = [streetNumber, route].filter(Boolean).join(' ');
    if (this.hasStreetTarget) this.streetTarget.value = street;
    if (this.hasStreet2Target) this.street2Target.value = subpremise;
    if (this.hasCityTarget) this.cityTarget.value = city;
    if (this.hasPostcodeTarget) this.postcodeTarget.value = postcode;

    if (countryCode && this.hasCountryTarget) {
      this.countryTarget.value = countryCode;
      this.onCountryChange();
      requestAnimationFrame(() => {
        if (this.hasRegionTarget && this.regionTarget.style.display !== 'none') {
          const regionOpts = Array.from(this.regionTarget.options);
          const match = regionOpts.find(o =>
            o.textContent.toLowerCase() === state.toLowerCase() ||
            o.textContent.toLowerCase() === stateShort.toLowerCase()
          );
          if (match) this.regionTarget.value = match.value;
        } else if (this.hasRegionTextTarget) {
          this.regionTextTarget.value = state;
        }
        this.onAddressChange();
      });
    }
  }
}