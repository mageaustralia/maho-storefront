/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Template Hydration Helper
 *
 * Clones <template> elements and fills data-slot attributes with values.
 * Avoids innerHTML string concatenation in Stimulus controllers so that
 * UnoCSS can scan all classes at build time.
 *
 * Usage:
 *   const el = hydrateTemplate('tpl-cart-item', {
 *     image: item.thumbnailUrl,
 *     name: item.name,
 *     price: formatPrice(item.price),
 *   });
 *   container.appendChild(el);
 */

/**
 * SVG placeholder for products with no image.
 * Light grey background with a simple image icon.
 */
export const PLACEHOLDER_IMAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f5f5f5'/%3E%3Cg transform='translate(200,200)' opacity='0.3'%3E%3Crect x='-40' y='-35' width='80' height='70' rx='6' stroke='%239ca3af' stroke-width='3' fill='none'/%3E%3Ccircle cx='-18' cy='-12' r='8' fill='%239ca3af'/%3E%3Cpath d='M-35 20 L-10-5 L5 10 L15 2 L35 20Z' fill='%239ca3af'/%3E%3C/g%3E%3C/svg%3E`;

/**
 * Clone a <template> element and populate data-slot attributes.
 *
 * Slot filling rules:
 * - IMG tags: sets src + alt attributes
 * - A tags: sets href attribute
 * - Other tags: sets textContent
 *
 * @param {string} templateId - The id of the <template> element (without #)
 * @param {Record<string, string|number|null|undefined>} data - Map of slot names to values
 * @returns {HTMLElement} The cloned and populated element
 */
export function hydrateTemplate(templateId, data = {}) {
  const tpl = document.getElementById(templateId);
  if (!tpl) {
    console.warn(`Template #${templateId} not found`);
    return document.createElement('div');
  }
  const el = tpl.content.cloneNode(true).firstElementChild;
  if (!el) return document.createElement('div');

  for (const [key, val] of Object.entries(data)) {
    const slot = el.querySelector(`[data-slot="${key}"]`);
    if (!slot) continue;

    const tag = slot.tagName;
    if (tag === 'IMG') {
      slot.src = val ? String(val) : PLACEHOLDER_IMAGE;
      continue;
    }
    if (val == null) continue;
    if (tag === 'A') {
      slot.href = String(val);
    } else {
      slot.textContent = String(val);
    }
  }

  return el;
}

/**
 * Set innerHTML on a slot element. Use for formatted content like prices
 * with strikethrough, or options lists.
 *
 * @param {HTMLElement} el - The hydrated element
 * @param {string} slotName - The data-slot name
 * @param {string} html - HTML string to set
 */
export function setSlotHtml(el, slotName, html) {
  const slot = el.querySelector(`[data-slot="${slotName}"]`);
  if (slot) slot.innerHTML = html;
}

/**
 * Show a slot element (remove 'hidden' class).
 * @param {HTMLElement} el - The hydrated element
 * @param {string} slotName - The data-slot name
 */
export function showSlot(el, slotName) {
  const slot = el.querySelector(`[data-slot="${slotName}"]`);
  if (slot) slot.classList.remove('hidden');
}

/**
 * Set attributes on a hydrated template element's slots.
 * Useful for data attributes, aria labels, event handlers etc.
 *
 * @param {HTMLElement} el - The hydrated element
 * @param {Record<string, Record<string, string>>} slotAttrs - Map of slot name → attribute map
 */
export function setSlotAttributes(el, slotAttrs) {
  for (const [slotName, attrs] of Object.entries(slotAttrs)) {
    const selector = `[data-slot="${slotName}"]`;
    const slot = el.matches(selector) ? el : el.querySelector(selector);
    if (!slot) continue;
    for (const [attr, val] of Object.entries(attrs)) {
      slot.setAttribute(attr, val);
    }
  }
}