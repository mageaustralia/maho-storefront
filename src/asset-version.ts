/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// @ts-expect-error — static asset imports handled by wrangler
import controllers from '../public/controllers.js.txt';
// @ts-expect-error — static asset imports handled by wrangler
import styles from '../public/styles.css';
import { allPageConfigs } from './generated/store-registry';

function contentHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export const ASSET_HASH = contentHash(controllers + styles + JSON.stringify(allPageConfigs));
