/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Category, StoreConfig, StorefrontStore } from '../types';
import type { DevData } from '../dev-auth';
import { Layout } from './Layout';
import { Seo } from './components/Seo';
import { ExtensionSlot } from './components/ExtensionSlot';

interface RegisterPageProps {
  config: StoreConfig;
  categories: Category[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const RegisterPage: FC<RegisterPageProps> = ({ config, categories, stores, currentStoreCode, devData }) => (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo title={`Create Account | ${config.storeName}`} />
    <div class="flex justify-center py-12 px-4" data-controller="auth" data-auth-mode-value="register">
      <div class="card bg-base-100 shadow-lg w-full max-w-md">
        <div class="card-body">
          <h1 class="text-2xl font-bold text-center">Create Account</h1>
          <p class="text-base-content/60 text-center text-sm">Join us to track orders and save your details.</p>

          <div class="text-sm mt-2" data-auth-target="message"></div>

          <form data-action="submit->auth#submit" novalidate class="mt-6">
            <fieldset class="fieldset gap-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <legend class="fieldset-legend">First Name</legend>
                  <input type="text" class="input w-full" data-auth-target="firstName" required autocomplete="given-name" />
                </div>
                <div>
                  <legend class="fieldset-legend">Last Name</legend>
                  <input type="text" class="input w-full" data-auth-target="lastName" required autocomplete="family-name" />
                </div>
              </div>
              <div>
                <legend class="fieldset-legend">Email</legend>
                <input type="email" class="input w-full" data-auth-target="email" required placeholder="you@example.com" autocomplete="email" />
              </div>
              <div>
                <legend class="fieldset-legend">Password</legend>
                <input type="password" class="input w-full" data-auth-target="password" required placeholder="At least 8 characters" autocomplete="new-password" />
              </div>
              <div>
                <legend class="fieldset-legend">Confirm Password</legend>
                <input type="password" class="input w-full" data-auth-target="confirmPassword" required placeholder="Repeat your password" autocomplete="new-password" />
              </div>
              <button type="submit" class="btn btn-primary w-full mt-2" data-auth-target="submitBtn">Create Account</button>
            </fieldset>
          </form>

          <ExtensionSlot name="auth.register.after" config={config} />

          <div class="flex items-center justify-center gap-2 text-sm mt-4">
            <span class="text-base-content/60">Already have an account?</span>
            <a href="/login" class="text-primary hover:underline">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  </Layout>
);