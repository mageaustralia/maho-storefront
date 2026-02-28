/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';

export default class HomeCarouselController extends Controller {
  connect() {
    // Find the slideshow container inside CMS content
    const slideshow = this.element.querySelector('.slideshow');
    if (!slideshow) return;
    const slider = slideshow.querySelector('ul');
    if (!slider) return;

    this._slideshow = slideshow;
    this._slides = Array.from(slider.querySelectorAll(':scope > li'));
    if (this._slides.length <= 1) {
      // Only one or no slides — just show it, no carousel needed
      if (this._slides.length === 1) this._slides[0].classList.add('active');
      return;
    }

    this._current = 0;
    this._auto = null;

    // Show the first slide
    this._slides[0].classList.add('active');

    // Add prev/next arrows
    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-arrow carousel-arrow-prev';
    prevBtn.setAttribute('aria-label', 'Previous slide');
    prevBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
    prevBtn.addEventListener('click', () => this.prev());

    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-arrow carousel-arrow-next';
    nextBtn.setAttribute('aria-label', 'Next slide');
    nextBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
    nextBtn.addEventListener('click', () => this.next());

    slideshow.appendChild(prevBtn);
    slideshow.appendChild(nextBtn);

    // Add dots
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel-dots';
    this._dots = [];
    this._slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = `carousel-dot${i === 0 ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => this.goTo(i));
      dotsContainer.appendChild(dot);
      this._dots.push(dot);
    });
    slideshow.parentNode.insertBefore(dotsContainer, slideshow.nextSibling);

    // Keyboard navigation (left/right arrows)
    this._onKeydown = (e) => {
      if (e.key === 'ArrowLeft') { this.prev(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { this.next(); e.preventDefault(); }
    };
    this.element.setAttribute('tabindex', '0');
    this.element.addEventListener('keydown', this._onKeydown);

    // Touch/swipe support
    this._onTouchStart = (e) => { this._touchStartX = e.touches[0].clientX; };
    this._onTouchEnd = (e) => {
      if (this._touchStartX == null) return;
      const diff = this._touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { diff > 0 ? this.next() : this.prev(); }
      this._touchStartX = null;
    };
    slideshow.addEventListener('touchstart', this._onTouchStart, { passive: true });
    slideshow.addEventListener('touchend', this._onTouchEnd, { passive: true });

    // Pause auto-advance on hover/focus
    this._onPause = () => this._stopAuto();
    this._onResume = () => this._startAuto();
    this.element.addEventListener('mouseenter', this._onPause);
    this.element.addEventListener('mouseleave', this._onResume);
    this.element.addEventListener('focusin', this._onPause);
    this.element.addEventListener('focusout', this._onResume);

    // Auto-advance every 5s
    this._startAuto();
  }

  disconnect() {
    this._stopAuto();
    if (this._onKeydown) this.element.removeEventListener('keydown', this._onKeydown);
    if (this._slideshow) {
      this._slideshow.removeEventListener('touchstart', this._onTouchStart);
      this._slideshow.removeEventListener('touchend', this._onTouchEnd);
    }
    this.element.removeEventListener('mouseenter', this._onPause);
    this.element.removeEventListener('mouseleave', this._onResume);
    this.element.removeEventListener('focusin', this._onPause);
    this.element.removeEventListener('focusout', this._onResume);
  }

  _startAuto() {
    this._stopAuto();
    this._auto = setInterval(() => this.next(), 5000);
  }

  _stopAuto() {
    if (this._auto) { clearInterval(this._auto); this._auto = null; }
  }

  goTo(index) {
    if (index === this._current) return;
    this._slides[this._current].classList.remove('active');
    if (this._dots[this._current]) this._dots[this._current].classList.remove('active');
    this._current = index;
    this._slides[this._current].classList.add('active');
    if (this._dots[this._current]) this._dots[this._current].classList.add('active');
    this._startAuto();
  }

  next() {
    this.goTo((this._current + 1) % this._slides.length);
  }

  prev() {
    this.goTo((this._current - 1 + this._slides.length) % this._slides.length);
  }
}