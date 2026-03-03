/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { rewriteContentUrls } from '../../content-rewriter';

export type RootTemplate = 'empty' | 'one_column' | 'two_columns_left' | 'two_columns_right' | 'three_columns' | 'minimal';

interface LayoutShellProps {
  template: RootTemplate;
  sidebarLeft?: string | null;
  sidebarRight?: string | null;
  children: any;
}

/**
 * LayoutShell — wraps page content in the correct grid layout
 * based on the pageLayout value from the API.
 *
 * Sidebar content is CMS block HTML fetched from KV/API.
 * If a sidebar slot has no content, it renders empty (CSS handles collapse).
 */
export const LayoutShell: FC<LayoutShellProps> = ({ template, sidebarLeft, sidebarRight, children }) => {
  // For 'empty' and 'one_column', no sidebars needed
  if (template === 'empty' || template === 'one_column' || template === 'minimal') {
    return (
      <div class="max-w-7xl mx-auto px-4">
        {children}
      </div>
    );
  }

  if (template === 'two_columns_left') {
    return (
      <div class="max-w-7xl mx-auto px-4 grid grid-cols-[240px_1fr] gap-8 max-lg:grid-cols-1">
        <aside class="max-lg:hidden">
          {sidebarLeft && <div dangerouslySetInnerHTML={{ __html: rewriteContentUrls(sidebarLeft) }} />}
        </aside>
        <div>
          {children}
        </div>
      </div>
    );
  }

  if (template === 'two_columns_right') {
    return (
      <div class="max-w-7xl mx-auto px-4 grid grid-cols-[1fr_240px] gap-8 max-lg:grid-cols-1">
        <div>
          {children}
        </div>
        <aside class="max-lg:hidden">
          {sidebarRight && <div dangerouslySetInnerHTML={{ __html: rewriteContentUrls(sidebarRight) }} />}
        </aside>
      </div>
    );
  }

  if (template === 'three_columns') {
    return (
      <div class="max-w-7xl mx-auto px-4 grid grid-cols-[200px_1fr_200px] gap-8 max-lg:grid-cols-1">
        <aside class="max-lg:hidden">
          {sidebarLeft && <div dangerouslySetInnerHTML={{ __html: rewriteContentUrls(sidebarLeft) }} />}
        </aside>
        <div>
          {children}
        </div>
        <aside class="max-lg:hidden">
          {sidebarRight && <div dangerouslySetInnerHTML={{ __html: rewriteContentUrls(sidebarRight) }} />}
        </aside>
      </div>
    );
  }

  // Fallback: one_column
  return (
    <div class="max-w-7xl mx-auto px-4">
      {children}
    </div>
  );
};