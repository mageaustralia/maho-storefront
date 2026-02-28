/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';

export default class SizeGuideController extends Controller {
  static targets = ['drawer', 'panel', 'content', 'loading'];
  static values = { block: String };

  connect() {
    this._loaded = false;
    this._open = false;

    // Grab direct references BEFORE moving — once moved, Stimulus targets won't resolve
    this._drawer = this.hasDrawerTarget ? this.drawerTarget : null;
    this._panel = this.hasPanelTarget ? this.panelTarget : null;
    this._content = this.hasContentTarget ? this.contentTarget : null;
    this._loading = this.hasLoadingTarget ? this.loadingTarget : null;

    // Move drawer to body so it escapes any stacking context (e.g. sticky sidebar)
    if (this._drawer) {
      document.body.appendChild(this._drawer);

      // Bind close handlers manually since drawer is now outside controller scope
      this._drawer.querySelectorAll('[data-action*="size-guide#close"]').forEach(el => {
        el.addEventListener('click', () => this.close());
      });

      // Also close on Escape key
      this._onKeydown = (e) => { if (e.key === 'Escape' && this._open) this.close(); };
      document.addEventListener('keydown', this._onKeydown);
    }

    // Start prefetching content immediately so it's ready when drawer opens
    this._prefetch();
  }

  disconnect() {
    if (this._onKeydown) document.removeEventListener('keydown', this._onKeydown);
    if (this._drawer && this._drawer.parentElement === document.body) {
      this._drawer.remove();
    }
    this._drawer = null;
    this._panel = null;
    this._content = null;
    this._loading = null;
  }

  async open() {
    if (!this._drawer) return;
    this._open = true;
    this._drawer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Animate panel in
    requestAnimationFrame(() => {
      if (this._panel) this._panel.classList.remove('translate-x-full');
    });

    // If prefetch already finished, content is there. Otherwise wait.
    if (!this._loaded && this._prefetchPromise) {
      await this._prefetchPromise;
    }
  }

  close() {
    if (!this._open) return;
    this._open = false;

    if (this._panel) this._panel.classList.add('translate-x-full');

    setTimeout(() => {
      if (this._drawer) this._drawer.classList.add('hidden');
      document.body.style.overflow = '';
    }, 300);
  }

  async _prefetch() {
    this._prefetchPromise = this._loadContent();
    await this._prefetchPromise;
  }

  async _loadContent() {
    const identifier = this.blockValue;
    if (!identifier) return;

    try {
      const blocks = await api.get(`/api/cms-blocks?identifier=${identifier}`);
      const block = Array.isArray(blocks) ? blocks[0] : blocks?.member?.[0] ?? blocks?.['hydra:member']?.[0] ?? blocks?.data?.[0];

      if (block?.content) {
        if (this._content) {
          this._content.innerHTML = `<div class="prose prose-sm max-w-none prose-table:w-full prose-th:text-left prose-td:py-2">${block.content}</div>`;
        }
        this._loaded = true;
      } else {
        if (this._content) {
          this._content.innerHTML = '<p class="text-base-content/50 text-center py-8">Size guide not available.</p>';
        }
      }
    } catch {
      if (this._content) {
        this._content.innerHTML = '<p class="text-error text-center py-8">Failed to load size guide. Please try again.</p>';
      }
    }

    if (this._loading) this._loading.style.display = 'none';
  }
}