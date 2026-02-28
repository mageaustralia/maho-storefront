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

interface LoginPageProps {
  config: StoreConfig;
  categories: Category[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const LoginPage: FC<LoginPageProps> = ({ config, categories, stores, currentStoreCode, devData }) => (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo title={`Sign In | ${config.storeName}`} />
    <div class="flex justify-center py-12 px-4" data-controller="auth" data-auth-mode-value="login">
      <div class="card bg-base-100 shadow-lg w-full max-w-md">
        <div class="card-body">
          <h1 class="text-2xl font-bold text-center">Sign In</h1>
          <p class="text-base-content/60 text-center text-sm">Welcome back. Sign in to your account.</p>

          <div class="text-sm mt-2" data-auth-target="message"></div>

          <form data-action="submit->auth#submit" novalidate class="mt-6">
            <fieldset class="fieldset gap-4">
              <div>
                <legend class="fieldset-legend">Email</legend>
                <input type="email" class="input w-full" data-auth-target="email" required placeholder="you@example.com" autocomplete="email" />
              </div>
              <div>
                <legend class="fieldset-legend">Password</legend>
                <input type="password" class="input w-full" data-auth-target="password" required placeholder="Your password" autocomplete="current-password" />
              </div>
              <button type="submit" class="btn btn-primary w-full mt-2" data-auth-target="submitBtn">Sign In</button>
            </fieldset>
          </form>

          <div class="flex items-center justify-center gap-2 text-sm mt-4">
            <a href="/forgot-password" class="text-primary hover:underline">Forgot password?</a>
            <span class="text-base-content/30">|</span>
            <a href="/register" class="text-primary hover:underline">Create an account</a>
          </div>
        </div>
      </div>
    </div>
  </Layout>
);