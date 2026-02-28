/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface CmsCalloutProps {
  type?: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  children: any;
}

const alertClasses: Record<string, string> = {
  info: 'alert alert-info',
  warning: 'alert alert-warning',
  success: 'alert alert-success',
  error: 'alert alert-error',
};

const icons: Record<string, string> = {
  info: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  warning: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
  success: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  error: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
};

/**
 * CMS Callout — Standard
 *
 * Colored callout box with icon using DaisyUI alert component.
 * Supports info, warning, success, and error types.
 */
export const CmsCalloutStandard: FC<CmsCalloutProps> = ({ type = 'info', title, children }) => (
  <div class="max-w-[var(--content-max)] mx-auto px-[var(--content-padding)]">
    <div class={alertClasses[type] ?? alertClasses.info} role="alert">
      <span dangerouslySetInnerHTML={{ __html: icons[type] ?? icons.info }} />
      <div>
        {title && <h3 class="font-bold">{title}</h3>}
        <div class="text-sm">{children}</div>
      </div>
    </div>
  </div>
);