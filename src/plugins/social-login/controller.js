/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../../js/stimulus.js';
import { api } from '../../js/api.js';
import { updateCartBadge } from '../../js/utils.js';

export default class SocialAuthController extends Controller {
  static values = {
    googleClientId: String,
    appleServiceId: String,
    facebookAppId: String,
    checkoutMode: { type: Boolean, default: false },
  };

  // Store pending social auth for account linking flow
  _pendingProvider = null;
  _pendingToken = null;

  async google() {
    const clientId = this.googleClientIdValue;
    if (!clientId) return;

    try {
      const idToken = await this._googlePopup(clientId);
      await this._authenticate('google', idToken);
    } catch (e) {
      if (e.message !== 'popup_closed') {
        this._showError(e.message || 'Google sign-in failed.');
      }
    }
  }

  async apple() {
    const serviceId = this.appleServiceIdValue;
    if (!serviceId) return;

    try {
      const idToken = await this._applePopup(serviceId);
      await this._authenticate('apple', idToken);
    } catch (e) {
      if (e.message !== 'popup_closed') {
        this._showError(e.message || 'Apple sign-in failed.');
      }
    }
  }

  async facebook() {
    const appId = this.facebookAppIdValue;
    if (!appId) return;

    try {
      const accessToken = await this._facebookPopup();
      await this._authenticate('facebook', accessToken);
    } catch (e) {
      if (e.message !== 'popup_closed') {
        this._showError(e.message || 'Facebook login failed.');
      }
    }
  }

  async _authenticate(provider, token, password) {
    const body = { provider, token };
    const cartId = localStorage.getItem('maho_cart_id');
    if (cartId) body.maskedId = cartId;
    if (password) body.password = password;

    const response = await api.post('/api/customers/social-auth', body);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err['hydra:description'] || err.detail || err.message || 'Authentication failed.');
    }

    const data = await response.json();

    // Account linking required — existing account found, needs password verification
    if (data.linkRequired === 'account_exists') {
      this._pendingProvider = provider;
      this._pendingToken = token;
      this._showLinkPrompt(data.customer?.email || 'your email');
      return;
    }

    this._handleSuccess(data);
  }

  /** Called when user submits password to link their existing account */
  async linkAccount(event) {
    event?.preventDefault();
    const passwordInput = this.element.querySelector('[data-social-link-password]');
    const password = passwordInput?.value;
    if (!password || !this._pendingProvider || !this._pendingToken) return;

    try {
      await this._authenticate(this._pendingProvider, this._pendingToken, password);
    } catch (e) {
      this._showError(e.message || 'Incorrect password.');
    }
  }

  _handleSuccess(data) {
    this._pendingProvider = null;
    this._pendingToken = null;

    localStorage.setItem('maho_token', data.authToken);
    if (data.customer) {
      localStorage.setItem('maho_customer', JSON.stringify(data.customer));
    }
    if (data.cartMaskedId) {
      localStorage.setItem('maho_cart_id', data.cartMaskedId);
      localStorage.setItem('maho_cart_qty', String(data.cartItemsQty || 0));
    } else {
      localStorage.removeItem('maho_cart_id');
      localStorage.removeItem('maho_cart_qty');
    }
    updateCartBadge();
    document.dispatchEvent(new CustomEvent('auth:changed'));
    document.dispatchEvent(new CustomEvent('wishlist:sync'));

    if (this.checkoutModeValue) {
      // Reload checkout to pick up customer data (saved addresses, etc.)
      window.Turbo?.visit('/checkout', { action: 'replace' }) || window.location.reload();
    } else {
      window.Turbo?.visit('/account');
    }
  }

  _showLinkPrompt(maskedEmail) {
    // Replace the social buttons with a password prompt
    const container = this.element;
    container.innerHTML = `
      <div class="alert alert-info text-sm py-2 px-3 mb-2">
        An account with ${maskedEmail} already exists. Enter your password to link it.
      </div>
      <form data-action="submit->social-auth#linkAccount" class="flex flex-col gap-2">
        <input type="password" class="input input-bordered w-full" data-social-link-password
               placeholder="Enter your existing password" autocomplete="current-password" required />
        <button type="submit" class="btn btn-primary w-full">Link Account</button>
        <a href="/forgot-password" class="text-primary text-sm text-center hover:underline">Forgot password?</a>
      </form>
    `;
    container.querySelector('[data-social-link-password]')?.focus();
  }

  _googlePopup(clientId) {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.id) {
        reject(new Error('Google Sign-In library not loaded. Please refresh the page.'));
        return;
      }

      // Timeout after 60 seconds
      const timeout = setTimeout(() => reject(new Error('popup_closed')), 60000);

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          clearTimeout(timeout);
          if (response.credential) {
            resolve(response.credential);
          } else {
            reject(new Error('No credential returned'));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          clearTimeout(timeout);
          reject(new Error('Google Sign-In is not available. Check your popup blocker settings.'));
        }
      });
    });
  }

  _applePopup(serviceId) {
    return new Promise((resolve, reject) => {
      if (!window.AppleID?.auth) {
        reject(new Error('Apple Sign-In library not loaded. Please refresh the page.'));
        return;
      }

      AppleID.auth.init({
        clientId: serviceId,
        scope: 'name email',
        redirectURI: window.location.origin + '/social-auth/callback',
        usePopup: true,
      });

      const timeout = setTimeout(() => reject(new Error('popup_closed')), 60000);

      AppleID.auth.signIn()
        .then((response) => {
          clearTimeout(timeout);
          if (response.authorization?.id_token) {
            resolve(response.authorization.id_token);
          } else {
            reject(new Error('No token returned from Apple'));
          }
        })
        .catch((err) => {
          clearTimeout(timeout);
          if (err.error === 'popup_closed_by_user') {
            reject(new Error('popup_closed'));
          } else {
            reject(new Error(err.error || 'Apple sign-in failed'));
          }
        });
    });
  }

  _facebookPopup() {
    return new Promise((resolve, reject) => {
      if (typeof FB === 'undefined') {
        reject(new Error('Facebook SDK not loaded. Please refresh the page.'));
        return;
      }

      const timeout = setTimeout(() => reject(new Error('popup_closed')), 60000);

      FB.login((response) => {
        clearTimeout(timeout);
        if (response.authResponse?.accessToken) {
          resolve(response.authResponse.accessToken);
        } else {
          reject(new Error('popup_closed'));
        }
      }, { scope: 'email,public_profile' });
    });
  }

  _showError(message) {
    const messageEl = this.element.closest('[data-controller~="auth"]')?.querySelector('[data-auth-target="message"]')
      || this.element.querySelector('.alert');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = 'alert alert-sm alert-error text-sm py-2 px-3 mb-2';
    }
  }
}
