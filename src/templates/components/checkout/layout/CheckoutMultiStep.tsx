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
import { PromoTabs } from './components/PromoTabs';
import { ExtensionSlot } from './components/ExtensionSlot';

interface CheckoutPageProps {
  config: StoreConfig;
  categories: Category[];
  countries: Country[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
  googleMapsKey?: string;
  detectedCountry?: string;
}

export const CheckoutPage: FC<CheckoutPageProps> = ({ config, categories, countries, stores, currentStoreCode, devData, googleMapsKey, detectedCountry }) => (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo title={`Checkout | ${config.storeName}`} />
    <div class="py-8" data-controller="checkout"
      data-checkout-countries-value={JSON.stringify(countries)}
      data-checkout-currency-value={config.defaultDisplayCurrencyCode || 'USD'}
      data-checkout-country-value={config.defaultCountry || 'US'}
      {...(googleMapsKey ? { 'data-checkout-google-maps-key-value': googleMapsKey } : {})}
      {...(detectedCountry ? { 'data-checkout-detected-country-value': detectedCountry } : {})}>

      <h1 class="text-3xl font-bold tracking-tight mb-6">Checkout</h1>

      {/* Payment gateway error alert (shown after failed redirect) */}
      <div class="alert alert-error mb-6" data-checkout-target="gatewayError" style="display:none">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
        <span data-checkout-target="gatewayErrorText"></span>
      </div>

      <div class="grid grid-cols-[1fr_340px] gap-10 items-start max-lg:grid-cols-1">
        {/* Main checkout steps */}
        <div class="flex flex-col gap-4">

          {/* Guest login prompt (shown for guests, hidden when logged in) */}
          <div class="card bg-base-100 shadow-sm" data-checkout-target="guestLogin">
            <div class="card-body p-4">
              <div class="flex items-center gap-2 text-sm">
                <span class="text-base-content/60">Already have an account?</span>
                <button type="button" class="link link-primary text-sm" data-action="checkout#showLoginForm">Sign in for faster checkout</button>
              </div>
              <div class="mt-3" data-checkout-target="loginForm" style="display:none">
                <div class="grid grid-cols-2 gap-3">
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-xs">Email</legend>
                    <input type="email" class="input w-full" data-checkout-target="loginEmail" placeholder="you@example.com" />
                  </fieldset>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-xs">Password</legend>
                    <input type="password" class="input w-full" data-checkout-target="loginPassword"
                      data-action="keydown.enter->checkout#doLogin" />
                  </fieldset>
                </div>
                <div class="flex items-center gap-3 mt-3">
                  <button type="button" class="btn btn-primary btn-sm" data-action="checkout#doLogin"
                    data-checkout-target="loginBtn">Sign In</button>
                  <button type="button" class="link link-hover text-sm" data-action="checkout#hideLoginForm">Continue as guest</button>
                </div>
                <div class="text-sm text-error mt-2" data-checkout-target="loginError" style="display:none"></div>
                <ExtensionSlot name="checkout.login.after" config={config} />
              </div>
            </div>
          </div>

          {/* Step 1: Shipping Address */}
          <div class="card bg-base-100 shadow-sm" data-checkout-target="step1">
            <div class="flex items-center gap-3 p-4 cursor-pointer bg-base-200 rounded-t-lg" data-action="click->checkout#toggleStep" data-step="1">
              <span class="badge badge-outline badge-sm">1</span>
              <span class="font-semibold">Shipping Address</span>
              <span class="ml-auto text-success hidden" data-checkout-target="check1">&#10003;</span>
            </div>
            <div class="card-body" data-checkout-target="body1">
              {/* Saved address selector (shown for logged-in users with addresses) */}
              <fieldset class="fieldset mb-4" data-checkout-target="addressSelector" style="display:none">
                <legend class="fieldset-legend text-xs">Ship to a saved address</legend>
                <select class="select select-sm w-full" data-checkout-target="addressSelect" data-action="change->checkout#onAddressSelect">
                  <option value="">Select an address...</option>
                </select>
                <div class="mt-2 p-3 bg-base-200/50 rounded-lg text-sm" data-checkout-target="addressSummary" style="display:none">
                  <div data-checkout-target="summaryContent"></div>
                  <button type="button" class="link link-primary text-xs mt-1" data-action="checkout#editAddress">Edit</button>
                </div>
              </fieldset>

              <div class="flex flex-col gap-3" data-checkout-target="addressForm">
                <div data-checkout-target="emailContainer">
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">Email <span class="text-error">*</span></legend>
                    <input type="email" id="checkout-email" class="input w-full" data-checkout-target="email" required
                      placeholder="you@example.com" data-action="input->checkout#onAddressChange blur->checkout#onEmailBlur" />
                  </fieldset>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">First Name <span class="text-error">*</span></legend>
                    <input type="text" id="checkout-firstname" class="input w-full" data-checkout-target="firstName" required
                      data-action="input->checkout#onAddressChange" />
                  </fieldset>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">Last Name <span class="text-error">*</span></legend>
                    <input type="text" id="checkout-lastname" class="input w-full" data-checkout-target="lastName" required
                      data-action="input->checkout#onAddressChange" />
                  </fieldset>
                </div>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend">Company <span class="text-base-content/40">(optional)</span></legend>
                  <input type="text" id="checkout-company" class="input w-full" data-checkout-target="company"
                    data-action="input->checkout#onAddressChange" />
                </fieldset>
                <fieldset class="fieldset relative">
                  <legend class="fieldset-legend">Street Address <span class="text-error">*</span></legend>
                  <input type="text" id="checkout-street" class="input w-full" data-checkout-target="street" required
                    placeholder="Street address, P.O. box" data-action="input->checkout#onAddressChange" />
                  <div data-checkout-target="streetSuggestions"
                    class="absolute z-50 left-0 right-0 top-full bg-base-100 border border-base-300 rounded-b-lg shadow-lg max-h-48 overflow-y-auto"
                    style="display:none"></div>
                </fieldset>
                <fieldset class="fieldset">
                  <input type="text" id="checkout-street2" class="input w-full" data-checkout-target="street2"
                    placeholder="Apartment, suite, unit, etc. (optional)" data-action="input->checkout#onAddressChange" />
                </fieldset>
                <div class="grid grid-cols-2 gap-3">
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">City <span class="text-error">*</span></legend>
                    <input type="text" id="checkout-city" class="input w-full" data-checkout-target="city" required
                      data-action="input->checkout#onAddressChange" />
                  </fieldset>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">Postcode <span class="text-error">*</span></legend>
                    <input type="text" id="checkout-postcode" class="input w-full" data-checkout-target="postcode" required
                      data-action="input->checkout#onAddressChange" />
                  </fieldset>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">Country <span class="text-error">*</span></legend>
                    <select id="checkout-country" class="select w-full" data-checkout-target="country"
                      data-action="change->checkout#onCountryChange">
                      <option value="">Select Country</option>
                      {countries.map(c => (
                        <option key={c.id} value={c.id}
                          selected={c.id === (config.allowedCountries?.[0] || 'AU')}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </fieldset>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">State / Region</legend>
                    <select id="checkout-region" class="select w-full" data-checkout-target="region" style="display:none"
                      data-action="change->checkout#onAddressChange">
                      <option value="">Select Region</option>
                    </select>
                    <input type="text" id="checkout-region-text" class="input w-full" data-checkout-target="regionText"
                      data-action="input->checkout#onAddressChange" placeholder="Region (optional)" />
                  </fieldset>
                </div>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend">Phone <span class="text-error">*</span></legend>
                  <input type="tel" id="checkout-telephone" class="input w-full" data-checkout-target="telephone" required
                    data-action="input->checkout#onAddressChange" />
                </fieldset>
              </div>
              <button class="btn btn-primary w-full mt-4" data-action="checkout#continueToShipping"
                data-checkout-target="continueShippingBtn">
                Continue to Shipping
              </button>
            </div>
          </div>

          {/* Step 2: Shipping Method */}
          <div class="card bg-base-100 shadow-sm" data-checkout-target="step2">
            <div class="flex items-center gap-3 p-4 cursor-pointer bg-base-200 rounded-t-lg" data-action="click->checkout#toggleStep" data-step="2">
              <span class="badge badge-outline badge-sm">2</span>
              <span class="font-semibold">Shipping Method</span>
              <span class="ml-auto text-success hidden" data-checkout-target="check2">&#10003;</span>
            </div>
            <div class="card-body" data-checkout-target="body2" style="display:none">
              <div class="space-y-2" data-checkout-target="shippingMethods">
                <p class="text-sm text-base-content/60">Loading shipping methods...</p>
              </div>
              <div class="text-sm text-error mt-2" data-checkout-target="shippingError" style="display:none"></div>
              <button class="btn btn-primary w-full mt-4" data-action="checkout#continueToPayment"
                data-checkout-target="continuePaymentBtn" disabled>
                Continue to Payment
              </button>
            </div>
          </div>

          {/* Step 3: Payment Method */}
          <div class="card bg-base-100 shadow-sm" data-checkout-target="step3">
            <div class="flex items-center gap-3 p-4 cursor-pointer bg-base-200 rounded-t-lg" data-action="click->checkout#toggleStep" data-step="3">
              <span class="badge badge-outline badge-sm">3</span>
              <span class="font-semibold">Payment</span>
              <span class="ml-auto text-success hidden" data-checkout-target="check3">&#10003;</span>
            </div>
            <div class="card-body" data-checkout-target="body3" style="display:none">
              <div class="space-y-2" data-checkout-target="paymentMethods">
                <p class="text-sm text-base-content/60">Loading payment methods...</p>
              </div>

              {/* Payment adapter fields — populated dynamically by the active payment adapter */}
              <div data-checkout-target="paymentFields" style="display:none" class="mt-4"></div>

              <div class="text-sm text-error mt-2" data-checkout-target="orderError" style="display:none"></div>
              <button class="btn btn-primary w-full mt-4" data-action="checkout#placeOrder"
                data-checkout-target="placeOrderBtn" disabled>
                Place Order
              </button>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div class="bg-base-200 rounded-lg p-5 sticky top-20 border border-border">
          <h3 class="text-lg font-bold mb-4">Order Summary</h3>
          <div class="animate-pulse space-y-3" data-checkout-target="sidebarLoading">
            {[1, 2].map(i => (
              <div key={i} class="flex gap-3">
                <div class="w-12 h-12 bg-base-300 rounded shrink-0"></div>
                <div class="flex-1 space-y-1.5 py-0.5">
                  <div class="h-3 bg-base-300 rounded w-3/4"></div>
                  <div class="h-3 bg-base-300 rounded w-12"></div>
                </div>
              </div>
            ))}
            <div class="border-t border-base-300 pt-3 space-y-2">
              <div class="flex justify-between"><div class="h-3 bg-base-300 rounded w-16"></div><div class="h-3 bg-base-300 rounded w-14"></div></div>
              <div class="flex justify-between"><div class="h-3 bg-base-300 rounded w-10"></div><div class="h-3 bg-base-300 rounded w-14"></div></div>
              <div class="border-t border-base-300 pt-2 flex justify-between"><div class="h-4 bg-base-300 rounded w-12"></div><div class="h-4 bg-base-300 rounded w-16"></div></div>
            </div>
          </div>
          <div class="divide-y divide-base-200 max-h-[300px] overflow-y-auto" data-checkout-target="sidebarItems" style="display:none"></div>
          <div class="text-sm space-y-1.5 mt-4 pt-4 border-t border-border" data-checkout-target="sidebarTotals" style="display:none">
            <div class="flex justify-between">
              <span>Subtotal</span>
              <span data-checkout-target="sidebarSubtotal"><span class="inline-block h-3.5 w-14 bg-base-300 rounded animate-pulse"></span></span>
            </div>
            <div class="flex justify-between" data-checkout-target="sidebarDiscountRow" style="display:none">
              <span>Discount</span>
              <span class="text-success" data-checkout-target="sidebarDiscount">$0.00</span>
            </div>
            <div class="flex justify-between" data-checkout-target="sidebarShippingRow" style="display:none">
              <span>Shipping</span>
              <span data-checkout-target="sidebarShipping">$0.00</span>
            </div>
            <div class="flex justify-between">
              <span>Tax</span>
              <span data-checkout-target="sidebarTax"><span class="inline-block h-3.5 w-14 bg-base-300 rounded animate-pulse"></span></span>
            </div>
            <div class="flex justify-between" data-checkout-target="sidebarGiftcardRow" style="display:none">
              <span>Gift Card</span>
              <span class="text-success" data-checkout-target="sidebarGiftcard">$0.00</span>
            </div>
            <div class="flex justify-between font-bold text-base pt-2 border-t border-border">
              <span>Total</span>
              <span data-checkout-target="sidebarTotal"><span class="inline-block h-4 w-16 bg-base-300 rounded animate-pulse"></span></span>
            </div>
          </div>

          <PromoTabs controller="checkout" hidden />
        </div>
      </div>
    </div>
  </Layout>
);