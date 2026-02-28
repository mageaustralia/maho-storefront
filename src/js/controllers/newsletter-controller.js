/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';

export default class NewsletterController extends Controller {
  static targets = ['email', 'button', 'message'];

  async subscribe(e) {
    e.preventDefault();
    const email = this.emailTarget.value.trim();
    if (!email) return;

    const btn = this.buttonTarget;
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Subscribing...';

    try {
      const resp = await fetch(`${window.MAHO_API_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/ld+json', 'Accept': 'application/ld+json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      this.messageTarget.style.display = 'block';
      if (resp.ok) {
        this.messageTarget.textContent = data.message || 'Successfully subscribed!';
        this.messageTarget.style.color = 'var(--color-success, #22c55e)';
        this.emailTarget.value = '';
      } else {
        this.messageTarget.textContent = data.message || 'Subscription failed. Please try again.';
        this.messageTarget.style.color = 'var(--color-error, #ef4444)';
      }
    } catch {
      this.messageTarget.style.display = 'block';
      this.messageTarget.textContent = 'Network error. Please try again.';
      this.messageTarget.style.color = 'var(--color-error, #ef4444)';
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }
}