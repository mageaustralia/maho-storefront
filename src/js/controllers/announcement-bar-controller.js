/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';

const STORAGE_KEY = 'announcement-bar-dismissed';

export default class AnnouncementBarController extends Controller {
  connect() {
    // Ensure CSS class is set if dismissed — the blocking head script sets it
    // on initial load; this covers cases where the class was somehow lost.
    if (sessionStorage.getItem(STORAGE_KEY)) {
      document.documentElement.classList.add('ab-dismissed');
    }
  }

  dismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1');
    document.documentElement.classList.add('ab-dismissed');
  }
}
