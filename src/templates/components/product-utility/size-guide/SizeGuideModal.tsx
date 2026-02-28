/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface SizeGuideModalProps {
  sizes: Array<{ label: string; [key: string]: string }>;
  headers: string[];
}

/**
 * Size Guide Modal
 *
 * Table-based size guide wrapped in a DaisyUI modal dialog.
 * Trigger button opens the modal; form method="dialog" handles close.
 */
export const SizeGuideModal: FC<SizeGuideModalProps> = ({ sizes, headers }) => (
  <div>
    <button
      class="btn btn-sm btn-outline"
      onclick="document.getElementById('size-guide-modal')?.showModal()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 3H3v7h18V3z" /><path d="M21 14H3v7h18v-7z" /><line x1="7" y1="3" x2="7" y2="10" /><line x1="12" y1="3" x2="12" y2="10" /><line x1="17" y1="3" x2="17" y2="10" /><line x1="7" y1="14" x2="7" y2="21" /><line x1="12" y1="14" x2="12" y2="21" /><line x1="17" y1="14" x2="17" y2="21" />
      </svg>
      Size Guide
    </button>

    <dialog id="size-guide-modal" class="modal">
      <div class="modal-box max-w-2xl">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <h3 class="text-lg font-semibold text-base-content mb-4">Size Guide</h3>
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th class="text-base-content/70">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((size) => (
                <tr>
                  {headers.map((header) => (
                    <td>{size[header] ?? size.label ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
);