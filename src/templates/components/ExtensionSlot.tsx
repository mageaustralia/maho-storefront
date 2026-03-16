/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { StoreConfig } from '../../types';
import { plugins } from '../../generated/plugin-registry';

interface ExtensionSlotProps {
  name: string;
  config: StoreConfig;
}

/**
 * Renders all plugin components registered for a named slot.
 * If no plugins register for the slot, renders nothing.
 */
export const ExtensionSlot: FC<ExtensionSlotProps> = ({ name, config }) => {
  const entries = plugins
    .flatMap(p => p.slots ?? [])
    .filter(s => s.slot === name)
    .sort((a, b) => (a.order ?? 10) - (b.order ?? 10));

  if (!entries.length) return null;

  return (
    <>
      {entries.map((entry, i) => {
        const Component = entry.component;
        return <Component config={config} key={`${name}-${i}`} />;
      })}
    </>
  );
};
