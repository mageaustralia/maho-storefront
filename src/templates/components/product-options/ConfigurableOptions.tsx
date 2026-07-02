/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { OptionsProps } from './types';

export interface ConfigurableOptionsProps extends OptionsProps {
  swatchMap?: Record<string, string>;
}

export const ConfigurableOptions: FC<ConfigurableOptionsProps> = ({ product, swatchMap = {} }) => {
  if (!(product.configurableOptions?.length > 0)) return null;
  return (
    <div data-product-target="optionsPanel">
      {product.configurableOptions.map((option) => {
        const isColorOption = option.code === 'color';
        return (
          <div key={option.id} class="option-group mb-4">
            <label class="text-sm font-medium mb-2 block">
              {option.label}: <span class="text-base-content/50" data-product-target="optionLabel" data-option-code={option.code}></span>
            </label>
            <div class={`flex flex-wrap ${isColorOption ? 'gap-3' : 'gap-2'}`}>
              {option.values.map((val) => {
                const swatchUrl = isColorOption ? swatchMap[val.label] : undefined;
                return swatchUrl ? (
                  <button
                    key={val.id}
                    type="button"
                    class="swatch-btn swatch-color"
                    data-action="click->product#selectOption mouseenter->product#swatchEnter mouseleave->product#swatchLeave"
                    data-attribute-code={option.code}
                    data-value={String(val.id)}
                    data-label={val.label}
                    title={val.label}
                    style={`background-image:url(${swatchUrl});background-size:cover;background-position:center`}
                  >
                    <span class="sr-only">{val.label}</span>
                  </button>
                ) : (
                  <button
                    key={val.id}
                    type="button"
                    class="swatch-btn"
                    data-action="click->product#selectOption mouseenter->product#swatchEnter mouseleave->product#swatchLeave"
                    data-attribute-code={option.code}
                    data-value={String(val.id)}
                    data-label={val.label}
                  >
                    {val.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
