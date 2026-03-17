/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';

export default class AuthController extends Controller {
  static targets = ['email', 'password', 'confirmPassword', 'firstName', 'lastName', 'token', 'message', 'submitBtn'];
  static values = { mode: String };

  connect() {
    // Prefill token from URL for reset-password
    if (this.modeValue === 'reset') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token && this.hasTokenTarget) this.tokenTarget.value = token;
      const email = params.get('email');
      if (email && this.hasEmailTarget) this.emailTarget.value = email;
    }

    // If already logged in and on login/register, redirect to account
    if ((this.modeValue === 'login' || this.modeValue === 'register') && localStorage.getItem('maho_token')) {
      window.Turbo?.visit('/account');
    }

    // Check for flash message from redirect
    const flash = sessionStorage.getItem('maho_auth_flash');
    if (flash) {
      sessionStorage.removeItem('maho_auth_flash');
      try {
        const { text, type } = JSON.parse(flash);
        this._showMessage(text, type);
      } catch {}
    }
  }

  async submit(event) {
    event.preventDefault();
    const mode = this.modeValue;
    if (mode === 'login') return this._login();
    if (mode === 'register') return this._register();
    if (mode === 'forgot') return this._forgotPassword();
    if (mode === 'reset') return this._resetPassword();
  }

  async _login() {
    const email = this.hasEmailTarget ? this.emailTarget.value.trim() : '';
    const password = this.hasPasswordTarget ? this.passwordTarget.value : '';
    if (!email || !password) { this._showMessage('Please enter your email and password.', 'error'); return; }

    this._setLoading(true);
    try {
      const body = { grant_type: 'customer', email, password };
      // If guest has a cart, pass it for merging
      const cartId = localStorage.getItem('maho_cart_id');
      if (cartId) body.maskedId = cartId;

      const response = await api.post('/api/auth/token', body);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err['hydra:description'] || err.detail || err.message || 'Invalid email or password.');
      }
      const data = await response.json();
      this._handleLoginSuccess(data);
    } catch (e) {
      this._showMessage(e.message, 'error');
    } finally {
      this._setLoading(false);
    }
  }

  async _register() {
    const firstName = this.hasFirstNameTarget ? this.firstNameTarget.value.trim() : '';
    const lastName = this.hasLastNameTarget ? this.lastNameTarget.value.trim() : '';
    const email = this.hasEmailTarget ? this.emailTarget.value.trim() : '';
    const password = this.hasPasswordTarget ? this.passwordTarget.value : '';
    const confirmPassword = this.hasConfirmPasswordTarget ? this.confirmPasswordTarget.value : '';

    if (!firstName || !lastName || !email || !password) {
      this._showMessage('Please fill in all fields.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      this._showMessage('Passwords do not match.', 'error');
      return;
    }
    if (password.length < 8) {
      this._showMessage('Password must be at least 8 characters.', 'error');
      return;
    }

    this._setLoading(true);
    try {
      const response = await api.post('/api/customers', { firstName, lastName, email, password });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err['hydra:description'] || err.detail || err.message || 'Registration failed.');
      }

      // Auto-login after registration
      const body = { grant_type: 'customer', email, password };
      const cartId = localStorage.getItem('maho_cart_id');
      if (cartId) body.maskedId = cartId;

      const loginResponse = await api.post('/api/auth/token', body);
      if (loginResponse.ok) {
        const data = await loginResponse.json();
        this._handleLoginSuccess(data);
      } else {
        // Check if email confirmation is required
        const loginErr = await loginResponse.json().catch(() => ({}));
        if (loginErr.error === 'email_not_confirmed') {
          sessionStorage.setItem('maho_auth_flash', JSON.stringify({
            text: 'Account created! Please check your email for the confirmation link.',
            type: 'success'
          }));
        } else {
          sessionStorage.setItem('maho_auth_flash', JSON.stringify({
            text: 'Account created! Please sign in.',
            type: 'success'
          }));
        }
        window.Turbo?.visit('/login');
      }
    } catch (e) {
      this._showMessage(e.message, 'error');
    } finally {
      this._setLoading(false);
    }
  }

  async _forgotPassword() {
    const email = this.hasEmailTarget ? this.emailTarget.value.trim() : '';
    if (!email) { this._showMessage('Please enter your email.', 'error'); return; }

    this._setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      // Always show success (anti-enumeration)
      this._showMessage('If an account exists with that email, a reset link has been sent.', 'success');
    } catch {
      this._showMessage('If an account exists with that email, a reset link has been sent.', 'success');
    } finally {
      this._setLoading(false);
    }
  }

  async _resetPassword() {
    const email = this.hasEmailTarget ? this.emailTarget.value.trim() : '';
    const token = this.hasTokenTarget ? this.tokenTarget.value : '';
    const password = this.hasPasswordTarget ? this.passwordTarget.value : '';
    const confirmPassword = this.hasConfirmPasswordTarget ? this.confirmPasswordTarget.value : '';

    if (!email || !token || !password) {
      this._showMessage('Please fill in all fields.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      this._showMessage('Passwords do not match.', 'error');
      return;
    }
    if (password.length < 8) {
      this._showMessage('Password must be at least 8 characters.', 'error');
      return;
    }

    this._setLoading(true);
    try {
      const response = await api.post('/api/auth/reset-password', { email, token, password });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err['hydra:description'] || err.detail || err.message || 'Password reset failed.');
      }
      sessionStorage.setItem('maho_auth_flash', JSON.stringify({ text: 'Password reset successfully! Please sign in.', type: 'success' }));
      window.Turbo?.visit('/login');
    } catch (e) {
      this._showMessage(e.message, 'error');
    } finally {
      this._setLoading(false);
    }
  }

  _handleLoginSuccess(data) {
    localStorage.setItem('maho_token', data.token);
    if (data.customer) {
      localStorage.setItem('maho_customer', JSON.stringify(data.customer));
    }
    // Restore customer cart from login response
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
    window.Turbo?.visit('/account');
  }

  _showMessage(text, type) {
    if (!this.hasMessageTarget) return;
    this.messageTarget.textContent = text;
    const alertClass = type === 'error' ? 'alert-error' : type === 'success' ? 'alert-success' : '';
    this.messageTarget.className = text ? `alert alert-sm ${alertClass} text-sm py-2 px-3 mb-2` : '';
  }

  _setLoading(loading) {
    if (!this.hasSubmitBtnTarget) return;
    this.submitBtnTarget.disabled = loading;
    if (loading) {
      this._originalBtnText = this.submitBtnTarget.textContent;
      this.submitBtnTarget.textContent = 'Please wait...';
    } else {
      this.submitBtnTarget.textContent = this._originalBtnText || 'Submit';
    }
  }
}