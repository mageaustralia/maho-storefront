/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';
import { api } from '../api.js';
import { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from '../utils.js';

export default class AccountController extends Controller {
  static targets = [
    'guestState', 'authState',
    'avatar', 'nameDisplay', 'emailDisplay',
    'infoPanel', 'addressesPanel', 'ordersPanel',
    'profileFirstName', 'profileLastName', 'profileEmail', 'profileMessage', 'profileBtn',
    'currentPassword', 'newPassword', 'confirmNewPassword', 'passwordMessage', 'passwordBtn',
    'addressFormWrapper', 'addressFormTitle', 'addressId', 'addressMessage', 'addressBtn',
    'addrFirstName', 'addrLastName', 'addrCompany', 'addrStreet', 'addrStreet2',
    'addrCity', 'addrPostcode', 'addrCountry', 'addrRegion', 'addrRegionText', 'addrTelephone',
    'addrDefaultBilling', 'addrDefaultShipping',
    'addressGrid',
    'ordersList', 'orderDetail', 'ordersPagination', 'ordersPageInfo',
    'wishlistPanel', 'wishlistGrid',
    'reviewsPanel', 'reviewsGrid',
  ];
  static values = { countries: String, currency: { type: String, default: 'USD' } };

  connect() {
    this._countries = [];
    this._customer = null;
    this._ordersPage = 1;
    this._ordersTotalPages = 1;

    try { this._countries = JSON.parse(this.countriesValue || '[]'); } catch { this._countries = []; }

    const token = localStorage.getItem('maho_token');
    if (!token) {
      // Show guest state
      if (this.hasGuestStateTarget) this.guestStateTarget.style.display = '';
      if (this.hasAuthStateTarget) this.authStateTarget.style.display = 'none';
      return;
    }

    // Show authenticated state
    if (this.hasGuestStateTarget) this.guestStateTarget.style.display = 'none';
    if (this.hasAuthStateTarget) this.authStateTarget.style.display = '';

    this.loadProfile();

    // Check for tab param in URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'addresses' || tab === 'orders' || tab === 'wishlist' || tab === 'reviews') {
      this._activateTab(tab);
    }

    // Populate country dropdown regions
    this._populateRegions();
  }

  // ---- Profile ----

  async loadProfile() {
    try {
      const data = await api.get('/api/auth/me');
      this._customer = data;
      localStorage.setItem('maho_customer', JSON.stringify({ firstName: data.firstName, lastName: data.lastName, email: data.email }));

      // Update header
      if (this.hasAvatarTarget) this.avatarTarget.textContent = (data.firstName?.[0] || '?').toUpperCase();
      if (this.hasNameDisplayTarget) this.nameDisplayTarget.textContent = `${data.firstName} ${data.lastName}`;
      if (this.hasEmailDisplayTarget) this.emailDisplayTarget.textContent = data.email;

      // Fill profile form
      if (this.hasProfileFirstNameTarget) this.profileFirstNameTarget.value = data.firstName || '';
      if (this.hasProfileLastNameTarget) this.profileLastNameTarget.value = data.lastName || '';
      if (this.hasProfileEmailTarget) this.profileEmailTarget.value = data.email || '';

      // Update auth state in header
      document.dispatchEvent(new CustomEvent('auth:changed'));

      // Load addresses from profile
      if (data.addresses) {
        this._renderAddresses(data.addresses);
      }
    } catch (e) {
      // Token likely expired
      if (e.message?.includes('401') || e.message?.includes('403')) {
        localStorage.removeItem('maho_token');
        localStorage.removeItem('maho_customer');
        document.dispatchEvent(new CustomEvent('auth:changed'));
        window.Turbo?.visit('/login');
      }
    }
  }

  async updateProfile(event) {
    event.preventDefault();
    const firstName = this.hasProfileFirstNameTarget ? this.profileFirstNameTarget.value.trim() : '';
    const lastName = this.hasProfileLastNameTarget ? this.profileLastNameTarget.value.trim() : '';
    const email = this.hasProfileEmailTarget ? this.profileEmailTarget.value.trim() : '';

    if (!firstName || !lastName || !email) {
      this._showMsg('profileMessage', 'Please fill in all fields.', 'error');
      return;
    }

    if (this.hasProfileBtnTarget) { this.profileBtnTarget.disabled = true; this.profileBtnTarget.textContent = 'Saving...'; }

    try {
      const response = await api.put('/api/customers/me', { firstName, lastName, email });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err['hydra:description'] || err.detail || err.message || 'Update failed.');
      }

      // Refresh
      this._showMsg('profileMessage', 'Profile updated successfully.', 'success');
      localStorage.setItem('maho_customer', JSON.stringify({ firstName, lastName, email }));
      if (this.hasNameDisplayTarget) this.nameDisplayTarget.textContent = `${firstName} ${lastName}`;
      if (this.hasEmailDisplayTarget) this.emailDisplayTarget.textContent = email;
      if (this.hasAvatarTarget) this.avatarTarget.textContent = (firstName[0] || '?').toUpperCase();
      document.dispatchEvent(new CustomEvent('auth:changed'));
    } catch (e) {
      this._showMsg('profileMessage', e.message, 'error');
    } finally {
      if (this.hasProfileBtnTarget) { this.profileBtnTarget.disabled = false; this.profileBtnTarget.textContent = 'Save Changes'; }
    }
  }

  async changePassword(event) {
    event.preventDefault();
    const currentPassword = this.hasCurrentPasswordTarget ? this.currentPasswordTarget.value : '';
    const newPassword = this.hasNewPasswordTarget ? this.newPasswordTarget.value : '';
    const confirmNewPassword = this.hasConfirmNewPasswordTarget ? this.confirmNewPasswordTarget.value : '';

    if (!currentPassword || !newPassword) {
      this._showMsg('passwordMessage', 'Please fill in all fields.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      this._showMsg('passwordMessage', 'New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      this._showMsg('passwordMessage', 'Password must be at least 8 characters.', 'error');
      return;
    }

    if (this.hasPasswordBtnTarget) { this.passwordBtnTarget.disabled = true; this.passwordBtnTarget.textContent = 'Updating...'; }

    try {
      const response = await api.post('/api/customers/me/password', { currentPassword, newPassword });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err['hydra:description'] || err.detail || err.message || 'Password change failed.');
      }
      this._showMsg('passwordMessage', 'Password updated successfully.', 'success');
      if (this.hasCurrentPasswordTarget) this.currentPasswordTarget.value = '';
      if (this.hasNewPasswordTarget) this.newPasswordTarget.value = '';
      if (this.hasConfirmNewPasswordTarget) this.confirmNewPasswordTarget.value = '';
    } catch (e) {
      this._showMsg('passwordMessage', e.message, 'error');
    } finally {
      if (this.hasPasswordBtnTarget) { this.passwordBtnTarget.disabled = false; this.passwordBtnTarget.textContent = 'Update Password'; }
    }
  }

  // ---- Addresses ----

  _renderAddresses(addresses) {
    if (!this.hasAddressGridTarget) return;
    if (!addresses || addresses.length === 0) {
      this.addressGridTarget.innerHTML = '<div class="text-center py-8 text-base-content/60"><p>You don\'t have any saved addresses.</p></div>';
      return;
    }
    this.addressGridTarget.innerHTML = addresses.map(addr => {
      const badges = [];
      if (addr.isDefaultBilling) badges.push('Billing');
      if (addr.isDefaultShipping) badges.push('Shipping');
      return `<div class="card bg-base-100 shadow-sm border border-base-200" data-address-id="${addr.id}">
        <div class="card-body p-4 gap-2">
          ${badges.length ? `<div class="flex gap-1.5 mb-1">${badges.map(b => `<span class="badge badge-sm badge-primary">${b}</span>`).join('')}</div>` : ''}
          <p class="font-semibold text-sm">${escapeHtml(addr.firstName)} ${escapeHtml(addr.lastName)}</p>
          <p class="text-sm text-base-content/70 leading-relaxed">
            ${escapeHtml(addr.street || '')}<br>
            ${escapeHtml(addr.city || '')}${addr.region ? ', ' + escapeHtml(typeof addr.region === 'object' ? addr.region.name || '' : addr.region) : ''} ${escapeHtml(addr.postcode || '')}<br>
            ${escapeHtml(addr.countryId || '')}
            ${addr.telephone ? `<br>${escapeHtml(addr.telephone)}` : ''}
          </p>
          <div class="card-actions justify-end mt-2">
            <button class="btn btn-sm btn-ghost" data-action="account#editAddress" data-address-id="${addr.id}">Edit</button>
            <button class="btn btn-sm btn-ghost text-error" data-action="account#deleteAddress" data-address-id="${addr.id}">Delete</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  showAddressForm() {
    if (this.hasAddressFormWrapperTarget) this.addressFormWrapperTarget.style.display = '';
    if (this.hasAddressFormTitleTarget) this.addressFormTitleTarget.textContent = 'Add Address';
    if (this.hasAddressIdTarget) this.addressIdTarget.value = '';
    this._clearAddressForm();
    this._populateRegions();
  }

  hideAddressForm() {
    if (this.hasAddressFormWrapperTarget) this.addressFormWrapperTarget.style.display = 'none';
    this._clearAddressForm();
  }

  _clearAddressForm() {
    ['addrFirstName', 'addrLastName', 'addrCompany', 'addrStreet', 'addrStreet2', 'addrCity', 'addrPostcode', 'addrTelephone'].forEach(f => {
      if (this[`has${f.charAt(0).toUpperCase() + f.slice(1)}Target`]) this[`${f}Target`].value = '';
    });
    if (this.hasAddrDefaultBillingTarget) this.addrDefaultBillingTarget.checked = false;
    if (this.hasAddrDefaultShippingTarget) this.addrDefaultShippingTarget.checked = false;
    this._showMsg('addressMessage', '', '');
  }

  editAddress(event) {
    const addrId = event.currentTarget.dataset.addressId;
    const addr = this._customer?.addresses?.find(a => String(a.id) === String(addrId));
    if (!addr) return;

    this.showAddressForm();
    if (this.hasAddressFormTitleTarget) this.addressFormTitleTarget.textContent = 'Edit Address';
    if (this.hasAddressIdTarget) this.addressIdTarget.value = addr.id;

    if (this.hasAddrFirstNameTarget) this.addrFirstNameTarget.value = addr.firstName || '';
    if (this.hasAddrLastNameTarget) this.addrLastNameTarget.value = addr.lastName || '';
    if (this.hasAddrCompanyTarget) this.addrCompanyTarget.value = addr.company || '';
    // Street can be array or string
    const streetArr = Array.isArray(addr.street) ? addr.street : [addr.street || ''];
    if (this.hasAddrStreetTarget) this.addrStreetTarget.value = streetArr[0] || '';
    if (this.hasAddrStreet2Target) this.addrStreet2Target.value = streetArr[1] || '';
    if (this.hasAddrCityTarget) this.addrCityTarget.value = addr.city || '';
    if (this.hasAddrPostcodeTarget) this.addrPostcodeTarget.value = addr.postcode || '';
    if (this.hasAddrTelephoneTarget) this.addrTelephoneTarget.value = addr.telephone || '';
    if (this.hasAddrCountryTarget) this.addrCountryTarget.value = addr.countryId || 'AU';
    if (this.hasAddrDefaultBillingTarget) this.addrDefaultBillingTarget.checked = !!addr.isDefaultBilling;
    if (this.hasAddrDefaultShippingTarget) this.addrDefaultShippingTarget.checked = !!addr.isDefaultShipping;

    this._populateRegions();
    // Set region after populating
    setTimeout(() => {
      if (addr.regionId && this.hasAddrRegionTarget) this.addrRegionTarget.value = addr.regionId;
      if (addr.region && typeof addr.region === 'string' && this.hasAddrRegionTextTarget) this.addrRegionTextTarget.value = addr.region;
    }, 50);
  }

  async saveAddress(event) {
    event.preventDefault();
    const addrId = this.hasAddressIdTarget ? this.addressIdTarget.value : '';
    // Build street array from street1 + street2
    const street1 = this.hasAddrStreetTarget ? this.addrStreetTarget.value.trim() : '';
    const street2 = this.hasAddrStreet2Target ? this.addrStreet2Target.value.trim() : '';
    const streetArr = street2 ? [street1, street2] : [street1];

    const body = {
      firstName: this.hasAddrFirstNameTarget ? this.addrFirstNameTarget.value.trim() : '',
      lastName: this.hasAddrLastNameTarget ? this.addrLastNameTarget.value.trim() : '',
      company: this.hasAddrCompanyTarget ? this.addrCompanyTarget.value.trim() : null,
      street: streetArr,
      city: this.hasAddrCityTarget ? this.addrCityTarget.value.trim() : '',
      postcode: this.hasAddrPostcodeTarget ? this.addrPostcodeTarget.value.trim() : '',
      countryId: this.hasAddrCountryTarget ? this.addrCountryTarget.value : '',
      telephone: this.hasAddrTelephoneTarget ? this.addrTelephoneTarget.value.trim() : '',
      isDefaultBilling: this.hasAddrDefaultBillingTarget ? this.addrDefaultBillingTarget.checked : false,
      isDefaultShipping: this.hasAddrDefaultShippingTarget ? this.addrDefaultShippingTarget.checked : false,
    };

    // Region
    if (this.hasAddrRegionTarget && this.addrRegionTarget.style.display !== 'none') {
      body.regionId = this.addrRegionTarget.value;
    } else if (this.hasAddrRegionTextTarget) {
      body.region = this.addrRegionTextTarget.value.trim();
    }

    if (!body.firstName || !body.lastName || !street1 || !body.city || !body.postcode || !body.countryId) {
      this._showMsg('addressMessage', 'Please fill in all required fields.', 'error');
      return;
    }

    if (this.hasAddressBtnTarget) { this.addressBtnTarget.disabled = true; this.addressBtnTarget.textContent = 'Saving...'; }

    try {
      let response;
      if (addrId) {
        response = await api.put(`/api/customers/me/addresses/${addrId}`, body);
      } else {
        response = await api.post('/api/customers/me/addresses', body);
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err['hydra:description'] || err.detail || err.message || 'Failed to save address.');
      }

      this.hideAddressForm();
      await this.loadProfile();
    } catch (e) {
      this._showMsg('addressMessage', e.message, 'error');
    } finally {
      if (this.hasAddressBtnTarget) { this.addressBtnTarget.disabled = false; this.addressBtnTarget.textContent = 'Save Address'; }
    }
  }

  async deleteAddress(event) {
    const addrId = event.currentTarget.dataset.addressId;
    if (!confirm('Delete this address?')) return;

    try {
      const response = await api.del(`/api/customers/me/addresses/${addrId}`);
      if (!response.ok) throw new Error('Failed to delete address.');
      await this.loadProfile();
    } catch (e) {
      alert(e.message);
    }
  }

  onCountryChange() {
    this._populateRegions();
  }

  _populateRegions() {
    const countryId = this.hasAddrCountryTarget ? this.addrCountryTarget.value : '';
    const country = this._countries.find(c => c.id === countryId);

    if (country && country.availableRegions && country.availableRegions.length > 0) {
      if (this.hasAddrRegionTarget) {
        this.addrRegionTarget.innerHTML = '<option value="">Select Region</option>' +
          country.availableRegions.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
        this.addrRegionTarget.style.display = '';
      }
      if (this.hasAddrRegionTextTarget) this.addrRegionTextTarget.style.display = 'none';
    } else {
      if (this.hasAddrRegionTarget) this.addrRegionTarget.style.display = 'none';
      if (this.hasAddrRegionTextTarget) this.addrRegionTextTarget.style.display = '';
    }
  }

  // ---- Orders ----

  async loadOrders(page = 1) {
    this._ordersPage = page;
    // Dim existing content instead of replacing (prevents CLS)
    if (this.hasOrdersListTarget) {
      this.ordersListTarget.style.opacity = '0.5';
      this.ordersListTarget.style.pointerEvents = 'none';
    }
    if (this.hasOrderDetailTarget) this.orderDetailTarget.style.display = 'none';

    try {
      const data = await api.get(`/api/customers/me/orders?page=${page}&pageSize=10`);
      const orders = data.orders || data.member || (Array.isArray(data) ? data : []);
      const totalItems = data.total || data.totalItems || orders.length;
      this._ordersTotalPages = Math.ceil(totalItems / 10) || 1;

      if (!orders.length) {
        if (this.hasOrdersListTarget) {
          this.ordersListTarget.innerHTML = '<div class="text-center py-8 text-base-content/60"><p>You haven\'t placed any orders yet.</p></div>';
          this.ordersListTarget.style.opacity = '';
          this.ordersListTarget.style.pointerEvents = '';
        }
        if (this.hasOrdersPaginationTarget) this.ordersPaginationTarget.style.display = 'none';
        return;
      }

      if (this.hasOrdersListTarget) {
        this.ordersListTarget.innerHTML = `<div class="overflow-x-auto"><table class="table table-sm">
          <thead><tr>
            <th>Order #</th>
            <th>Date</th>
            <th>Ship To</th>
            <th>Total</th>
            <th>Status</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${orders.map(o => {
              const statusClass = (o.status || '').toLowerCase().replace(/[^a-z]/g, '');
              const badgeColor = statusClass === 'complete' ? 'badge-success' : statusClass === 'processing' ? 'badge-info' : statusClass === 'pending' ? 'badge-warning' : 'badge-ghost';
              return `<tr class="hover">
                <td><strong>${escapeHtml(o.incrementId || String(o.id))}</strong></td>
                <td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}</td>
                <td>${escapeHtml(o.shippingAddress?.firstName || '')} ${escapeHtml(o.shippingAddress?.lastName || '')}</td>
                <td>${formatPrice(o.grandTotal, this.currencyValue)}</td>
                <td><span class="badge badge-sm ${badgeColor}">${escapeHtml(o.status || '')}</span></td>
                <td><button class="btn btn-xs btn-ghost btn-primary" data-action="account#viewOrder" data-order-id="${o.id}" data-increment-id="${escapeHtml(o.incrementId || '')}">View</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>`;
        this.ordersListTarget.style.opacity = '';
        this.ordersListTarget.style.pointerEvents = '';
      }

      // Pagination
      if (this.hasOrdersPaginationTarget) {
        this.ordersPaginationTarget.style.display = this._ordersTotalPages > 1 ? '' : 'none';
      }
      if (this.hasOrdersPageInfoTarget) {
        this.ordersPageInfoTarget.textContent = `Page ${page} of ${this._ordersTotalPages}`;
      }

      // Cache orders for detail view
      this._orders = orders;
    } catch (e) {
      if (this.hasOrdersListTarget) {
        this.ordersListTarget.innerHTML = '<p class="text-muted">Could not load orders.</p>';
        this.ordersListTarget.style.opacity = '';
        this.ordersListTarget.style.pointerEvents = '';
      }
    }
  }

  prevOrdersPage() {
    if (this._ordersPage > 1) this.loadOrders(this._ordersPage - 1);
  }

  nextOrdersPage() {
    if (this._ordersPage < this._ordersTotalPages) this.loadOrders(this._ordersPage + 1);
  }

  viewOrder(event) {
    const orderId = event.currentTarget.dataset.orderId;
    const incrementId = event.currentTarget.dataset.incrementId;
    const order = this._orders?.find(o => String(o.id) === String(orderId));
    if (!order) return;

    if (this.hasOrdersListTarget) this.ordersListTarget.style.display = 'none';
    if (this.hasOrdersPaginationTarget) this.ordersPaginationTarget.style.display = 'none';

    if (this.hasOrderDetailTarget) {
      const items = order.items || [];
      const statusClass = (order.status || '').toLowerCase().replace(/[^a-z]/g, '');
      const badgeColor = statusClass === 'complete' ? 'badge-success' : statusClass === 'processing' ? 'badge-info' : statusClass === 'pending' ? 'badge-warning' : 'badge-ghost';
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

      this.orderDetailTarget.innerHTML = `
        <button class="btn btn-sm btn-outline gap-1 mb-5" data-action="account#backToOrders">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3L5 8l5 5"/></svg>
          Back to Orders
        </button>

        <div class="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h3 class="text-xl font-bold">Order #${escapeHtml(incrementId || String(order.id))}</h3>
            ${orderDate ? `<p class="text-sm text-base-content/50 mt-0.5">Placed on ${orderDate}</p>` : ''}
          </div>
          <div class="flex items-center gap-2">
            <span class="badge ${badgeColor}">${escapeHtml(order.status || '')}</span>
            <button class="btn btn-sm btn-outline" data-action="account#reorder" data-order-id="${order.id}">Reorder</button>
          </div>
        </div>

        <div class="flex flex-col gap-5">
          ${order.shippingAddress || order.billingAddress ? `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${order.billingAddress ? `<div class="border border-base-200 rounded-lg p-4">
              <h5 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-2">Billing Address</h5>
              <p class="text-sm leading-relaxed">${escapeHtml(order.billingAddress.firstName || '')} ${escapeHtml(order.billingAddress.lastName || '')}<br>
              ${escapeHtml(order.billingAddress.street || '')}<br>
              ${escapeHtml(order.billingAddress.city || '')}${order.billingAddress.region ? ', ' + escapeHtml(typeof order.billingAddress.region === 'object' ? order.billingAddress.region.name || '' : order.billingAddress.region) : ''} ${escapeHtml(order.billingAddress.postcode || '')}<br>
              ${escapeHtml(order.billingAddress.countryId || '')}</p>
            </div>` : ''}
            ${order.shippingAddress ? `<div class="border border-base-200 rounded-lg p-4">
              <h5 class="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-2">Shipping Address</h5>
              <p class="text-sm leading-relaxed">${escapeHtml(order.shippingAddress.firstName || '')} ${escapeHtml(order.shippingAddress.lastName || '')}<br>
              ${escapeHtml(order.shippingAddress.street || '')}<br>
              ${escapeHtml(order.shippingAddress.city || '')}${order.shippingAddress.region ? ', ' + escapeHtml(typeof order.shippingAddress.region === 'object' ? order.shippingAddress.region.name || '' : order.shippingAddress.region) : ''} ${escapeHtml(order.shippingAddress.postcode || '')}<br>
              ${escapeHtml(order.shippingAddress.countryId || '')}</p>
            </div>` : ''}
          </div>` : ''}

          <div class="border border-base-200 rounded-lg overflow-hidden">
            <div class="overflow-x-auto"><table class="table table-sm">
              <thead class="bg-base-200/50"><tr><th>Product</th><th>SKU</th><th class="text-center">Qty</th><th class="text-right">Price</th></tr></thead>
              <tbody>
                ${items.map(item => `<tr>
                  <td class="font-medium">${escapeHtml(item.name || '')}</td>
                  <td class="text-base-content/50 text-xs font-mono">${escapeHtml(item.sku || '')}</td>
                  <td class="text-center">${item.qtyOrdered || item.qty || 0}</td>
                  <td class="text-right">${formatPrice(item.rowTotalInclTax || item.rowTotal || 0, this.currencyValue)}</td>
                </tr>`).join('')}
              </tbody>
              <tfoot class="bg-base-200/30">
                ${order.subtotal ? `<tr><td colspan="3" class="text-right text-sm">Subtotal</td><td class="text-right text-sm">${formatPrice(order.subtotal, this.currencyValue)}</td></tr>` : ''}
                ${order.shippingAmount ? `<tr><td colspan="3" class="text-right text-sm">Shipping</td><td class="text-right text-sm">${formatPrice(order.shippingAmount, this.currencyValue)}</td></tr>` : ''}
                ${order.taxAmount ? `<tr><td colspan="3" class="text-right text-sm">Tax</td><td class="text-right text-sm">${formatPrice(order.taxAmount, this.currencyValue)}</td></tr>` : ''}
                ${order.discountAmount ? `<tr><td colspan="3" class="text-right text-sm">Discount</td><td class="text-right text-sm text-success">${formatPrice(order.discountAmount, this.currencyValue)}</td></tr>` : ''}
                <tr class="font-bold"><td colspan="3" class="text-right">Grand Total</td><td class="text-right">${formatPrice(order.grandTotal || 0, this.currencyValue)}</td></tr>
              </tfoot>
            </table></div>
          </div>

          <div class="order-invoices-section" data-order-id="${order.id}">
            <h4 class="font-semibold mb-2 text-sm">Invoices</h4>
            <p class="text-sm text-base-content/50 order-invoices-loading">Loading...</p>
          </div>
        </div>
      `;
      this.orderDetailTarget.style.display = '';

      // Load invoices async
      this._loadOrderInvoices(order.id);
    }
  }

  async _loadOrderInvoices(orderId) {
    const section = this.orderDetailTarget?.querySelector('.order-invoices-section');
    if (!section) return;
    const loadingEl = section.querySelector('.order-invoices-loading');

    try {
      let url = `${api.url()}/api/customers/me/orders/${orderId}/invoices`;
      const storeCode = window.MAHO_STORE_CODE;
      if (storeCode) url += `?store=${storeCode}`;
      const res = await fetch(url, {
        headers: api.headers(false),
      });
      if (!res.ok) throw new Error('Failed to load invoices');
      const data = await res.json();
      const invoices = data.invoices || [];

      if (!invoices.length) {
        if (loadingEl) loadingEl.textContent = 'No invoices available for this order.';
        return;
      }

      if (loadingEl) loadingEl.remove();
      const list = document.createElement('div');
      list.className = 'flex flex-col gap-2';
      list.innerHTML = invoices.map(inv => `
        <div class="flex items-center justify-between bg-base-200/50 rounded-lg p-3">
          <div class="flex items-center gap-3 text-sm">
            <span class="font-semibold">Invoice #${escapeHtml(inv.incrementId)}</span>
            <span class="text-base-content/60">${new Date(inv.createdAt).toLocaleDateString('en-AU')}</span>
            <span>${formatPrice(inv.grandTotal, this.currencyValue)}</span>
          </div>
          <button class="btn btn-sm btn-outline" data-action="account#downloadInvoice"
            data-order-id="${orderId}" data-invoice-id="${inv.id}">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="vertical-align:-2px;margin-right:4px">
              <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10"/>
            </svg>Download PDF
          </button>
        </div>
      `).join('');
      section.appendChild(list);
    } catch {
      if (loadingEl) loadingEl.textContent = 'Could not load invoices.';
    }
  }

  async downloadInvoice(event) {
    const btn = event.currentTarget;
    const orderId = btn.dataset.orderId;
    const invoiceId = btn.dataset.invoiceId;
    if (!orderId || !invoiceId) return;

    const origHtml = btn.innerHTML;
    btn.textContent = 'Downloading...';
    btn.disabled = true;

    try {
      let apiUrl = `${api.url()}/api/customers/me/orders/${orderId}/invoices/${invoiceId}/pdf`;
      const storeCode = window.MAHO_STORE_CODE;
      if (storeCode) apiUrl += `?store=${storeCode}`;
      const response = await fetch(apiUrl, {
        headers: api.headers(false),
      });
      if (!response.ok) throw new Error('Failed to download');

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'invoice.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match) filename = match[1];
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      btn.textContent = 'Error';
      setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
      return;
    }

    btn.innerHTML = origHtml;
    btn.disabled = false;
  }

  async reorder(event) {
    const btn = event.currentTarget;
    const orderId = btn.dataset.orderId;
    const order = this._orders?.find(o => String(o.id) === String(orderId));
    if (!order?.items) return;

    const origText = btn.textContent;
    btn.textContent = 'Adding to cart...';
    btn.disabled = true;

    let addedCount = 0;
    try {
      const maskedId = await ensureCart();

      for (const item of order.items) {
        // Skip parent configurable products (only add children)
        if (item.productType === 'configurable') continue;
        const qty = (item.qtyOrdered || item.qty || 1) - (item.qtyCanceled || 0);
        if (qty <= 0) continue;

        try {
          const res = await api.post(`/api/guest-carts/${maskedId}/items`, { sku: item.sku, qty });
          if (res.ok) addedCount++;
        } catch {}
      }

      if (addedCount > 0) {
        // Refresh cart badge
        const cart = await api.get(`/api/guest-carts/${maskedId}`);
        localStorage.setItem('maho_cart_qty', String(cart.itemsQty || 0));
        updateCartBadge();
        document.dispatchEvent(new CustomEvent('cart:open'));
        btn.textContent = `${addedCount} item${addedCount > 1 ? 's' : ''} added!`;
      } else {
        btn.textContent = 'No items could be added';
      }
    } catch {
      btn.textContent = 'Error';
    }

    setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 3000);
  }

  backToOrders() {
    if (this.hasOrderDetailTarget) this.orderDetailTarget.style.display = 'none';
    if (this.hasOrdersListTarget) this.ordersListTarget.style.display = '';
    if (this.hasOrdersPaginationTarget && this._ordersTotalPages > 1) this.ordersPaginationTarget.style.display = '';
  }

  // ---- Tab Switching ----

  switchTab(event) {
    const tab = event.currentTarget.dataset.tab;
    this._activateTab(tab);
  }

  _activateTab(tab) {
    // Update tab buttons
    this.element.querySelectorAll('.account-tab').forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('active', isActive);
      btn.classList.toggle('tab-active', isActive);
    });

    // Show/hide panels
    if (this.hasInfoPanelTarget) this.infoPanelTarget.style.display = tab === 'info' ? '' : 'none';
    if (this.hasAddressesPanelTarget) this.addressesPanelTarget.style.display = tab === 'addresses' ? '' : 'none';
    if (this.hasWishlistPanelTarget) this.wishlistPanelTarget.style.display = tab === 'wishlist' ? '' : 'none';
    if (this.hasReviewsPanelTarget) this.reviewsPanelTarget.style.display = tab === 'reviews' ? '' : 'none';
    if (this.hasOrdersPanelTarget) this.ordersPanelTarget.style.display = tab === 'orders' ? '' : 'none';

    // Load data for tab
    if (tab === 'orders' && !this._ordersLoaded) {
      this._ordersLoaded = true;
      this.loadOrders(1);
    }
    if (tab === 'wishlist' && !this._wishlistLoaded) {
      this._wishlistLoaded = true;
      this._loadWishlist();
    }
    if (tab === 'reviews' && !this._reviewsLoaded) {
      this._reviewsLoaded = true;
      this._loadReviews();
    }
  }

  // ---- Wishlist ----

  async _loadWishlist() {
    if (!this.hasWishlistGridTarget) return;
    this.wishlistGridTarget.innerHTML = '<p class="text-muted">Loading wishlist...</p>';

    try {
      const data = await api.get('/api/customers/me/wishlist');
      const items = data.member || data || [];

      if (!items.length) {
        this.wishlistGridTarget.innerHTML = '<div class="no-wishlist"><p>Your wishlist is empty.</p><a href="/" class="btn btn-primary btn-sm">Start Shopping</a></div>';
        return;
      }

      this.wishlistGridTarget.innerHTML = items.map(item => `
        <div class="wishlist-item" data-wishlist-item-id="${item.id}" data-product-id="${item.productId}">
          <a href="${item.productUrl ? escapeHtml(item.productUrl) : '#'}" class="wishlist-item-image">
            ${item.productImageUrl ? `<img src="${escapeHtml(item.productImageUrl)}" alt="${escapeHtml(item.productName)}" loading="lazy" />` : '<div class="wishlist-item-placeholder">No Image</div>'}
          </a>
          <div class="wishlist-item-info">
            <a href="${item.productUrl ? escapeHtml(item.productUrl) : '#'}" class="wishlist-item-name">${escapeHtml(item.productName)}</a>
            <div class="wishlist-item-sku">SKU: ${escapeHtml(item.productSku)}</div>
            ${item.productPrice != null ? `<div class="wishlist-item-price">${formatPrice(item.productPrice, this.currencyValue)}</div>` : ''}
            <div class="wishlist-item-stock ${item.inStock ? 'in-stock' : 'out-of-stock'}">${item.inStock ? 'In Stock' : 'Out of Stock'}</div>
          </div>
          <div class="wishlist-item-actions">
            ${!item.inStock ? '' : ['configurable','grouped','bundle'].includes(item.productType) ? `<a href="${item.productUrl ? escapeHtml(item.productUrl) : '#'}" class="btn btn-primary btn-sm">Choose Options</a>` : `<button class="btn btn-primary btn-sm" data-action="account#addWishlistToCart" data-product-sku="${escapeHtml(item.productSku)}" data-item-id="${item.id}">Add to Cart</button>`}
            <button class="btn btn-outline-sm" data-action="account#removeWishlistItem" data-item-id="${item.id}">Remove</button>
          </div>
        </div>
      `).join('');
    } catch {
      this.wishlistGridTarget.innerHTML = '<p class="text-muted">Could not load wishlist.</p>';
    }
  }

  async removeWishlistItem(event) {
    const itemId = event.currentTarget.dataset.itemId;
    if (!itemId) return;

    // Optimistically remove from DOM immediately
    const card = event.currentTarget.closest('.wishlist-item');
    if (card) card.remove();

    // Update local storage
    try {
      const stored = JSON.parse(localStorage.getItem('maho_wishlist') || '[]');
      const updated = stored.filter(i => String(i.itemId) !== String(itemId));
      localStorage.setItem('maho_wishlist', JSON.stringify(updated));
      document.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { productIds: updated.map(i => i.productId) } }));
    } catch {}

    // Check if grid is now empty
    if (this.hasWishlistGridTarget && !this.wishlistGridTarget.querySelector('.wishlist-item')) {
      this.wishlistGridTarget.innerHTML = '<div class="no-wishlist"><p>Your wishlist is empty.</p><a href="/" class="btn btn-primary btn-sm">Start Shopping</a></div>';
    }

    // Fire the API call (don't block on response)
    api.del(`/api/customers/me/wishlist/${itemId}`).catch(() => {});
  }

  async addWishlistToCart(event) {
    const btn = event.currentTarget;
    const sku = btn.dataset.productSku;
    const itemId = btn.dataset.itemId;
    if (!sku) return;

    const originalText = btn.textContent;
    btn.textContent = 'Adding...';
    btn.disabled = true;

    try {
      const maskedId = await ensureCart();
      const response = await api.post(`/api/guest-carts/${maskedId}/items`, { sku, qty: 1 });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err['hydra:description'] || err.detail || err.message || 'Failed to add to cart');
      }
      const cart = await response.json();
      localStorage.setItem('maho_cart_qty', String(cart.itemsQty || 0));
      updateCartBadge();
      dispatchCartEvent(cart);
      btn.textContent = 'Added!';
      setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
    } catch (e) {
      btn.textContent = 'Error';
      setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
    }
  }

  // ---- Reviews ----

  async _loadReviews() {
    if (!this.hasReviewsGridTarget) return;
    this.reviewsGridTarget.innerHTML = '<p class="text-muted">Loading reviews...</p>';

    try {
      const data = await api.get('/api/customers/me/reviews');
      const reviews = data.member || data || [];

      if (!reviews.length) {
        this.reviewsGridTarget.innerHTML = '<div class="no-reviews"><p>You haven\'t written any reviews yet.</p></div>';
        return;
      }

      this.reviewsGridTarget.innerHTML = reviews.map(review => {
        const statusClass = review.status === 'approved' ? 'approved' : 'pending';
        const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '';
        return `
          <div class="account-review-card">
            <div class="account-review-header">
              <div>
                ${review.productName ? `<div class="account-review-product">${escapeHtml(review.productName)}</div>` : ''}
                <div class="account-review-title">${escapeHtml(review.title)}</div>
              </div>
              <span class="review-status-badge ${statusClass}">${statusClass === 'approved' ? 'Approved' : 'Pending'}</span>
            </div>
            <div class="account-review-rating">
              <span class="stars" style="--rating: ${review.rating || 0}">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              ${date ? `<span class="account-review-date">${date}</span>` : ''}
            </div>
            <div class="account-review-detail">${escapeHtml(review.detail)}</div>
          </div>`;
      }).join('');
    } catch {
      this.reviewsGridTarget.innerHTML = '<p class="text-muted">Could not load reviews.</p>';
    }
  }

  // ---- Logout ----

  logout() {
    localStorage.removeItem('maho_token');
    localStorage.removeItem('maho_customer');
    document.dispatchEvent(new CustomEvent('auth:changed'));
    window.Turbo?.visit('/');
  }

  // ---- Helpers ----

  _showMsg(target, text, type) {
    const el = this[`has${target.charAt(0).toUpperCase() + target.slice(1)}Target`] ? this[`${target}Target`] : null;
    if (!el) return;
    el.textContent = text;
    const alertClass = type === 'error' ? 'alert-error' : type === 'success' ? 'alert-success' : '';
    el.className = text ? `alert alert-sm ${alertClass} text-sm py-2 px-3 mt-2` : '';
  }
}