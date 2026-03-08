/**
 * Stripe Elements Payment Adapter (standalone plugin)
 *
 * Load this script AFTER the main storefront bundle:
 *   <script src="/plugins/stripe-payment.js" defer></script>
 *
 * Requires:
 *   - Stripe publishable key set in window.STRIPE_PUBLISHABLE_KEY
 *     (typically injected by the storefront worker from env/config)
 *   - Backend endpoint: POST /api/stripe/create-payment-intent
 *     (returns { clientSecret, paymentIntentId } or { error, message })
 *
 * Handles Maho payment method code: stripe_card
 */
(function () {
  'use strict';

  var STRIPE_JS_URL = 'https://js.stripe.com/v3/';

  function StripeAdapter() {
    this._stripe = null;
    this._cardElement = null;
    this._container = null;
    this._cardComplete = false;
    this._publishableKey = null;
    this._api = null;
  }

  StripeAdapter.prototype.match = function (methodCode) {
    return methodCode === 'stripe_card';
  };

  StripeAdapter.prototype.init = async function (container, context) {
    this._container = container;
    this._api = context.api || window.MahoStorefront?.api;
    this._cardComplete = false;

    container.innerHTML = '<p class="text-sm text-base-content/60">Loading card fields...</p>';

    try {
      // Get publishable key from window or from backend config
      this._publishableKey = window.STRIPE_PUBLISHABLE_KEY;
      if (!this._publishableKey) {
        // Try fetching from backend config endpoint
        var configData = await this._apiGet('/api/stripe/config');
        if (configData && configData.publishableKey) {
          this._publishableKey = configData.publishableKey;
        }
      }

      if (!this._publishableKey) {
        container.innerHTML = '<p class="text-sm text-error">Stripe is not configured. Please contact the store owner.</p>';
        return;
      }

      // Load Stripe.js
      await this._loadSDK();

      // Initialize Stripe
      this._stripe = window.Stripe(this._publishableKey);
      var elements = this._stripe.elements();

      // Render card container
      container.innerHTML =
        '<div id="stripe-card-element" style="padding: 10px 12px; min-height: 40px; border: 1px solid oklch(var(--bc) / 0.25); border-radius: var(--radius-field, 0.25rem); background: var(--color-base-100, #fff);"></div>' +
        '<div id="stripe-card-errors" role="alert" class="text-sm text-error mt-1"></div>';

      // Mount Stripe Elements card
      this._cardElement = elements.create('card', {
        style: {
          base: {
            fontSize: '14px',
            color: '#1f2937',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            lineHeight: '1.5',
            '::placeholder': { color: '#9ca3af' },
          },
          invalid: { color: '#dc2626', iconColor: '#dc2626' },
        },
      });

      var self = this;
      this._cardElement.mount('#stripe-card-element');

      this._cardElement.on('change', function (event) {
        var errorEl = document.getElementById('stripe-card-errors');
        if (errorEl) {
          errorEl.textContent = event.error ? event.error.message : '';
        }
        self._cardComplete = event.complete;
      });

    } catch (e) {
      console.error('[stripe] Init failed:', e);
      container.innerHTML = '<p class="text-sm text-error">Failed to load card fields. Please refresh and try again.</p>';
    }
  };

  StripeAdapter.prototype.tokenize = async function () {
    if (!this._stripe || !this._cardElement) {
      throw new Error('Card fields are not ready. Please wait and try again.');
    }

    if (!this._cardComplete) {
      throw new Error('Please complete your card details.');
    }

    // 1. Create PaymentIntent on the server via API Platform
    var cartId = this._api ? this._api.cartId() : localStorage.getItem('maho_cart_id');
    if (!cartId) {
      throw new Error('No active cart found. Please add items to your cart.');
    }
    var piResponse = await this._apiPost('/api/payments/stripe/payment-intents', { cartId: cartId });

    if (piResponse.error) {
      throw new Error(piResponse.message || 'Could not initialize payment.');
    }

    // 2. Confirm card payment (handles 3DS automatically)
    var result = await this._stripe.confirmCardPayment(piResponse.clientSecret, {
      payment_method: { card: this._cardElement },
    });

    if (result.error) {
      throw new Error(result.error.message || 'Payment failed.');
    }

    // 3. Return the PaymentIntent ID for the backend to verify
    return {
      stripe_payment_intent_id: result.paymentIntent.id,
    };
  };

  StripeAdapter.prototype.destroy = function () {
    if (this._cardElement) {
      this._cardElement.destroy();
      this._cardElement = null;
    }
    this._stripe = null;
    this._cardComplete = false;
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  };

  StripeAdapter.prototype._loadSDK = function () {
    if (window.Stripe) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = STRIPE_JS_URL;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load Stripe.js')); };
      document.head.appendChild(s);
    });
  };

  StripeAdapter.prototype._apiGet = async function (path) {
    if (this._api && this._api.get) {
      return this._api.get(path);
    }
    var url = (window.MAHO_API_URL || '') + path;
    var storeCode = window.MAHO_STORE_CODE;
    if (storeCode) url += (url.includes('?') ? '&' : '?') + 'store=' + storeCode;
    var response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    return response.json();
  };

  StripeAdapter.prototype._apiPost = async function (path, body) {
    if (this._api && this._api.post) {
      var response = await this._api.post(path, body || {});
      return response.json();
    }
    var url = (window.MAHO_API_URL || '') + path;
    var storeCode = window.MAHO_STORE_CODE;
    if (storeCode) url += (url.includes('?') ? '&' : '?') + 'store=' + storeCode;
    var headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    var token = localStorage.getItem('maho_token');
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body || {}),
    });
    return response.json();
  };

  // Register with the storefront's payment adapter system
  function register() {
    if (window.MahoStorefront && window.MahoStorefront.registerPaymentAdapter) {
      window.MahoStorefront.registerPaymentAdapter(new StripeAdapter());
      return true;
    }
    return false;
  }

  // The core bundle may load after this plugin, so retry briefly
  if (!register()) {
    var attempts = 0;
    var interval = setInterval(function () {
      if (register() || ++attempts > 40) {
        clearInterval(interval);
      }
    }, 100);
  }
})();
