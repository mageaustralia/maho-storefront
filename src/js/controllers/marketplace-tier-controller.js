/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Marketplace license-tier picker. NOT a cart implementation — a thin UI
 * adapter that lets the marketplace detail page expose two visible "Buy
 * single-store" / "Buy unlimited" CTAs while delegating all the actual
 * cart work to the standard product Stimulus controller.
 *
 * Each visible CTA carries `data-link-id="<downloadable_link_id>"`.
 * `pickAndAdd` checks the matching hidden radio in the same product-
 * scoped element and triggers product#stickyAdd via the addButton
 * target, so the cart payload is the same {sku, qty, links: [link_id]}
 * the standard product page produces.
 */
import { Controller } from '../stimulus.js';

export default class extends Controller {
  pickAndAdd(event) {
    event.preventDefault();
    const linkId = event.currentTarget.dataset.linkId;
    const root = this.element.closest('[data-controller~="product"]');
    if (!root) return;
    root.querySelectorAll('[data-download-link-id]').forEach((r) => {
      r.checked = r.dataset.downloadLinkId === linkId;
    });
    const addBtn = root.querySelector('[data-product-target="addButton"]');
    if (addBtn) addBtn.click();
  }
}
