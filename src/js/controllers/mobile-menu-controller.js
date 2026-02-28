/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';

export default class MobileMenuController extends Controller {
  static targets = ['panel'];

  open() {
    this.element.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.element.classList.remove('open');
    document.body.style.overflow = '';
  }

  backdropClick(event) {
    if (event.target === this.element) this.close();
  }

  toggleCategory(event) {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const li = btn.closest('li');
    const sub = li?.querySelector(':scope > ul');
    if (!sub) return;

    const isOpen = sub.style.display !== 'none';
    sub.style.display = isOpen ? 'none' : '';
    // Rotate chevron
    const svg = btn.querySelector('svg');
    if (svg) svg.style.transform = isOpen ? '' : 'rotate(180deg)';
  }
}