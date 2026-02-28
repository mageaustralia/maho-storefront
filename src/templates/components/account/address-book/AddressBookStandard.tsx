/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Country } from '../../../../types';

export interface AddressBookProps {
  countries: Country[];
}

/**
 * Address book — list of saved addresses with add/edit form.
 * Wired to account Stimulus controller (addressesPanel target).
 */
export const AddressBookStandard: FC<AddressBookProps> = ({ countries }) => (
  <div data-account-target="addressesPanel" style="display:none">
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
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
);