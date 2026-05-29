/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { getRenderImageResize } from '../page-config';

/**
 * Responsive image widths. Deliberately limited to THREE to cap the number of
 * unique Cloudflare Image Resizing transformations per source image.
 *
 * ⚠️ COST: Cloudflare Image Resizing is a PAID feature (~$0.50 per 1,000 unique
 * transformations) and must be enabled on the zone. It is OFF by default
 * (env.USE_CF_IMAGE_RESIZE unset) — when off, callers emit a plain single-`src`
 * <img> with no srcset and incur NO charges. Backend-side signed resize URLs in
 * the product API would be the free alternative (a backend change).
 */
const SRCSET_WIDTHS = [320, 640, 960];

/**
 * Reduce an image URL to a storefront-relative path so Cloudflare Image Resizing
 * fetches the already-proxied + edge-cached asset on this zone. Returns null for
 * anything that isn't a known media/asset path (e.g. external/unsplash URLs).
 */
function toZonePath(url: string): string | null {
  if (!url) return null;
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  return /^\/(media|core|skin)\//.test(path) ? path : null;
}

/**
 * Build a Cloudflare Image Resizing `srcset` (3 widths, auto format) for the
 * given image, or `null` when the feature is disabled / the URL isn't resizable.
 * `null` means the caller should render a plain <img> with no srcset.
 */
export function imageSrcset(url: string | null | undefined): string | null {
  if (!url || !getRenderImageResize()) return null;
  const path = toZonePath(url);
  if (!path) return null;
  return SRCSET_WIDTHS.map(
    (w) => `/cdn-cgi/image/width=${w},format=auto,fit=scale-down${path} ${w}w`,
  ).join(', ');
}
