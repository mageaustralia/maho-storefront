/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Forgot password form — email field with reset link request.
 * Wired to auth Stimulus controller.
 */
export const AuthForgotPassword: FC = () => (
  <div class="card bg-base-100 shadow-lg w-full max-w-md" data-controller="auth" data-auth-mode-value="forgot">
    <div class="card-body">
      <h1 class="text-2xl font-bold text-center">Forgot Password</h1>
      <p class="text-base-content/60 text-center text-sm">Enter your email and we'll send you a reset link.</p>

      <div class="text-sm mt-2" data-auth-target="message"></div>

      <form data-action="submit->auth#submit" novalidate class="mt-6">
        <fieldset class="fieldset gap-4">
          <div>
            <legend class="fieldset-legend">Email</legend>
            <input type="email" class="input w-full" data-auth-target="email" required placeholder="you@example.com" autocomplete="email" />
          </div>
          <button type="submit" class="btn btn-primary w-full mt-2" data-auth-target="submitBtn">Send Reset Link</button>
        </fieldset>
      </form>

      <div class="flex items-center justify-center gap-2 text-sm mt-4">
        <span class="text-base-content/60">Remember your password?</span>
        <a href="/login" class="text-primary hover:underline">Sign in</a>
      </div>
    </div>
  </div>
);