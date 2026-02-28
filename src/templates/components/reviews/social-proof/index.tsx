/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Social Proof — Variant Index
 *
 * Re-exports the active SocialProof variant based on page.json config.
 */
import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import { getVariant } from '../../../../page-config';
import { SocialProofStrip } from './SocialProofStrip';
import type { SocialProofProps, SocialProofItem } from './SocialProofStrip';

const variants: Record<string, FC<SocialProofProps>> = {
  strip: SocialProofStrip,
};

export const SocialProof: FC<SocialProofProps> = (props) => {
  const variant = getVariant('reviews', 'social-proof', 'strip');
  const Component = variants[variant] ?? variants.strip;
  return <Component {...props} />;
};

export type { SocialProofProps, SocialProofItem };
export { SocialProofStrip };