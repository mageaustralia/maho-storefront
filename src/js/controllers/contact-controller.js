/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';

export default class ContactController extends Controller {
  static targets = ['name', 'email', 'phone', 'comment', 'honeypot', 'submitBtn', 'message'];

  async submit(e) {
    e.preventDefault();

    const name = this.nameTarget.value.trim();
    const email = this.emailTarget.value.trim();
    const phone = this.hasPhoneTarget ? this.phoneTarget.value.trim() : '';
    const comment = this.commentTarget.value.trim();
    const honeypot = this.hasHoneypotTarget ? this.honeypotTarget.value : '';

    // Client-side validation
    if (!name) { this._showError('Please enter your name.'); this.nameTarget.focus(); return; }
    if (!email || !email.includes('@')) { this._showError('Please enter a valid email address.'); this.emailTarget.focus(); return; }
    if (!comment) { this._showError('Please enter your message.'); this.commentTarget.focus(); return; }

    const btn = this.submitBtnTarget;
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      let url = `${api.url()}/api/contact`;
      const storeCode = window.MAHO_STORE_CODE;
      if (storeCode) url += `?store=${storeCode}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name, email, telephone: phone, comment, company: honeypot }),
      });
      const data = await resp.json();

      if (resp.ok && data.success) {
        this._showSuccess(data.message || 'Your message has been sent. We\'ll get back to you soon.');
        this.nameTarget.value = '';
        this.emailTarget.value = '';
        if (this.hasPhoneTarget) this.phoneTarget.value = '';
        this.commentTarget.value = '';
      } else if (resp.status === 429) {
        this._showError(data.message || 'Too many submissions. Please try again later.');
      } else {
        this._showError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      this._showError('Network error. Please check your connection and try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  }

  _showError(msg) {
    this.messageTarget.textContent = msg;
    this.messageTarget.className = 'alert alert-error text-sm';
  }

  _showSuccess(msg) {
    this.messageTarget.textContent = msg;
    this.messageTarget.className = 'alert alert-success text-sm';
  }
}