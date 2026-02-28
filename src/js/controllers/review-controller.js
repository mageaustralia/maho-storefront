/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';

export default class ReviewController extends Controller {
  static targets = ['list', 'loading', 'formWrap', 'ratingPicker', 'ratingInput',
                     'nickname', 'title', 'detail', 'submitBtn', 'message', 'pagination'];
  static values = { productId: Number, reviewCount: Number };

  connect() {
    this._page = 1;
    this._perPage = 5;
    this._rating = 0;
    if (this.reviewCountValue > 0) {
      this.loadReviews();
    } else {
      if (this.hasLoadingTarget) this.loadingTarget.style.display = 'none';
    }
  }

  async loadReviews() {
    try {
      let url = `${api.url()}/api/products/${this.productIdValue}/reviews?page=${this._page}&itemsPerPage=${this._perPage}`;
      const storeCode = window.MAHO_STORE_CODE;
      if (storeCode) url += `&store=${storeCode}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/ld+json' } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      this._renderReviews(data.member || [], data.totalItems || 0);
    } catch {
      if (this.hasLoadingTarget) this.loadingTarget.textContent = 'Unable to load reviews.';
    }
  }

  _renderReviews(reviews, totalItems) {
    if (this.hasLoadingTarget) this.loadingTarget.style.display = 'none';

    if (reviews.length === 0) {
      this.listTarget.innerHTML = '<p class="review-empty">No reviews yet. Be the first to share your thoughts!</p>';
      if (this.hasPaginationTarget) this.paginationTarget.style.display = 'none';
      return;
    }

    const html = reviews.map(r => {
      const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      return `<div class="review-card">
        <div class="review-card-header">
          <span class="stars" style="--rating: ${r.rating}">★★★★★</span>
          <span class="review-card-date">${escapeHtml(date)}</span>
        </div>
        <div class="review-card-title">${escapeHtml(r.title)}</div>
        <div class="review-card-detail">${escapeHtml(r.detail)}</div>
        <div class="review-card-author">— ${escapeHtml(r.nickname)}</div>
      </div>`;
    }).join('');

    this.listTarget.innerHTML = html;

    // Pagination
    const totalPages = Math.ceil(totalItems / this._perPage);
    if (totalPages > 1 && this.hasPaginationTarget) {
      this.paginationTarget.style.display = 'flex';
      const prevDisabled = this._page <= 1 ? 'disabled' : '';
      const nextDisabled = this._page >= totalPages ? 'disabled' : '';
      this.paginationTarget.innerHTML = `
        <button class="btn btn-secondary btn-sm" data-action="review#prevPage" ${prevDisabled}>← Previous</button>
        <span class="review-pagination-info">Page ${this._page} of ${totalPages}</span>
        <button class="btn btn-secondary btn-sm" data-action="review#nextPage" ${nextDisabled}>Next →</button>
      `;
    } else if (this.hasPaginationTarget) {
      this.paginationTarget.style.display = 'none';
    }
  }

  prevPage() {
    if (this._page > 1) {
      this._page--;
      this.loadReviews();
    }
  }

  nextPage() {
    this._page++;
    this.loadReviews();
  }

  toggleForm() {
    if (!this.hasFormWrapTarget) return;
    const isHidden = this.formWrapTarget.style.display === 'none';
    if (isHidden) {
      // Check if user is logged in
      const token = localStorage.getItem('maho_token');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      this.formWrapTarget.style.display = 'block';
      this.formWrapTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      this.formWrapTarget.style.display = 'none';
    }
  }

  setRating(e) {
    const btn = e.currentTarget;
    const rating = parseInt(btn.dataset.rating, 10);
    this._rating = rating;
    if (this.hasRatingInputTarget) this.ratingInputTarget.value = String(rating);

    // Highlight stars
    const buttons = this.ratingPickerTarget.querySelectorAll('.rating-stars-input button');
    buttons.forEach((b, i) => {
      b.classList.toggle('active', i < rating);
    });
  }

  async submit(e) {
    e.preventDefault();
    if (this.hasMessageTarget) {
      this.messageTarget.textContent = '';
      this.messageTarget.className = 'review-form-message';
    }

    if (this._rating < 1) {
      if (this.hasMessageTarget) {
        this.messageTarget.textContent = 'Please select a star rating.';
        this.messageTarget.className = 'review-form-message error';
      }
      return;
    }

    const body = {
      title: this.titleTarget.value.trim(),
      detail: this.detailTarget.value.trim(),
      nickname: this.nicknameTarget.value.trim(),
      rating: this._rating,
    };

    if (!body.title || !body.detail || !body.nickname) return;

    const btn = this.submitBtnTarget;
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      const res = await api.post(`/api/products/${this.productIdValue}/reviews`, body);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err['hydra:description'] || err.detail || err.message || 'Failed to submit review');
      }

      if (this.hasMessageTarget) {
        this.messageTarget.textContent = 'Thank you! Your review is pending approval.';
        this.messageTarget.className = 'review-form-message success';
      }

      // Reset form
      this.titleTarget.value = '';
      this.detailTarget.value = '';
      this.nicknameTarget.value = '';
      this.ratingInputTarget.value = '';
      this._rating = 0;
      this.ratingPickerTarget.querySelectorAll('.rating-stars-input button').forEach(b => b.classList.remove('active'));
    } catch (err) {
      if (this.hasMessageTarget) {
        this.messageTarget.textContent = err.message || 'Something went wrong. Please try again.';
        this.messageTarget.className = 'review-form-message error';
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Review';
    }
  }
}