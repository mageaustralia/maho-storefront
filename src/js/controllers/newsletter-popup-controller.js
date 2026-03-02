/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';

const STORAGE_KEY = 'newsletter_dismissed';

export default class NewsletterPopupController extends Controller {
  static values = { delay: { type: Number, default: 5000 } };
  static targets = ['email', 'form', 'submit', 'success', 'error'];

  connect() {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const path = window.location.pathname;
    if (path.startsWith('/cart') || path.startsWith('/checkout')) return;
    this._timer = setTimeout(() => this.element.showModal(), this.delayValue);
    this.element.addEventListener('close', this._onClose = () => {
      localStorage.setItem(STORAGE_KEY, '1');
    });
  }

  disconnect() {
    clearTimeout(this._timer);
    if (this._onClose) this.element.removeEventListener('close', this._onClose);
  }

  async submit(e) {
    e.preventDefault();
    const email = this.emailTarget.value.trim();
    if (!email) return;

    const btn = this.submitTarget;
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Subscribing...';

    try {
      const resp = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/ld+json', 'Accept': 'application/ld+json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();

      if (resp.ok) {
        if (this.hasFormTarget) this.formTarget.classList.add('hidden');
        if (this.hasSuccessTarget) {
          this.successTarget.classList.remove('hidden');
          this.successTarget.textContent = data.message || 'Thanks for subscribing!';
        }
        if (this.hasErrorTarget) this.errorTarget.classList.add('hidden');
        setTimeout(() => {
          this.element.close();
        }, 2000);
      } else {
        if (this.hasErrorTarget) {
          this.errorTarget.classList.remove('hidden');
          this.errorTarget.textContent = data.message || 'Subscription failed. Please try again.';
        }
      }
    } catch {
      if (this.hasErrorTarget) {
        this.errorTarget.classList.remove('hidden');
        this.errorTarget.textContent = 'Network error. Please try again.';
      }
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }
}
