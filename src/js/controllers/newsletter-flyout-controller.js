/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';

const STORAGE_KEY = 'newsletter_dismissed';

export default class NewsletterFlyoutController extends Controller {
  static targets = ['container', 'email', 'form', 'submit', 'success', 'error'];

  connect() {
    const path = window.location.pathname;
    if (localStorage.getItem(STORAGE_KEY) || path.startsWith('/cart') || path.startsWith('/checkout')) {
      this.element.remove();
      return;
    }
    this._timer = setTimeout(() => this.show(), 3000);
  }

  disconnect() {
    clearTimeout(this._timer);
  }

  show() {
    this.element.classList.remove('translate-y-[120%]');
  }

  dismiss() {
    this.element.classList.add('translate-y-[120%]');
    localStorage.setItem(STORAGE_KEY, '1');
  }

  async submit(e) {
    e.preventDefault();
    const email = this.emailTarget.value.trim();
    if (!email) return;

    const btn = this.submitTarget;
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';

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
          this.successTarget.textContent = data.message || 'Subscribed!';
        }
        if (this.hasErrorTarget) this.errorTarget.classList.add('hidden');
        setTimeout(() => this.dismiss(), 2000);
      } else {
        if (this.hasErrorTarget) {
          this.errorTarget.classList.remove('hidden');
          this.errorTarget.textContent = data.message || 'Please try again.';
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
