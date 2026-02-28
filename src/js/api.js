/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Shared API utility for making authenticated requests to the Maho API
 */
export const api = {
  url: () => window.MAHO_API_URL || '',

  headers: (contentType = true) => {
    const h = { 'Accept': 'application/ld+json' };
    if (contentType) h['Content-Type'] = 'application/ld+json';
    const token = localStorage.getItem('maho_token');
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  },

  _fetch: async (path, options) => {
    // Append store code as query param (avoids CORS preflight issues with custom headers)
    const storeCode = window.MAHO_STORE_CODE;
    if (storeCode) {
      const sep = path.includes('?') ? '&' : '?';
      path = `${path}${sep}store=${storeCode}`;
    }
    const response = await fetch(`${api.url()}${path}`, options);
    // Auto-logout on 401 if we had a token
    if (response.status === 401 && localStorage.getItem('maho_token')) {
      localStorage.removeItem('maho_token');
      localStorage.removeItem('maho_customer');
      document.dispatchEvent(new CustomEvent('auth:changed'));
      // Retry without auth header
      const retryHeaders = { ...options.headers };
      delete retryHeaders['Authorization'];
      return fetch(`${api.url()}${path}`, { ...options, headers: retryHeaders });
    }
    return response;
  },

  get: (path) => api._fetch(path, { headers: api.headers(false), cache: 'no-store' }).then(r => {
    if (!r.ok) {
      const err = new Error(`API ${r.status}`);
      err.status = r.status;
      throw err;
    }
    return r.json();
  }),

  post: (path, body) => api._fetch(path, {
    method: 'POST',
    headers: api.headers(),
    body: JSON.stringify(body)
  }),

  put: (path, body) => api._fetch(path, {
    method: 'PUT',
    headers: api.headers(),
    body: JSON.stringify(body)
  }),

  patch: (path, body) => api._fetch(path, {
    method: 'PATCH',
    headers: { ...api.headers(), 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(body)
  }),

  del: (path) => api._fetch(path, {
    method: 'DELETE',
    headers: api.headers(false)
  }),

  cartId: () => localStorage.getItem('maho_cart_id'),
  setCartId: (id) => { if (id) localStorage.setItem('maho_cart_id', id); },
};