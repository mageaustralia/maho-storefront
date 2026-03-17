/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, Country, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';

interface AccountPageProps {
  config: StoreConfig;
  categories: Category[];
  countries: Country[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const AccountPage: FC<AccountPageProps> = ({ config, categories, countries, stores, currentStoreCode, devData }) => (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo title={`My Account | ${config.storeName}`} />
    <div class="py-8" data-controller="account"
      data-account-countries-value={JSON.stringify(countries)}
      data-account-currency-value={config.defaultDisplayCurrencyCode || 'USD'}>

      {/* Not logged in state — shown by default, hidden by JS when authenticated */}
      <div class="flex justify-center py-12" data-account-target="guestState">
        <div class="card bg-base-100 shadow-lg w-full max-w-md">
          <div class="card-body text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-base-content/40">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <h1 class="text-2xl font-bold">My Account</h1>
            <p class="text-base-content/60 text-sm">Please sign in to view your account.</p>
            <a href="/login" class="btn btn-primary mt-4">Sign In</a>
          </div>
        </div>
      </div>

      {/* Logged in state — hidden by default, shown by JS */}
      <div data-account-target="authState" style="display:none">

        {/* Account Header */}
        <div class="flex items-center gap-4 mb-6">
          <div class="avatar placeholder">
            <div class="bg-primary text-primary-content rounded-full w-14 h-14 text-xl flex items-center justify-center" data-account-target="avatar">?</div>
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold" data-account-target="nameDisplay">My Account</h1>
            <p class="text-sm text-base-content/60" data-account-target="emailDisplay"></p>
          </div>
          <button class="btn btn-outline btn-sm" data-action="account#logout">Sign Out</button>
        </div>

        {/* Tab Navigation — scrollable on mobile */}
        <div class="tabs tabs-border mb-8 pb-2 overflow-x-auto overflow-y-hidden flex-nowrap scrollbar-none">
          <button class="account-tab tab tab-active active whitespace-nowrap" data-action="account#switchTab" data-tab="info">Account Info</button>
          <button class="account-tab tab whitespace-nowrap" data-action="account#switchTab" data-tab="addresses">Addresses</button>
          <button class="account-tab tab whitespace-nowrap" data-action="account#switchTab" data-tab="wishlist">Wishlist</button>
          <button class="account-tab tab whitespace-nowrap" data-action="account#switchTab" data-tab="reviews">Reviews</button>
          <button class="account-tab tab whitespace-nowrap" data-action="account#switchTab" data-tab="orders">Orders</button>
        </div>

        {/* Tab: Account Info */}
        <div data-account-target="infoPanel">
          <div class="card bg-base-100 shadow-sm mb-6">
            <div class="card-body">
              <h2 class="card-title text-lg">Profile</h2>
              <div class="text-sm" data-account-target="profileMessage"></div>
              <form data-action="submit->account#updateProfile" novalidate class="flex flex-col gap-4 mt-2">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">First Name</legend>
                    <input type="text" class="input w-full" data-account-target="profileFirstName" required />
                  </fieldset>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">Last Name</legend>
                    <input type="text" class="input w-full" data-account-target="profileLastName" required />
                  </fieldset>
                </div>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend">Email</legend>
                  <input type="email" class="input w-full" data-account-target="profileEmail" required />
                </fieldset>
                <button type="submit" class="btn btn-primary btn-sm self-start" data-account-target="profileBtn">Save Changes</button>
              </form>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title text-lg">Change Password</h2>
              <div class="text-sm" data-account-target="passwordMessage"></div>
              <form data-action="submit->account#changePassword" novalidate class="flex flex-col gap-4 mt-2">
                <fieldset class="fieldset">
                  <legend class="fieldset-legend">Current Password</legend>
                  <input type="password" class="input w-full" data-account-target="currentPassword" required autocomplete="current-password" />
                </fieldset>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">New Password</legend>
                    <input type="password" class="input w-full" data-account-target="newPassword" required autocomplete="new-password" />
                  </fieldset>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">Confirm New Password</legend>
                    <input type="password" class="input w-full" data-account-target="confirmNewPassword" required autocomplete="new-password" />
                  </fieldset>
                </div>
                <button type="submit" class="btn btn-primary btn-sm self-start" data-account-target="passwordBtn">Update Password</button>
              </form>
            </div>
          </div>
        </div>

        {/* Tab: Addresses */}
        <div data-account-target="addressesPanel" style="display:none">
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body max-sm:p-0">
              <div class="flex items-center justify-between">
                <h2 class="card-title text-lg">Your Addresses</h2>
                <button class="btn btn-primary btn-sm" data-action="account#showAddressForm">Add Address</button>
              </div>

              {/* Address Form (hidden by default) */}
              <div class="mt-4 p-4 bg-base-200/50 rounded-lg" data-account-target="addressFormWrapper" style="display:none">
                <h3 class="font-semibold mb-3" data-account-target="addressFormTitle">Add Address</h3>
                <div class="text-sm" data-account-target="addressMessage"></div>
                <form data-action="submit->account#saveAddress" novalidate class="flex flex-col gap-3">
                  <input type="hidden" data-account-target="addressId" />
                  <div class="grid grid-cols-2 gap-3">
                    <fieldset class="fieldset">
                      <legend class="fieldset-legend text-xs">First Name</legend>
                      <input type="text" class="input input-sm w-full" data-account-target="addrFirstName" required />
                    </fieldset>
                    <fieldset class="fieldset">
                      <legend class="fieldset-legend text-xs">Last Name</legend>
                      <input type="text" class="input input-sm w-full" data-account-target="addrLastName" required />
                    </fieldset>
                  </div>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-xs">Company <span class="text-base-content/40">(optional)</span></legend>
                    <input type="text" class="input input-sm w-full" data-account-target="addrCompany" />
                  </fieldset>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-xs">Street Address</legend>
                    <input type="text" class="input input-sm w-full" data-account-target="addrStreet" required placeholder="Street address, P.O. box" />
                  </fieldset>
                  <fieldset class="fieldset">
                    <input type="text" class="input input-sm w-full" data-account-target="addrStreet2" placeholder="Apartment, suite, unit, etc. (optional)" />
                  </fieldset>
                  <div class="grid grid-cols-2 gap-3">
                    <fieldset class="fieldset">
                      <legend class="fieldset-legend text-xs">City</legend>
                      <input type="text" class="input input-sm w-full" data-account-target="addrCity" required />
                    </fieldset>
                    <fieldset class="fieldset">
                      <legend class="fieldset-legend text-xs">Postcode</legend>
                      <input type="text" class="input input-sm w-full" data-account-target="addrPostcode" required />
                    </fieldset>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <fieldset class="fieldset">
                      <legend class="fieldset-legend text-xs">Country</legend>
                      <select class="select select-sm w-full" data-account-target="addrCountry" data-action="change->account#onCountryChange">
                        {countries.map(c => (
                          <option key={c.id} value={c.id} selected={c.id === 'AU'}>{c.name}</option>
                        ))}
                      </select>
                    </fieldset>
                    <fieldset class="fieldset">
                      <legend class="fieldset-legend text-xs">State / Region</legend>
                      <select class="select select-sm w-full" data-account-target="addrRegion">
                        <option value="">Select Region</option>
                      </select>
                      <input type="text" class="input input-sm w-full" data-account-target="addrRegionText" placeholder="Region" style="display:none" />
                    </fieldset>
                  </div>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-xs">Telephone</legend>
                    <input type="tel" class="input input-sm w-full" data-account-target="addrTelephone" required />
                  </fieldset>
                  <div class="grid grid-cols-2 gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" class="checkbox checkbox-sm" data-account-target="addrDefaultBilling" />
                      <span class="text-xs">Default billing address</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" class="checkbox checkbox-sm" data-account-target="addrDefaultShipping" />
                      <span class="text-xs">Default shipping address</span>
                    </label>
                  </div>
                  <div class="flex gap-2 mt-1">
                    <button type="submit" class="btn btn-primary btn-sm" data-account-target="addressBtn">Save Address</button>
                    <button type="button" class="btn btn-outline btn-sm" data-action="account#hideAddressForm">Cancel</button>
                  </div>
                </form>
              </div>

              {/* Address Cards */}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4" data-account-target="addressGrid">
                <p class="text-base-content/60 text-sm">Loading addresses...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab: Wishlist */}
        <div data-account-target="wishlistPanel" style="display:none">
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body max-sm:p-0">
              <h2 class="card-title text-lg">My Wishlist</h2>
              <div data-account-target="wishlistGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 [&_.text-center]:mx-auto [&_.text-center]:col-span-full">
                <p class="text-base-content/60 text-sm">Loading wishlist...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab: Reviews */}
        <div data-account-target="reviewsPanel" style="display:none">
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body max-sm:p-0">
              <h2 class="card-title text-lg">My Reviews</h2>
              <div data-account-target="reviewsGrid" class="mt-4">
                <p class="text-base-content/60 text-sm">Loading reviews...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab: Orders */}
        <div data-account-target="ordersPanel" style="display:none">
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body max-sm:p-0">
              <h2 class="card-title text-lg">Order History</h2>

              {/* Orders list */}
              <div data-account-target="ordersList" class="mt-4">
                <p class="text-base-content/60 text-sm">Loading orders...</p>
              </div>

              {/* Order detail (hidden by default) */}
              <div data-account-target="orderDetail" style="display:none"></div>

              {/* Pagination */}
              <div class="flex items-center justify-center gap-4 mt-4" data-account-target="ordersPagination" style="display:none">
                <button class="btn btn-outline btn-sm" data-action="account#prevOrdersPage">Previous</button>
                <span class="text-sm text-base-content/60" data-account-target="ordersPageInfo">Page 1</span>
                <button class="btn btn-outline btn-sm" data-action="account#nextOrdersPage">Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
);