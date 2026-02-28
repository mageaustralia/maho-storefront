/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Shipping Estimator Standard
 *
 * Inline postcode entry for estimating shipping costs.
 * Uses DaisyUI `join` input group pattern. Results area populated via
 * Stimulus `shipping-estimator` controller after API call.
 */
export const ShippingEstimatorStandard: FC = () => (
  <div
    class="my-4"
    data-controller="shipping-estimator"
  >
    <p class="text-sm font-semibold text-base-content mb-2">Estimate Shipping</p>
    <div class="join w-full max-w-xs">
      <label class="input join-item w-full">
        <input
          type="text"
          class="grow"
          placeholder="Enter postcode"
          maxlength={4}
          pattern="[0-9]{4}"
          data-shipping-estimator-target="postcode"
        />
      </label>
      <button
        class="btn btn-primary join-item"
        data-action="click->shipping-estimator#check"
      >
        Check
      </button>
    </div>
    <div
      class="mt-3 hidden"
      data-shipping-estimator-target="results"
    >
      <div class="space-y-2" data-shipping-estimator-target="methods">
        {/* Shipping methods populated dynamically */}
      </div>
      <p
        class="text-xs text-error mt-1 hidden"
        data-shipping-estimator-target="error"
      >
        Unable to estimate shipping for this postcode.
      </p>
    </div>
  </div>
);