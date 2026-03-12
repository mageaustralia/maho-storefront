/**
 * Maho Storefront — Embeddable Widget
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/** Shadow DOM styles for product cards */
export const cardStyles = `
:host {
  display: block;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --maho-accent: #2563eb;
  --maho-accent-hover: #1d4ed8;
  --maho-text: #1f2937;
  --maho-text-muted: #6b7280;
  --maho-bg: #ffffff;
  --maho-border: #e5e7eb;
  --maho-radius: 8px;
  --maho-success: #16a34a;
  --maho-error: #dc2626;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.maho-card {
  background: var(--maho-bg);
  border: 1px solid var(--maho-border);
  border-radius: var(--maho-radius);
  overflow: hidden;
  transition: box-shadow 0.2s;
  cursor: pointer;
}
.maho-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.maho-card-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  background: #f9fafb;
  display: block;
}
.maho-card-body {
  padding: 12px;
}
.maho-card-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--maho-text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}
.maho-card-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--maho-text);
}
.maho-card-price-old {
  font-size: 13px;
  font-weight: 400;
  color: var(--maho-text-muted);
  text-decoration: line-through;
  margin-left: 6px;
}
.maho-card-btn {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 8px 16px;
  background: var(--maho-accent);
  color: #fff;
  border: none;
  border-radius: var(--maho-radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  text-align: center;
}
.maho-card-btn:hover {
  background: var(--maho-accent-hover);
}
.maho-card-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.maho-card-out {
  font-size: 12px;
  color: var(--maho-error);
  margin-top: 6px;
  text-align: center;
}
`;

/** Lightbox overlay styles */
export const lightboxStyles = `
:host {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --maho-accent: #2563eb;
  --maho-accent-hover: #1d4ed8;
  --maho-text: #1f2937;
  --maho-text-muted: #6b7280;
  --maho-bg: #ffffff;
  --maho-border: #e5e7eb;
  --maho-radius: 8px;
  --maho-success: #16a34a;
  --maho-error: #dc2626;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.maho-overlay {
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: maho-fade-in 0.2s ease;
}
@keyframes maho-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes maho-slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.maho-lightbox {
  background: var(--maho-bg);
  border-radius: 12px;
  width: 90vw;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: maho-slide-up 0.25s ease;
}
@media (max-width: 640px) {
  .maho-lightbox {
    width: 100vw;
    max-width: 100vw;
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
  }
}
.maho-lb-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0,0,0,0.06);
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--maho-text-muted);
  z-index: 2;
  transition: background 0.15s;
}
.maho-lb-close:hover {
  background: rgba(0,0,0,0.12);
}
.maho-lb-image {
  max-width: 360px;
  max-height: 360px;
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  background: #f9fafb;
  display: block;
  margin: 0 auto;
}
.maho-lb-gallery {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  overflow-x: auto;
}
.maho-lb-thumb {
  width: 52px;
  height: 52px;
  object-fit: contain;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  background: #f9fafb;
  flex-shrink: 0;
}
.maho-lb-thumb.active {
  border-color: var(--maho-accent);
}
.maho-lb-body {
  padding: 16px;
}
.maho-lb-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--maho-text);
  line-height: 1.3;
  margin-bottom: 8px;
}
.maho-lb-price {
  font-size: 22px;
  font-weight: 700;
  color: var(--maho-text);
  margin-bottom: 4px;
}
.maho-lb-price-old {
  font-size: 15px;
  font-weight: 400;
  color: var(--maho-text-muted);
  text-decoration: line-through;
  margin-left: 8px;
}
.maho-lb-desc {
  font-size: 14px;
  color: var(--maho-text-muted);
  line-height: 1.5;
  margin-bottom: 16px;
}
.maho-lb-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}
.maho-lb-option-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--maho-text);
  margin-bottom: 4px;
}
.maho-lb-option-values {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.maho-lb-swatch {
  padding: 6px 14px;
  border: 1px solid var(--maho-border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--maho-bg);
  cursor: pointer;
  transition: all 0.15s;
  color: var(--maho-text);
}
.maho-lb-swatch:hover {
  border-color: var(--maho-accent);
}
.maho-lb-swatch.selected {
  border-color: var(--maho-accent);
  background: #eff6ff;
  color: var(--maho-accent);
  font-weight: 600;
}
.maho-lb-swatch.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  text-decoration: line-through;
}
.maho-lb-qty {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.maho-lb-qty label {
  font-size: 13px;
  font-weight: 600;
  color: var(--maho-text);
}
.maho-lb-qty input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid var(--maho-border);
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}
.maho-lb-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--maho-border);
}
.maho-lb-add {
  width: 100%;
  padding: 12px;
  background: var(--maho-accent);
  color: #fff;
  border: none;
  border-radius: var(--maho-radius);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.maho-lb-add:hover {
  background: var(--maho-accent-hover);
}
.maho-lb-add:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.maho-lb-checkout {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: var(--maho-accent);
  border: 1px solid var(--maho-accent);
  border-radius: var(--maho-radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  text-align: center;
  display: none;
}
.maho-lb-checkout:hover {
  background: #eff6ff;
}
.maho-lb-checkout.visible {
  display: block;
}
.maho-lb-error {
  font-size: 13px;
  color: var(--maho-error);
  margin-top: 8px;
  display: none;
}
.maho-lb-error.visible {
  display: block;
}
.maho-lb-success {
  font-size: 13px;
  color: var(--maho-success);
  margin-top: 8px;
  display: none;
}
.maho-lb-success.visible {
  display: block;
}

/* Checkout flow steps */
.maho-co-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  padding-right: 52px;
  border-bottom: 1px solid var(--maho-border);
  position: relative;
}
.maho-co-back {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0,0,0,0.06);
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--maho-text-muted);
  flex-shrink: 0;
}
.maho-co-back:hover { background: rgba(0,0,0,0.12); }
.maho-co-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--maho-text);
  flex: 1;
}
.maho-co-steps {
  display: flex;
  gap: 4px;
}
.maho-co-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--maho-border);
}
.maho-co-dot.active { background: var(--maho-accent); }
.maho-co-dot.done { background: var(--maho-success); }

.maho-co-body {
  padding: 16px;
}
.maho-co-body fieldset {
  border: none;
  padding: 0;
  margin: 0 0 12px;
}
.maho-co-body legend, .maho-co-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--maho-text-muted);
  margin-bottom: 4px;
  display: block;
}
.maho-co-input, .maho-co-select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--maho-border);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  color: var(--maho-text);
  background: var(--maho-bg);
  outline: none;
  transition: border-color 0.15s;
}
.maho-co-input:focus, .maho-co-select:focus {
  border-color: var(--maho-accent);
}
.maho-co-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.maho-co-actions {
  padding: 16px;
  border-top: 1px solid var(--maho-border);
}
.maho-co-btn {
  width: 100%;
  padding: 12px;
  background: var(--maho-accent);
  color: #fff;
  border: none;
  border-radius: var(--maho-radius);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.maho-co-btn:hover { background: var(--maho-accent-hover); }
.maho-co-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.maho-co-error {
  font-size: 13px;
  color: var(--maho-error);
  margin-top: 8px;
  display: none;
}
.maho-co-error.visible { display: block; }

/* Shipping method radio list */
.maho-co-methods {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.maho-co-method {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--maho-border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.maho-co-method:hover { border-color: var(--maho-accent); }
.maho-co-method.selected { border-color: var(--maho-accent); background: #eff6ff; }
.maho-co-method input { accent-color: var(--maho-accent); }
.maho-co-method-info { flex: 1; }
.maho-co-method-title { font-size: 14px; font-weight: 500; color: var(--maho-text); }
.maho-co-method-price { font-size: 14px; font-weight: 600; color: var(--maho-text); white-space: nowrap; }

/* Payment */
.maho-co-stripe-card {
  padding: 10px 12px;
  border: 1px solid var(--maho-border);
  border-radius: 6px;
  background: var(--maho-bg);
  margin-bottom: 12px;
  min-height: 44px;
}
.maho-co-stripe-card.StripeElement--focus { border-color: var(--maho-accent); }

/* Cart summary in checkout */
.maho-co-summary {
  margin-bottom: 16px;
}
.maho-co-item {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--maho-border);
}
.maho-co-item:last-child { border-bottom: none; }
.maho-co-item-thumb {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 4px;
  background: #f9fafb;
  flex-shrink: 0;
}
.maho-co-item-info { flex: 1; min-width: 0; }
.maho-co-item-name { font-size: 13px; font-weight: 500; color: var(--maho-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.maho-co-item-meta { font-size: 12px; color: var(--maho-text-muted); }
.maho-co-item-price { font-size: 13px; font-weight: 600; color: var(--maho-text); white-space: nowrap; }
.maho-co-totals {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  font-size: 13px;
}
.maho-co-total-row { display: flex; justify-content: space-between; }
.maho-co-total-row.grand { font-weight: 700; font-size: 15px; padding-top: 6px; border-top: 1px solid var(--maho-border); }

/* Order confirmation */
.maho-co-confirm {
  text-align: center;
  padding: 32px 16px;
}
.maho-co-confirm-icon {
  width: 64px;
  height: 64px;
  background: #dcfce7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.maho-co-confirm-icon svg { width: 32px; height: 32px; color: var(--maho-success); }
.maho-co-confirm h3 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: var(--maho-text); }
.maho-co-confirm p { font-size: 14px; color: var(--maho-text-muted); line-height: 1.5; }
.maho-co-confirm .order-id { font-weight: 600; color: var(--maho-text); }

/* Cart badge */
.maho-cart-badge {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999998;
  background: var(--maho-accent);
  color: #fff;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.15s;
}
.maho-cart-badge:hover {
  transform: scale(1.08);
}
.maho-cart-badge.visible {
  display: flex;
}
.maho-cart-badge svg {
  width: 24px;
  height: 24px;
}
.maho-cart-count {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--maho-error);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
`;
