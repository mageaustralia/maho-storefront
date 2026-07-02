/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * ProductOptions — dispatcher that renders the option UI for a product's type.
 * Each product-type module is self-contained and adopts the same DaisyUI styling
 * so layouts (Product.tsx, LayoutMasonry.tsx, InfoPanelCompact.tsx) can drop the
 * inline branching and just render <ProductOptions>.
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { OptionsProps } from './types';
import { ConfigurableOptions } from './ConfigurableOptions';
import { GroupedOptions } from './GroupedOptions';
import { BundleOptions } from './BundleOptions';
import { DownloadableOptions } from './DownloadableOptions';
import { GiftcardOptions } from './GiftcardOptions';
import { CustomOptions } from './CustomOptions';

export interface ProductOptionsProps extends OptionsProps {
  swatchMap?: Record<string, string>;
  /** 'compact' (default) — narrow-column DaisyUI. 'standard' — table/qty-stepper for wider layouts. */
  variant?: 'compact' | 'standard';
  /** Skip the configurable option UI (when the layout renders it elsewhere, e.g. in a sticky bar). */
  excludeConfigurable?: boolean;
}

export const ProductOptions: FC<ProductOptionsProps> = ({ product, currency, formatPrice, swatchMap, variant = 'compact', excludeConfigurable = false }) => {
  const props = { product, currency, formatPrice };
  return (
    <>
      {!excludeConfigurable && product.type === 'configurable' && <ConfigurableOptions {...props} swatchMap={swatchMap} />}
      {product.type === 'grouped' && <GroupedOptions {...props} variant={variant} />}
      {product.type === 'bundle' && <BundleOptions {...props} />}
      {product.type === 'downloadable' && <DownloadableOptions {...props} />}
      {product.type === 'giftcard' && <GiftcardOptions {...props} />}
      <CustomOptions {...props} />
    </>
  );
};

export {
  ConfigurableOptions,
  GroupedOptions,
  BundleOptions,
  DownloadableOptions,
  GiftcardOptions,
  CustomOptions,
};
export type { OptionsProps };
