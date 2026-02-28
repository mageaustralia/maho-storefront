/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface AddressFormStandardProps {
  type?: 'shipping' | 'billing';
  countries?: Array<{ value: string; label: string }>;
}

/**
 * Address Form Standard
 *
 * Full shipping/billing address entry form using DaisyUI v5 fieldset pattern.
 * Wired to a checkout Stimulus controller for validation and submission.
 */
export const AddressFormStandard: FC<AddressFormStandardProps> = ({
  type = 'shipping',
  countries = [],
}) => {
  const title = type === 'billing' ? 'Billing Address' : 'Shipping Address';
  const prefix = type === 'billing' ? 'billing' : 'shipping';

  return (
    <div data-controller="checkout">
      <h3 class="text-lg font-semibold text-base-content mb-4">{title}</h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">First Name</legend>
          <label class="input w-full">
            <input
              type="text"
              name={`${prefix}[firstname]`}
              placeholder="First name"
              required
              class="grow"
              data-checkout-target="firstname"
            />
          </label>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Last Name</legend>
          <label class="input w-full">
            <input
              type="text"
              name={`${prefix}[lastname]`}
              placeholder="Last name"
              required
              class="grow"
              data-checkout-target="lastname"
            />
          </label>
        </fieldset>
      </div>

      <fieldset class="fieldset mb-4">
        <legend class="fieldset-legend">Company (optional)</legend>
        <label class="input w-full">
          <input
            type="text"
            name={`${prefix}[company]`}
            placeholder="Company name"
            class="grow"
            data-checkout-target="company"
          />
        </label>
      </fieldset>

      <fieldset class="fieldset mb-4">
        <legend class="fieldset-legend">Street Address</legend>
        <label class="input w-full">
          <input
            type="text"
            name={`${prefix}[street][]`}
            placeholder="Street address"
            required
            class="grow"
            data-checkout-target="street"
          />
        </label>
      </fieldset>

      <fieldset class="fieldset mb-4">
        <legend class="fieldset-legend">Apartment / Suite (optional)</legend>
        <label class="input w-full">
          <input
            type="text"
            name={`${prefix}[street][]`}
            placeholder="Apt, suite, unit, etc."
            class="grow"
          />
        </label>
      </fieldset>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">City</legend>
          <label class="input w-full">
            <input
              type="text"
              name={`${prefix}[city]`}
              placeholder="City"
              required
              class="grow"
              data-checkout-target="city"
            />
          </label>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">State / Region</legend>
          <label class="input w-full">
            <input
              type="text"
              name={`${prefix}[region]`}
              placeholder="State or region"
              class="grow"
              data-checkout-target="region"
            />
          </label>
        </fieldset>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Postcode</legend>
          <label class="input w-full">
            <input
              type="text"
              name={`${prefix}[postcode]`}
              placeholder="Postcode"
              required
              class="grow"
              data-checkout-target="postcode"
            />
          </label>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Country</legend>
          <select
            name={`${prefix}[country_id]`}
            required
            class="select w-full"
            data-checkout-target="country"
          >
            <option value="" disabled selected>
              Select country
            </option>
            {countries.map((c) => (
              <option value={c.value}>{c.label}</option>
            ))}
          </select>
        </fieldset>
      </div>

      <fieldset class="fieldset mb-4">
        <legend class="fieldset-legend">Phone</legend>
        <label class="input w-full">
          <input
            type="tel"
            name={`${prefix}[telephone]`}
            placeholder="Phone number"
            required
            class="grow"
            data-checkout-target="telephone"
          />
        </label>
      </fieldset>
    </div>
  );
};