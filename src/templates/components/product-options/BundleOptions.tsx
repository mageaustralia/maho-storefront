/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { OptionsProps } from './types';

export const BundleOptions: FC<OptionsProps> = ({ product, currency, formatPrice }) => {
  if (!product.bundleOptions?.length) return null;
  return (
    <div class="flex flex-col gap-4">
      {product.bundleOptions.map((option, idx) => (
        <fieldset key={option.id} class="fieldset">
          <legend class="fieldset-legend text-sm">
            {option.title || `Option ${idx + 1}`}
            {option.required && <span class="text-error ml-0.5">*</span>}
          </legend>
          {(option.type === 'select' || option.type === 'drop_down') && (
            <>
              <select
                class="select select-sm w-full"
                data-bundle-option-id={String(option.id)}
                data-action="change->product#updateBundlePrice"
              >
                <option value="">Choose...</option>
                {option.selections.map((sel) => (
                  <option key={sel.id} value={String(sel.id)} selected={sel.isDefault}>
                    {sel.name}{sel.price > 0 ? ` +${formatPrice(sel.price, currency)}` : ''}
                  </option>
                ))}
              </select>
              {option.selections.some((s) => s.canChangeQty) && (
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-sm text-base-content/60">Qty:</span>
                  <div class="qty-stepper qty-stepper-sm">
                    <button type="button" class="qty-btn" data-action="product#bundleQtyDecrement" data-option-id={String(option.id)} aria-label="Decrease quantity">-</button>
                    <input type="number" value="1" min="1" max="99" class="qty-input" data-bundle-qty-option={String(option.id)} data-action="input->product#updateBundlePrice" />
                    <button type="button" class="qty-btn" data-action="product#bundleQtyIncrement" data-option-id={String(option.id)} aria-label="Increase quantity">+</button>
                  </div>
                </div>
              )}
            </>
          )}
          {option.type === 'radio' && (
            <div class="flex flex-col gap-1.5">
              {!option.required && (
                <label class="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" class="radio radio-xs" name={`bundle_option_${option.id}`} value="" data-bundle-option-id={String(option.id)} />
                  <span class="text-base-content/60">None</span>
                </label>
              )}
              {option.selections.map((sel) => (
                <label key={sel.id} class="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    class="radio radio-xs"
                    name={`bundle_option_${option.id}`}
                    value={String(sel.id)}
                    checked={sel.isDefault}
                    data-bundle-option-id={String(option.id)}
                  />
                  <span>{sel.name}</span>
                  {sel.price > 0 && <span class="text-base-content/50">+{formatPrice(sel.price, currency)}</span>}
                </label>
              ))}
            </div>
          )}
          {(option.type === 'checkbox' || option.type === 'multi') && (
            <div class="flex flex-col gap-1.5">
              {option.selections.map((sel) => (
                <label key={sel.id} class="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs"
                    value={String(sel.id)}
                    checked={sel.isDefault}
                    data-bundle-option-id={String(option.id)}
                  />
                  <span>{sel.name}</span>
                  {sel.price > 0 && <span class="text-base-content/50">+{formatPrice(sel.price, currency)}</span>}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}
    </div>
  );
};
