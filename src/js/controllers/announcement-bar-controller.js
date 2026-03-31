/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';

const STORAGE_KEY = 'announcement-bar-dismissed';

export default class AnnouncementBarController extends Controller {
  connect() {
    // Hide immediately if already dismissed — no remove() so data-turbo-permanent
    // keeps the element in the DOM across Turbo navigations, preventing layout shift.
    if (sessionStorage.getItem(STORAGE_KEY)) {
      this.element.hidden = true;
    }
  }

  dismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1');
    this.element.style.transition = 'opacity 200ms, max-height 300ms';
    this.element.style.opacity = '0';
    this.element.style.maxHeight = '0';
    this.element.style.overflow = 'hidden';
    this.element.style.padding = '0';
    setTimeout(() => { this.element.hidden = true; }, 300);
  }
}
