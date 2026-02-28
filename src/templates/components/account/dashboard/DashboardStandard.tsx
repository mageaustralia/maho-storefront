/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Country } from '../../../../types';

export interface DashboardProps {
  countries: Country[];
  currency: string;
}

/**
 * Account dashboard — guest/auth states, tab navigation, profile form, password change.
 * Wired to account Stimulus controller.
 */
export const DashboardStandard: FC<DashboardProps> = ({ countries, currency }) => (
  <div data-controller="account"
    data-account-countries-value={JSON.stringify(countries)}
    data-account-currency-value={currency}>

    {/* Not logged in state */}
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

    {/* Logged in state */}
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

      {/* Tab Navigation */}
      <div class="tabs tabs-border mb-6">
        <button class="account-tab tab tab-active active" data-action="account#switchTab" data-tab="info">Account Info</button>
        <button class="account-tab tab" data-action="account#switchTab" data-tab="addresses">Addresses</button>
        <button class="account-tab tab" data-action="account#switchTab" data-tab="wishlist">Wishlist</button>
        <button class="account-tab tab" data-action="account#switchTab" data-tab="reviews">Reviews</button>
        <button class="account-tab tab" data-action="account#switchTab" data-tab="orders">Orders</button>
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

      {/* Tab: Wishlist */}
      <div data-account-target="wishlistPanel" style="display:none">
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg">My Wishlist</h2>
            <div data-account-target="wishlistGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              <p class="text-base-content/60 text-sm">Loading wishlist...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab: Reviews */}
      <div data-account-target="reviewsPanel" style="display:none">
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg">My Reviews</h2>
            <div data-account-target="reviewsGrid" class="mt-4">
              <p class="text-base-content/60 text-sm">Loading reviews...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);