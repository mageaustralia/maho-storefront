/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * 404 Error Page
 *
 * Friendly "not found" page with search suggestion and home link.
 */
export const Error404: FC = () => (
  <div class="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
    <span class="text-8xl font-extrabold text-base-content/10 mb-4">404</span>
    <h1 class="text-2xl font-bold text-base-content mb-2">Page Not Found</h1>
    <p class="text-base-content/60 max-w-md mb-6">
      Sorry, we couldn't find the page you're looking for. It might have been moved or no longer exists.
    </p>
    <div class="flex gap-3">
      <a href="/" class="btn btn-primary">Go Home</a>
      <button class="btn btn-outline" onclick="document.dispatchEvent(new CustomEvent('search:open'))">Search</button>
    </div>
  </div>
);