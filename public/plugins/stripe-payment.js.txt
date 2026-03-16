/**
 * Stripe Elements Payment Adapter (standalone plugin)
 *
 * Load this script AFTER the main storefront bundle:
 *   <script src="/plugins/stripe-payment.js" defer></script>
 *
 * Requires:
 *   - Stripe publishable key set in window.STRIPE_PUBLISHABLE_KEY
 *     (typically injected by the storefront worker from env/config)
 *   - Backend endpoint: POST /api/payments/stripe/payment-intents
 *     (returns { clientSecret, paymentIntentId } or { error, message })
 *
 * Handles Maho payment method code: stripe_card
 *
 * Features:
 *   - Inline card input via Stripe Elements
 *   - Google Pay / Apple Pay via Payment Request Button (auto-detected)
 */
(function () {
  'use strict';

  var STRIPE_JS_URL = 'https://js.stripe.com/v3/';

  function StripeAdapter() {
    this._stripe = null;
    this._elements = null;
    this._cardElement = null;
    this._prButton = null;
    this._paymentRequest = null;
    this._container = null;
    this._cardComplete = false;
    this._publishableKey = null;
    this._api = null;
    this._context = null;
    // Set by Payment Request flow to auto-submit the order
    this._prPaymentIntentId = null;
    this._prResolve = null;
  }

  StripeAdapter.prototype.match = function (methodCode) {
    return methodCode === 'stripe_card';
  };

  /**
   * Methods absorbed by this adapter — these are handled inline via
   * the Payment Request Button and don't need separate radio buttons.
   */
  StripeAdapter.prototype.absorbedMethods = function () {
    return ['stripe_applepay', 'stripe_googlepay', 'stripe_link'];
  };

  /**
   * Early initialization: mount Stripe Link Authentication Element in place of the email field.
   * This runs at checkout page load (before payment method selection).
   * If the customer has a Stripe Link account, they verify via SMS and get
   * address + payment auto-filled. If not, it works as a normal email input.
   */
  StripeAdapter.prototype.initEarly = async function (context) {
    var emailContainer = context.emailContainer;
    if (!emailContainer) return false;

    try {
      this._publishableKey = window.STRIPE_PUBLISHABLE_KEY;
      if (!this._publishableKey) {
        var configData = await this._apiGet('/api/payments/stripe/config');
        if (configData && configData.publishableKey) {
          this._publishableKey = configData.publishableKey;
        }
      }
      if (!this._publishableKey) return false;

      await this._loadSDK();
      this._stripe = window.Stripe(this._publishableKey);

      this._linkElements = this._stripe.elements({
        mode: 'payment',
        amount: 100,
        currency: (context.currency || 'aud').toLowerCase(),
      });

      // Replace email fieldset — keep a hidden input so checkout controller can read the value
      emailContainer.innerHTML =
        '<fieldset class="fieldset">' +
        '<legend class="fieldset-legend">Email <span class="text-error">*</span></legend>' +
        '<div id="stripe-link-auth"></div>' +
        '<input type="hidden" id="checkout-email" data-checkout-target="email" />' +
        '</fieldset>';

      var self = this;
      this._linkAuthElement = this._linkElements.create('linkAuthentication', {
        defaultValues: { email: context.prefillEmail || '' },
      });

      this._linkAuthElement.mount('#stripe-link-auth');

      this._linkAuthElement.on('change', function (event) {
        if (event.value && event.value.email) {
          context.onEmail(event.value.email);
        }
        if (event.complete) {
          self._linkAuthenticated = true;
          context.onPaymentReady();
        }
      });

      this._linkAuthenticated = false;
      return true;

    } catch (e) {
      console.error('[stripe] Link init failed:', e);
      return false;
    }
  };

  StripeAdapter.prototype.init = async function (container, context) {
    this._container = container;
    this._api = context.api || window.MahoStorefront?.api;
    this._context = context;
    this._cardComplete = false;
    this._prPaymentIntentId = null;

    container.innerHTML = '<p class="text-sm text-base-content/60">Loading payment options...</p>';

    try {
      // Get publishable key from window or from backend config
      if (!this._publishableKey) {
        this._publishableKey = window.STRIPE_PUBLISHABLE_KEY;
        if (!this._publishableKey) {
          var configData = await this._apiGet('/api/payments/stripe/config');
          if (configData && configData.publishableKey) {
            this._publishableKey = configData.publishableKey;
          }
        }
      }

      if (!this._publishableKey) {
        container.innerHTML = '<p class="text-sm text-error">Stripe is not configured. Please contact the store owner.</p>';
        return;
      }

      // Load Stripe.js (may already be loaded by initEarly)
      await this._loadSDK();

      // Reuse Stripe instance from initEarly if available
      if (!this._stripe) {
        this._stripe = window.Stripe(this._publishableKey);
      }
      this._elements = this._stripe.elements();

      // If Link already authenticated, show a summary with option to use card instead
      if (this._linkAuthenticated) {
        container.innerHTML =
          '<div class="flex items-center gap-2 p-3 bg-base-200/50 rounded-lg mb-3">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>' +
          '<span class="text-sm">Paying with <strong>Link</strong></span>' +
          '</div>' +
          '<a href="#" id="stripe-use-card" class="text-sm text-primary hover:underline">Use a different payment method</a>' +
          '<div id="stripe-card-fields" style="display:none">' +
          '<div id="stripe-pr-button" style="display:none"></div>' +
          '<div id="stripe-pr-divider" style="display:none" class="divider text-xs text-base-content/40 my-3">Or pay with card</div>' +
          '<div id="stripe-card-element" style="padding: 10px 12px; min-height: 40px; border: 1px solid oklch(var(--bc) / 0.25); border-radius: var(--radius-field, 0.25rem); background: var(--color-base-100, #fff);"></div>' +
          '</div>' +
          '<div id="stripe-card-errors" role="alert" class="text-sm text-error mt-1"></div>';

        var useCardLink = document.getElementById('stripe-use-card');
        var cardFields = document.getElementById('stripe-card-fields');
        var self = this;
        if (useCardLink && cardFields) {
          useCardLink.addEventListener('click', function (e) {
            e.preventDefault();
            self._linkAuthenticated = false;
            cardFields.style.display = '';
            useCardLink.style.display = 'none';
            if (!self._cardElement) self._mountCardElement();
          });
        }
        return;
      }

      // Build the container HTML — PR button slot + card fields
      container.innerHTML =
        '<div id="stripe-pr-button" style="display:none"></div>' +
        '<div id="stripe-pr-divider" style="display:none" class="divider text-xs text-base-content/40 my-3">Or pay with card</div>' +
        '<div id="stripe-card-element" style="padding: 10px 12px; min-height: 40px; border: 1px solid oklch(var(--bc) / 0.25); border-radius: var(--radius-field, 0.25rem); background: var(--color-base-100, #fff);"></div>' +
        '<div id="stripe-card-errors" role="alert" class="text-sm text-error mt-1"></div>';

      // Mount card element
      this._mountCardElement();

      // Try to mount Payment Request Button (Google Pay / Apple Pay)
      this._initPaymentRequestButton();

    } catch (e) {
      console.error('[stripe] Init failed:', e);
      container.innerHTML = '<p class="text-sm text-error">Failed to load payment options. Please refresh and try again.</p>';
    }
  };

  StripeAdapter.prototype._mountCardElement = function () {
    if (this._cardElement) return; // Already mounted

    var cardContainer = document.getElementById('stripe-card-element');
    if (!cardContainer) return;

    this._cardElement = this._elements.create('card', {
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
  };

  /**
   * Initialize the Payment Request Button for Google Pay / Apple Pay.
   * The button only appears if the browser/device supports it.
   */
  StripeAdapter.prototype._initPaymentRequestButton = async function () {
    if (!this._stripe || !this._elements) return;

    // Get cart total for the payment request
    var total = this._getCartTotal();
    var currency = (this._context?.currency || 'AUD').toLowerCase();

    this._paymentRequest = this._stripe.paymentRequest({
      country: 'AU',
      currency: currency,
      total: {
        label: 'Order Total',
        amount: total, // in cents
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    // Check if Google Pay / Apple Pay is available
    var result = await this._paymentRequest.canMakePayment();
    if (!result) return; // Not available — card-only checkout

    // Mount the button
    this._prButton = this._elements.create('paymentRequestButton', {
      paymentRequest: this._paymentRequest,
      style: {
        paymentRequestButton: {
          type: 'default',
          theme: 'dark',
          height: '44px',
        },
      },
    });

    var prContainer = document.getElementById('stripe-pr-button');
    var prDivider = document.getElementById('stripe-pr-divider');
    if (prContainer) {
      prContainer.style.display = '';
      this._prButton.mount('#stripe-pr-button');
    }
    if (prDivider) {
      prDivider.style.display = '';
    }

    var self = this;

    // Handle the payment method event from Google Pay / Apple Pay / Link
    this._paymentRequest.on('paymentmethod', async function (ev) {
      try {
        // 1. Create PaymentIntent on server
        var cartId = self._api ? self._api.cartId() : localStorage.getItem('maho_cart_id');
        if (!cartId) {
          ev.complete('fail');
          self._showError('No active cart found.');
          return;
        }

        var piResponse = await self._apiPost('/api/payments/stripe/payment-intents', { cartId: cartId });
        if (piResponse.error) {
          ev.complete('fail');
          self._showError(piResponse.message || 'Could not initialize payment.');
          return;
        }

        // 2. Confirm payment with the PM from the payment sheet
        var confirmResult = await self._stripe.confirmCardPayment(
          piResponse.clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmResult.error) {
          ev.complete('fail');
          self._showError(confirmResult.error.message || 'Payment failed.');
          return;
        }

        // Check if additional action needed (e.g. 3DS)
        if (confirmResult.paymentIntent.status === 'requires_action') {
          ev.complete('success');
          var actionResult = await self._stripe.confirmCardPayment(piResponse.clientSecret);
          if (actionResult.error) {
            self._showError(actionResult.error.message || 'Authentication failed.');
            return;
          }
          self._prPaymentIntentId = actionResult.paymentIntent.id;
        } else {
          ev.complete('success');
          self._prPaymentIntentId = confirmResult.paymentIntent.id;
        }

        // 3. Auto-click Place Order — the tokenize() method will return the PI ID
        var placeOrderBtn = document.querySelector('[data-action*="checkout#placeOrder"]');
        if (placeOrderBtn && !placeOrderBtn.disabled) {
          placeOrderBtn.click();
        }
      } catch (e) {
        console.error('[stripe] Payment Request error:', e);
        ev.complete('fail');
        self._showError(e.message || 'Payment failed. Please try again.');
      }
    });
  };

  /**
   * Get the cart total in cents for the Payment Request.
   */
  StripeAdapter.prototype._getCartTotal = function () {
    // Try to read from the sidebar total element
    var totalEl = document.querySelector('[data-checkout-target="sidebarTotal"]');
    if (totalEl) {
      var text = totalEl.textContent.replace(/[^0-9.]/g, '');
      var amount = parseFloat(text);
      if (!isNaN(amount) && amount > 0) {
        return Math.round(amount * 100);
      }
    }
    // Fallback — minimum amount, will be corrected server-side
    return 100;
  };

  StripeAdapter.prototype._showError = function (message) {
    var errorEl = document.getElementById('stripe-card-errors');
    if (errorEl) {
      errorEl.textContent = message;
    }
  };

  StripeAdapter.prototype.tokenize = async function () {
    // If Payment Request flow already completed, return the PI ID directly
    if (this._prPaymentIntentId) {
      var piId = this._prPaymentIntentId;
      this._prPaymentIntentId = null;
      return { stripe_payment_intent_id: piId };
    }

    // Link flow — create PaymentIntent and confirm with Link's saved payment method
    if (this._linkAuthenticated && this._stripe) {
      var cartId = this._api ? this._api.cartId() : localStorage.getItem('maho_cart_id');
      if (!cartId) throw new Error('No active cart found.');

      var piResponse = await this._apiPost('/api/payments/stripe/payment-intents', { cartId: cartId });
      if (piResponse.error) throw new Error(piResponse.message || 'Could not initialize payment.');

      // Create a new elements instance with the client secret for payment confirmation
      var payElements = this._stripe.elements({ clientSecret: piResponse.clientSecret });
      // Mount a hidden payment element to access Link's saved PM
      var tempDiv = document.createElement('div');
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);
      var pe = payElements.create('payment');
      pe.mount(tempDiv);

      var linkResult = await this._stripe.confirmPayment({
        elements: payElements,
        confirmParams: { return_url: window.location.origin + '/order/success' },
        redirect: 'if_required',
      });

      pe.destroy();
      tempDiv.remove();

      if (linkResult.error) throw new Error(linkResult.error.message || 'Payment failed.');
      return { stripe_payment_intent_id: linkResult.paymentIntent.id };
    }

    // Card flow
    if (!this._stripe || !this._cardElement) {
      throw new Error('Card fields are not ready. Please wait and try again.');
    }

    if (!this._cardComplete) {
      throw new Error('Please complete your card details.');
    }

    // 1. Create PaymentIntent on the server
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
    if (this._linkAuthElement) {
      this._linkAuthElement.destroy();
      this._linkAuthElement = null;
    }
    if (this._prButton) {
      this._prButton.destroy();
      this._prButton = null;
    }
    if (this._cardElement) {
      this._cardElement.destroy();
      this._cardElement = null;
    }
    this._stripe = null;
    this._elements = null;
    this._linkElements = null;
    this._linkAuthenticated = false;
    this._paymentRequest = null;
    this._cardComplete = false;
    this._prPaymentIntentId = null;
    this._prResolve = null;
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
