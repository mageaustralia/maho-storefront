/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { BasePaymentAdapter } from './base-adapter.js';
import { api } from '../api.js';

const SDK_VERSION = '3.48.0';
const SDK_BASE = `https://js.braintreegateway.com/web/${SDK_VERSION}/js`;

/**
 * Braintree Hosted Fields adapter.
 *
 * Handles: gene_braintree_creditcard
 *
 * Flow:
 *   1. Fetches a client token from /api/braintree/client-token
 *   2. Loads the Braintree JS SDK from CDN (client, hosted-fields, data-collector)
 *   3. Renders hosted fields (card number, expiry, CVV) into the container
 *   4. On tokenize(), returns { payment_method_nonce, device_data }
 */
export class BraintreeAdapter extends BasePaymentAdapter {
  constructor() {
    super();
    this._client = null;
    this._hostedFields = null;
    this._deviceData = null;
    this._container = null;
  }

  match(methodCode) {
    return methodCode === 'gene_braintree_creditcard';
  }

  async init(container, context) {
    this._container = container;

    // Show a loading state
    container.innerHTML = '<p class="text-sm text-base-content/60">Loading card fields...</p>';

    try {
      // 1. Get client token
      const tokenData = await api.get('/api/braintree/client-token');
      if (!tokenData.success || !tokenData.client_token) {
        container.innerHTML = '<p class="text-sm text-error">Could not initialize payment. Please try again.</p>';
        return;
      }

      // 2. Load SDK scripts
      await this._loadSDK();

      // 3. Render field containers
      container.innerHTML = `
        <div class="space-y-3">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Card Number <span class="text-error">*</span></legend>
            <div id="bt-card-number" class="input w-full h-10"></div>
          </fieldset>
          <div class="grid grid-cols-3 gap-3">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Month <span class="text-error">*</span></legend>
              <div id="bt-expiry-month" class="input w-full h-10"></div>
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Year <span class="text-error">*</span></legend>
              <div id="bt-expiry-year" class="input w-full h-10"></div>
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">CVV <span class="text-error">*</span></legend>
              <div id="bt-cvv" class="input w-full h-10"></div>
            </fieldset>
          </div>
        </div>
      `;

      // 4. Initialize Braintree client
      this._client = await window.braintree.client.create({
        authorization: tokenData.client_token,
      });

      // 5. Create hosted fields
      this._hostedFields = await window.braintree.hostedFields.create({
        client: this._client,
        styles: {
          input: {
            'font-size': '14px',
            'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            'color': '#1f2937',
            'line-height': '1.5',
          },
          ':focus': { color: '#1f2937' },
          '::placeholder': { color: '#9ca3af' },
          '.invalid': { color: '#dc2626' },
        },
        fields: {
          number: { selector: '#bt-card-number', placeholder: '4111 1111 1111 1111' },
          expirationMonth: { selector: '#bt-expiry-month', placeholder: 'MM' },
          expirationYear: { selector: '#bt-expiry-year', placeholder: 'YY' },
          cvv: { selector: '#bt-cvv', placeholder: '123' },
        },
      });

      // 6. Data collector for fraud detection (non-fatal if it fails)
      try {
        const dc = await window.braintree.dataCollector.create({ client: this._client });
        this._deviceData = dc.deviceData;
      } catch (e) {
        console.warn('[braintree] Data collector failed (non-fatal):', e);
      }

    } catch (e) {
      console.error('[braintree] Init failed:', e);
      container.innerHTML = '<p class="text-sm text-error">Failed to load card fields. Please refresh and try again.</p>';
    }
  }

  async tokenize() {
    if (!this._hostedFields) {
      throw new Error('Card fields are not ready. Please wait and try again.');
    }
    const { nonce } = await this._hostedFields.tokenize();
    return {
      payment_method_nonce: nonce,
      device_data: this._deviceData || '',
    };
  }

  destroy() {
    if (this._hostedFields) {
      this._hostedFields.teardown().catch(() => {});
      this._hostedFields = null;
    }
    this._client = null;
    this._deviceData = null;
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  async _loadSDK() {
    if (window.braintree?.client && window.braintree?.hostedFields) return;

    const modules = ['client', 'hosted-fields', 'data-collector'];
    for (const mod of modules) {
      if (document.querySelector(`script[src*="${mod}.min.js"]`)) continue;
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `${SDK_BASE}/${mod}.min.js`;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
  }
}