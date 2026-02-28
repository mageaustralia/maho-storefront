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

interface ResetPasswordPageProps {
  config: StoreConfig;
  categories: Category[];
  stores?: StorefrontStore[];
  currentStoreCode?: string;
  devData?: DevData | null;
}

export const ResetPasswordPage: FC<ResetPasswordPageProps> = ({ config, categories, stores, currentStoreCode, devData }) => (
  <Layout config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData}>
    <Seo title={`Reset Password | ${config.storeName}`} />
    <div class="auth-page" data-controller="auth" data-auth-mode-value="reset">
      <div class="auth-card">
        <h1 class="auth-title">Reset Password</h1>
        <p class="auth-subtitle">Enter your new password below.</p>

        <div class="form-message" data-auth-target="message"></div>

        <form data-action="submit->auth#submit" novalidate>
          <div class="form-group">
            <label for="auth-email">Email</label>
            <input type="email" id="auth-email" data-auth-target="email" required placeholder="you@example.com" autocomplete="email" />
          </div>
          <div class="form-group" style="display:none">
            <input type="hidden" data-auth-target="token" />
          </div>
          <div class="form-group">
            <label for="auth-password">New Password</label>
            <input type="password" id="auth-password" data-auth-target="password" required placeholder="At least 8 characters" autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label for="auth-confirm-password">Confirm Password</label>
            <input type="password" id="auth-confirm-password" data-auth-target="confirmPassword" required placeholder="Repeat your password" autocomplete="new-password" />
          </div>
          <button type="submit" class="btn btn-primary auth-submit-btn" data-auth-target="submitBtn">Reset Password</button>
        </form>

        <div class="auth-links">
          <a href="/login">Back to Sign In</a>
        </div>
      </div>
    </div>
  </Layout>
);