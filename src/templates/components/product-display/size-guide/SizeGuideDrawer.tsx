/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface SizeGuideDrawerProps {
  blockIdentifier?: string;
}

/**
 * Size Guide Drawer
 *
 * Slide-in drawer that loads CMS block content on demand.
 * Triggered by a "Size Guide" button. Content is fetched once
 * from /api/cms-blocks/{identifier} and cached in the controller.
 */
export const SizeGuideDrawer: FC<SizeGuideDrawerProps> = ({ blockIdentifier = 'size-guide-apparel' }) => (
  <div
    data-controller="size-guide"
    data-size-guide-block-value={blockIdentifier}
  >
    {/* Trigger button — placed inline, styled to fit the info panel */}
    <button
      class="btn btn-sm btn-outline gap-2"
      data-action="click->size-guide#open"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3H3v7h18V3z"/><path d="M21 14H3v7h18v-7z"/><path d="M12 3v7"/><path d="M12 14v7"/><path d="M3 10l4 4-4 4"/></svg>
      Size Guide
    </button>

    {/* Drawer overlay + panel */}
    <div class="fixed inset-0 z-[60] hidden" data-size-guide-target="drawer">
      {/* Backdrop */}
      <div
        class="absolute inset-0 bg-black/40 transition-opacity"
        data-action="click->size-guide#close"
      ></div>

      {/* Panel */}
      <div class="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-base-100 shadow-2xl flex flex-col translate-x-full transition-transform duration-300" data-size-guide-target="panel">
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b border-base-200">
          <h2 class="text-lg font-bold">Size Guide</h2>
          <button
            class="btn btn-ghost btn-sm btn-circle"
            data-action="click->size-guide#close"
            aria-label="Close size guide"
          >&times;</button>
        </div>

        {/* Content */}
        <div class="flex-1 overflow-y-auto p-6" data-size-guide-target="content">
          {/* Loading state */}
          <div class="flex flex-col items-center justify-center py-12 gap-3" data-size-guide-target="loading">
            <span class="loading loading-spinner loading-md"></span>
            <span class="text-sm text-base-content/50">Loading size guide...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);