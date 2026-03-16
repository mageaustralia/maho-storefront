/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { StoreConfig } from '../../types';
import { plugins } from '../../generated/plugin-registry';

/**
 * Injects plugin SDK scripts into <head>.
 * Each plugin declares its scripts with conditional loading via `when()`.
 */
export const PluginHeadScripts: FC<{ config: StoreConfig }> = ({ config }) => {
  const scripts = plugins
    .flatMap(p => p.headScripts ?? [])
    .filter(s => !s.when || s.when(config));

  if (!scripts.length) return null;

  return (
    <>
      {scripts.map(s => {
        if (s.inline) {
          const content = typeof s.inline === 'function' ? s.inline(config) : s.inline;
          return <script key={s.key} dangerouslySetInnerHTML={{ __html: content }} />;
        }
        return <script key={s.key} src={s.src} async={s.async} defer={s.defer}></script>;
      })}
    </>
  );
};
