/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

/**
 * Toast Notification Container
 *
 * Server-rendered container for client-side toast messages.
 * The toast-controller in Stimulus manages show/hide/auto-dismiss.
 * Uses DaisyUI toast + alert components.
 */
export const ToastContainer: FC = () => (
  <div
    class="toast toast-top toast-end z-[9999]"
    data-controller="toast"
    data-toast-target="container"
  >
    {/* Toasts are injected here by the Stimulus controller */}
  </div>
);

/**
 * Toast Template
 *
 * Used by StimulusTemplates for client-side rendering.
 * Each toast is an alert with close button and auto-dismiss.
 */
export const ToastTemplate: FC = () => (
  <template id="tpl-toast">
    <div class="alert shadow-lg max-w-sm animate-slide-in" data-slot="root">
      <div class="flex items-start gap-3 w-full">
        <span data-slot="icon" class="shrink-0 mt-0.5"></span>
        <div class="flex-1 min-w-0">
          <p data-slot="message" class="text-sm font-medium"></p>
        </div>
        <button data-slot="close" class="btn btn-ghost btn-xs btn-circle shrink-0" aria-label="Dismiss">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  </template>
);