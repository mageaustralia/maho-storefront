/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface FeatureBlock {
  heading: string;
  body: string;
}

interface FeatureBlocksProps {
  blocks: FeatureBlock[];
}

/**
 * Feature highlights section rendered as alternating icon + text rows,
 * or a simple card grid when many blocks are present.
 * Renders nothing when the blocks array is empty.
 */
export const FeatureBlocks: FC<FeatureBlocksProps> = ({ blocks }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div class="my-10">
      <h2 class="mb-6 text-xl font-semibold tracking-tight">Key features</h2>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {blocks.map((block, i) => (
          <div
            key={i}
            class="border border-base-300 bg-base-100 p-5"
          >
            <h3 class="mb-2 text-sm font-semibold uppercase tracking-wider text-base-content/80">
              {block.heading}
            </h3>
            <p class="text-sm leading-relaxed text-base-content/70">{block.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
