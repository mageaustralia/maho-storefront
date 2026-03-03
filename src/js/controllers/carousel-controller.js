/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';

/**
 * Generic DaisyUI carousel controller.
 *
 * Works with DaisyUI v5 carousel HTML (prev/next arrows + dots as anchor links
 * inside .carousel-item elements). CSS scroll-snap handles touch/swipe natively.
 *
 * This controller adds:
 * - Intercepts anchor clicks to prevent page scroll (scrolls carousel only)
 * - IntersectionObserver to track visible slide and update dot active state
 * - Autoplay (reads data-autoplay="ms" from .carousel element)
 * - Pause on hover/focus, keyboard navigation
 *
 * Uses event delegation so it survives freshness controller HTML replacement.
 */
export default class CarouselController extends Controller {
  connect() {
    this._carousel = this.element.querySelector('.carousel');
    if (!this._carousel) return;

    this._current = 0;
    this._auto = null;

    // Delegated click handler on the root element — survives innerHTML replacement
    this._onClick = (e) => {
      const anchor = e.target.closest('a[href^="#slide-"], a.carousel-dot');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const target = this._carousel.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const items = this._getItems();
      const idx = items.indexOf(target);
      if (idx !== -1) this._goTo(idx);
    };
    this.element.addEventListener('click', this._onClick);

    // Track visible slide via IntersectionObserver
    this._setupObserver();

    // Autoplay from data-autoplay attribute (ms)
    const autoplayMs = parseInt(this._carousel.dataset.autoplay, 10);
    this._autoplayMs = autoplayMs > 0 ? autoplayMs : 0;

    // Pause on hover/focus
    this._onPause = () => this._stopAuto();
    this._onResume = () => this._startAuto();
    this.element.addEventListener('mouseenter', this._onPause);
    this.element.addEventListener('mouseleave', this._onResume);
    this.element.addEventListener('focusin', this._onPause);
    this.element.addEventListener('focusout', this._onResume);

    // Keyboard navigation
    this._onKeydown = (e) => {
      if (e.key === 'ArrowLeft') { this._advance(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { this._advance(1); e.preventDefault(); }
    };
    this.element.setAttribute('tabindex', '0');
    this.element.addEventListener('keydown', this._onKeydown);

    // Start autoplay
    if (this._autoplayMs) this._startAuto();
  }

  disconnect() {
    this._stopAuto();
    if (this._observer) this._observer.disconnect();
    if (this._onClick) this.element.removeEventListener('click', this._onClick);
    if (this._onKeydown) this.element.removeEventListener('keydown', this._onKeydown);
    this.element.removeEventListener('mouseenter', this._onPause);
    this.element.removeEventListener('mouseleave', this._onResume);
    this.element.removeEventListener('focusin', this._onPause);
    this.element.removeEventListener('focusout', this._onResume);
  }

  _getItems() {
    return Array.from(this._carousel.querySelectorAll('.carousel-item'));
  }

  _setupObserver() {
    if (this._observer) this._observer.disconnect();
    this._observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const items = this._getItems();
            const idx = items.indexOf(entry.target);
            if (idx !== -1 && idx !== this._current) {
              this._current = idx;
              this._updateDots();
            }
          }
        }
      },
      { root: this._carousel, threshold: 0.5 }
    );
    this._getItems().forEach((item) => this._observer.observe(item));
  }

  _advance(direction) {
    const items = this._getItems();
    const next = (this._current + direction + items.length) % items.length;
    this._goTo(next);
  }

  _goTo(index) {
    const items = this._getItems();
    if (!items[index]) return;
    this._carousel.scrollTo({
      left: items[index].offsetLeft,
      behavior: 'smooth',
    });
    this._current = index;
    this._updateDots();
    if (this._autoplayMs) this._startAuto();
  }

  _updateDots() {
    const dots = this.element.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === this._current);
    });
  }

  _startAuto() {
    if (!this._autoplayMs) return;
    this._stopAuto();
    this._auto = setInterval(() => this._advance(1), this._autoplayMs);
  }

  _stopAuto() {
    if (this._auto) { clearInterval(this._auto); this._auto = null; }
  }
}
