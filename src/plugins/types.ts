/**
 * Maho Storefront Plugin System
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { FC } from 'hono/jsx';
import type { StoreConfig } from '../types';

export interface PluginSlotEntry {
  /** Slot name, e.g. "auth.login.after", "layout.body.end" */
  slot: string;
  /** The JSX component to render in that slot */
  component: FC<{ config: StoreConfig }>;
  /** Sort order within the slot (lower = earlier). Default 10 */
  order?: number;
}

export interface PluginHeadScript {
  /** Unique key for deduplication */
  key: string;
  /** External script URL */
  src?: string;
  /** Inline script content — string or function that receives config */
  inline?: string | ((config: StoreConfig) => string);
  /** Only load if this returns true */
  when?: (config: StoreConfig) => boolean;
  async?: boolean;
  defer?: boolean;
}

export interface PluginControllerEntry {
  /** Stimulus controller name (e.g. "social-auth") */
  name: string;
  /** The controller class */
  controller: any;
}

export interface PluginManifest {
  /** Unique plugin identifier */
  name: string;
  /** SSR slot registrations */
  slots?: PluginSlotEntry[];
  /** Stimulus controllers to register */
  controllers?: PluginControllerEntry[];
  /** Head scripts to inject (SDKs, config globals) */
  headScripts?: PluginHeadScript[];
}
