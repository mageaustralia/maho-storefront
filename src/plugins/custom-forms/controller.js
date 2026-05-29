/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Custom Forms controller. Hydrates a neutral `<div data-maho-form="CODE">`
 * placeholder (emitted into CMS content by the MageAustralia_CustomForms PHP
 * module) into a working form, rendered client-side from the form schema.
 *
 *   GET  /api/custom-forms/{code}              -> { schema, captcha, renderToken }
 *   POST /api/custom-forms/{code}/submissions  -> { status, message, errors }
 *
 * The server re-validates everything (anti-spam, schema); client validation
 * here is UX only. Form elements are created in JS, so the CMS HTML sanitiser
 * (which strips <form>/<input>) never sees anything form-shaped.
 */

import { Controller } from '../../js/stimulus.js';
import { api } from '../../js/api.js';

const CHOICE = ['select', 'radio', 'checkbox', 'multiselect'];
const TEXTY = ['text', 'email', 'phone', 'number'];

export default class CustomFormController extends Controller {
  async connect() {
    if (this._init) return;
    this._init = true;
    this.code = (this.element.dataset.mahoForm || '').trim();
    if (!this.code) return;

    injectStyles();
    this.element.classList.add('cf-sf');
    this.element.innerHTML = '<p class="cf-sf__loading">Loading form...</p>';

    try {
      const data = await api.get(`/api/custom-forms/${encodeURIComponent(this.code)}`);
      this.schema = data.schema || {};
      this.renderToken = data.renderToken || '';
      this.captcha = data.captcha || { required: false };
      this.renderForm();
    } catch (e) {
      this.element.innerHTML = '<p class="cf-sf__error">This form is currently unavailable.</p>';
    }
  }

  renderForm() {
    const fields = Array.isArray(this.schema.fields) ? this.schema.fields : [];

    const form = document.createElement('form');
    form.className = 'cf-sf__form';

    const banner = el('div', 'cf-sf__banner');
    banner.style.display = 'none';
    form.appendChild(banner);

    const grid = el('div', 'cf-sf__grid');
    fields.forEach((f) => {
      const row = this.renderField(f);
      if (row) grid.appendChild(row);
    });
    form.appendChild(grid);

    // Honeypot: hidden field bots fill, humans never see.
    const hp = document.createElement('input');
    hp.type = 'text';
    hp.name = '_hp';
    hp.tabIndex = -1;
    hp.autocomplete = 'off';
    hp.setAttribute('aria-hidden', 'true');
    hp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
    form.appendChild(hp);

    const actions = el('div', 'cf-sf__actions');
    const btn = document.createElement('button');
    btn.type = 'submit';
    // Use the storefront's DaisyUI button classes so it matches the theme.
    btn.className = 'btn btn-primary cf-sf__submit';
    btn.textContent = 'Submit';
    actions.appendChild(btn);
    form.appendChild(actions);

    form.addEventListener('submit', (e) => this.submit(e, form, banner, btn, hp));

    this.element.innerHTML = '';
    this.element.appendChild(form);
    this.form = form;
    this.applyConditional();
  }

  renderField(f) {
    const type = f.type || 'text';
    const key = f.key || '';
    if (!key && type !== 'heading') return null;

    const wrap = el('div', `cf-sf__field cf-sf__field--${widthClass(f.width)}`);
    wrap.dataset.key = key;

    if (type === 'heading') {
      wrap.appendChild(el('h3', 'cf-sf__heading', f.label || ''));
      return wrap;
    }

    const id = `cf-${this.code}-${key}`;
    const label = el('label', 'cf-sf__label', f.label || key);
    label.htmlFor = id;
    if (f.required) {
      const star = el('span', 'cf-sf__req', ' *');
      star.setAttribute('aria-hidden', 'true');
      label.appendChild(star);
    }
    wrap.appendChild(label);

    let control;
    if (type === 'textarea') {
      control = document.createElement('textarea');
    } else if (type === 'select' || type === 'multiselect') {
      control = document.createElement('select');
      if (type === 'multiselect') control.multiple = true;
      else control.appendChild(opt('', f.placeholder || 'Please select'));
      (f.options || []).forEach((o) => control.appendChild(opt(o.value ?? '', o.label ?? o.value ?? '')));
    } else if (type === 'radio' || type === 'checkbox') {
      control = el('div', 'cf-sf__choices');
      (f.options || []).forEach((o, i) => {
        const cid = `${id}-${i}`;
        const c = el('label', 'cf-sf__choice');
        const inp = document.createElement('input');
        inp.type = type === 'radio' ? 'radio' : 'checkbox';
        inp.name = type === 'radio' ? key : `${key}[]`;
        inp.value = o.value ?? '';
        inp.id = cid;
        c.appendChild(inp);
        c.appendChild(document.createTextNode(' ' + (o.label ?? o.value ?? '')));
        control.appendChild(c);
      });
    } else if (type === 'file') {
      control = document.createElement('input');
      control.type = 'file';
    } else {
      control = document.createElement('input');
      control.type = type === 'email' ? 'email' : type === 'number' ? 'number' : type === 'phone' ? 'tel' : 'text';
    }

    // Common attributes (HTML5 progressive enhancement; server is authoritative).
    if (control.tagName === 'INPUT' || control.tagName === 'TEXTAREA' || control.tagName === 'SELECT') {
      control.id = id;
      if (control.tagName !== 'SELECT' || !control.multiple) control.name = key;
      else control.name = `${key}[]`;
      if (control.tagName !== 'DIV') control.classList.add('cf-sf__control');
      if (f.required) control.required = true;
      if (f.placeholder && (control.tagName === 'INPUT' || control.tagName === 'TEXTAREA')) control.placeholder = f.placeholder;
      const v = f.validate || {};
      if (v.minLength != null) control.minLength = v.minLength;
      if (v.maxLength != null) control.maxLength = v.maxLength;
      if (v.pattern && type !== 'number' && control.tagName === 'INPUT') control.pattern = v.pattern;
    } else {
      control.classList.add('cf-sf__control');
    }
    wrap.appendChild(control);

    const err = el('div', 'cf-sf__field-error');
    err.style.display = 'none';
    wrap.appendChild(err);
    return wrap;
  }

  // Reactive showIf: hide fields until their condition is met.
  applyConditional() {
    const fields = Array.isArray(this.schema.fields) ? this.schema.fields : [];
    const conds = fields.filter((f) => f.showIf && f.showIf.field);
    if (!conds.length) return;
    const evalAll = () => {
      conds.forEach((f) => {
        const row = this.form.querySelector(`[data-key="${cssEsc(f.key)}"]`);
        if (!row) return;
        const val = this.valueOf(f.showIf.field);
        const show = f.showIf.eq == null || f.showIf.eq === '' ? !!val : String(val) === String(f.showIf.eq);
        row.style.display = show ? '' : 'none';
      });
    };
    this.form.addEventListener('change', evalAll);
    this.form.addEventListener('input', evalAll);
    evalAll();
  }

  valueOf(key) {
    const els = this.form.querySelectorAll(`[name="${cssEsc(key)}"],[name="${cssEsc(key)}[]"]`);
    if (!els.length) return '';
    const first = els[0];
    if (first.type === 'checkbox' || first.type === 'radio') {
      const checked = Array.from(els).filter((e) => e.checked).map((e) => e.value);
      return checked.length ? checked[0] : '';
    }
    return first.value;
  }

  collect() {
    const payload = {};
    const fields = Array.isArray(this.schema.fields) ? this.schema.fields : [];
    fields.forEach((f) => {
      const key = f.key;
      if (!key || f.type === 'heading') return;
      if (f.type === 'multiselect') {
        const sel = this.form.querySelector(`select[name="${cssEsc(key)}[]"]`);
        payload[key] = sel ? Array.from(sel.selectedOptions).map((o) => o.value) : [];
      } else if (f.type === 'checkbox') {
        const boxes = this.form.querySelectorAll(`input[name="${cssEsc(key)}[]"]:checked`);
        payload[key] = Array.from(boxes).map((b) => b.value);
      } else if (f.type === 'radio') {
        const r = this.form.querySelector(`input[name="${cssEsc(key)}"]:checked`);
        payload[key] = r ? r.value : '';
      } else if (f.type !== 'file') {
        const c = this.form.querySelector(`[name="${cssEsc(key)}"]`);
        payload[key] = c ? c.value : '';
      }
    });
    return payload;
  }

  async submit(e, form, banner, btn, hp) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    this.clearErrors(form, banner);

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Sending...';

    const body = {
      payload: this.collect(),
      renderToken: this.renderToken,
      hp: hp.value || '',
    };
    const altcha = form.querySelector('[name="altcha"]');
    if (altcha) body.captchaToken = altcha.value || '';

    try {
      const res = await api.post(`/api/custom-forms/${encodeURIComponent(this.code)}/submissions`, body);
      const data = await res.json().catch(() => ({}));

      if (res.status === 429) return this.showBanner(banner, 'error', data.message || 'Too many submissions. Please try again later.');
      if (res.status === 413) return this.showBanner(banner, 'error', data.message || 'Your submission is too large.');

      if (data.status === 'ok') {
        this.element.innerHTML = `<div class="cf-sf__success">${escapeHtml(data.message || 'Thank you. Your submission has been received.')}</div>`;
        return;
      }
      if (data.status === 'invalid' && data.errors) {
        this.showFieldErrors(form, data.errors);
        return this.showBanner(banner, 'error', data.message || 'Please correct the highlighted fields.');
      }
      if (data.status === 'expired') {
        // Token aged out (e.g. page open a long time / heavily cached): refresh it.
        try {
          const fresh = await api.get(`/api/custom-forms/${encodeURIComponent(this.code)}`);
          this.renderToken = fresh.renderToken || this.renderToken;
        } catch (_) {}
        return this.showBanner(banner, 'error', data.message || 'Please try again.');
      }
      this.showBanner(banner, 'error', data.message || 'Submission failed. Please try again.');
    } catch (err) {
      this.showBanner(banner, 'error', 'Submission failed. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  showBanner(banner, kind, msg) {
    banner.className = `cf-sf__banner cf-sf__banner--${kind}`;
    banner.textContent = msg;
    banner.style.display = '';
  }

  clearErrors(form, banner) {
    banner.style.display = 'none';
    form.querySelectorAll('.cf-sf__field-error').forEach((e) => { e.style.display = 'none'; e.textContent = ''; });
    form.querySelectorAll('.cf-sf__field--error').forEach((e) => e.classList.remove('cf-sf__field--error'));
  }

  showFieldErrors(form, errors) {
    Object.entries(errors).forEach(([key, msg]) => {
      const row = form.querySelector(`[data-key="${cssEsc(key)}"]`);
      if (!row) return;
      row.classList.add('cf-sf__field--error');
      const err = row.querySelector('.cf-sf__field-error');
      if (err) { err.textContent = msg; err.style.display = ''; }
    });
  }
}

/* ---------- helpers ---------- */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function opt(value, label) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  return o;
}
function widthClass(w) {
  return w === 'half' ? 'half' : w === 'third' ? 'third' : 'full';
}
function cssEsc(s) {
  return String(s).replace(/["\\]/g, '\\$&');
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let _styled = false;
function injectStyles() {
  if (_styled || document.getElementById('cf-sf-styles')) { _styled = true; return; }
  _styled = true;
  const s = document.createElement('style');
  s.id = 'cf-sf-styles';
  s.textContent = `
.cf-sf__grid{display:flex;flex-wrap:wrap;gap:16px;margin:0 0 16px}
.cf-sf__field{display:flex;flex-direction:column;gap:5px;flex:1 1 100%;min-width:0}
.cf-sf__field--half{flex:1 1 calc(50% - 8px)}
.cf-sf__field--third{flex:1 1 calc(33.333% - 11px)}
.cf-sf__label{font-weight:600}
.cf-sf__req{color:#c00}
.cf-sf__control{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #c4c4c4;border-radius:4px}
textarea.cf-sf__control{min-height:96px}
select.cf-sf__control{height:auto;line-height:1.4}
.cf-sf__choices{display:flex;flex-direction:column;gap:6px}
.cf-sf__choice{font-weight:400;display:inline-flex;align-items:center;gap:6px}
.cf-sf__heading{margin:6px 0;border-bottom:1px solid #e2e2e5;padding-bottom:4px}
.cf-sf__field--error .cf-sf__control{border-color:#c00}
.cf-sf__field-error{color:#c00;font-size:.85em}
.cf-sf__banner{padding:12px 14px;border-radius:4px;margin-bottom:14px}
.cf-sf__banner--error{background:#fdecea;border:1px solid #f5c6cb;color:#7a1b1b}
.cf-sf__success{padding:12px 14px;background:#e7f6e7;border:1px solid #b7dfb7;border-radius:4px}
.cf-sf__loading,.cf-sf__error{color:#888}
`;
  document.head.appendChild(s);
}
