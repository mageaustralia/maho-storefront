/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * 500 Error Page
 *
 * Server error page with retry and home options.
 */
export const Error500: FC = () => (
  <div class="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
    <span class="text-8xl font-extrabold text-base-content/10 mb-4">500</span>
    <h1 class="text-2xl font-bold text-base-content mb-2">Something Went Wrong</h1>
    <p class="text-base-content/60 max-w-md mb-6">
      We're experiencing a temporary issue. Please try again in a moment.
    </p>
    <div class="flex gap-3">
      <button class="btn btn-primary" onclick="window.location.reload()">Try Again</button>
      <a href="/" class="btn btn-outline">Go Home</a>
    </div>
  </div>
);