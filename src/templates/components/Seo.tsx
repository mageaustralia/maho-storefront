/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface SeoProps {
  title: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
}

export const Seo: FC<SeoProps> = ({ title, description, canonicalUrl, ogImage, ogType, jsonLd }) => (
  <>
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    <meta property="og:title" content={title} />
    {description && <meta property="og:description" content={description} />}
    {ogImage && <meta property="og:image" content={ogImage} />}
    <meta property="og:type" content={ogType ?? 'website'} />
    {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    {description && <meta name="twitter:description" content={description} />}
    {ogImage && <meta name="twitter:image" content={ogImage} />}
    {jsonLd && (
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    )}
  </>
);