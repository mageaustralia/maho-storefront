/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';

export default class AuthStateController extends Controller {
  static targets = ['guestLink', 'userMenu', 'dropdown', 'greeting'];

  connect() {
    this._boundUpdate = () => this._updateState();
    this._boundCloseOnClick = (e) => this._closeOnOutsideClick(e);
    this._boundTurboRender = () => this._updateState();
    document.addEventListener('auth:changed', this._boundUpdate);
    document.addEventListener('click', this._boundCloseOnClick);
    document.addEventListener('turbo:render', this._boundTurboRender);
    this._updateState();
  }

  disconnect() {
    document.removeEventListener('auth:changed', this._boundUpdate);
    document.removeEventListener('click', this._boundCloseOnClick);
    document.removeEventListener('turbo:render', this._boundTurboRender);
  }

  toggleDropdown(event) {
    event.stopPropagation();
    if (!this.hasDropdownTarget) return;
    const isOpen = this.dropdownTarget.style.display !== 'none';
    this.dropdownTarget.style.display = isOpen ? 'none' : '';
  }

  _closeOnOutsideClick(event) {
    if (!this.hasDropdownTarget) return;
    if (!this.element.contains(event.target)) {
      this.dropdownTarget.style.display = 'none';
    }
  }

  logout() {
    localStorage.removeItem('maho_token');
    localStorage.removeItem('maho_customer');
    document.dispatchEvent(new CustomEvent('auth:changed'));
    window.Turbo?.visit('/');
  }

  _updateState() {
    const token = localStorage.getItem('maho_token');
    const isLoggedIn = !!token;

    if (this.hasGuestLinkTarget) this.guestLinkTarget.style.display = isLoggedIn ? 'none' : '';
    if (this.hasUserMenuTarget) this.userMenuTarget.style.display = isLoggedIn ? '' : 'none';

    if (isLoggedIn && this.hasGreetingTarget) {
      try {
        const customer = JSON.parse(localStorage.getItem('maho_customer') || '{}');
        this.greetingTarget.textContent = customer.firstName ? `Hi, ${customer.firstName}` : 'My Account';
      } catch {
        this.greetingTarget.textContent = 'My Account';
      }
    }

    // Close dropdown on state change
    if (this.hasDropdownTarget) this.dropdownTarget.style.display = 'none';
  }
}