/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { OptionsProps } from './types';

export const CustomOptions: FC<OptionsProps> = ({ product, currency, formatPrice }) => {
  if (!(product.customOptions?.length > 0)) return null;
  return (
    <div class="flex flex-col gap-3">
      {product.customOptions.map((option) => (
        <div key={option.id}>
          <label class="text-sm font-medium mb-1 block">
            {option.title}
            {option.isRequired && <span class="text-error ml-0.5">*</span>}
          </label>
          {(option.type === 'drop_down' || option.type === 'select') ? (
            <select class="select select-sm w-full" data-custom-option-id={String(option.id)}>
              <option value="">Select {option.title}</option>
              {option.values.map((val) => (
                <option key={val.id} value={String(val.id)}>
                  {val.title} {val.price > 0 ? `(+${formatPrice(val.price, currency)})` : ''}
                </option>
              ))}
            </select>
          ) : (option.type === 'checkbox' || option.type === 'multiple') ? (
            <div class="flex flex-col gap-1.5">
              {option.values.map((val) => (
                <label key={val.id} class="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" class="checkbox checkbox-xs" value={String(val.id)} data-custom-option-id={String(option.id)} />
                  <span>{val.title}</span>
                  {val.price > 0 && <span class="text-base-content/50">+{formatPrice(val.price, currency)}</span>}
                </label>
              ))}
            </div>
          ) : (option.type === 'radio') ? (
            <div class="flex flex-col gap-1.5">
              {option.values.map((val) => (
                <label key={val.id} class="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" class="radio radio-xs" name={`custom_option_${option.id}`} value={String(val.id)} data-custom-option-id={String(option.id)} />
                  <span>{val.title}</span>
                  {val.price > 0 && <span class="text-base-content/50">+{formatPrice(val.price, currency)}</span>}
                </label>
              ))}
            </div>
          ) : (option.type === 'file') ? (
            <div>
              <input type="file" class="file-input file-input-sm file-input-bordered w-full" data-custom-option-file-id={String(option.id)} accept="image/*,.pdf" />
              <p class="text-xs opacity-60 mt-1">Upload an image or PDF</p>
            </div>
          ) : (option.type === 'area' || option.type === 'textarea') ? (
            <textarea class="textarea textarea-sm w-full" rows={3} data-custom-option-id={String(option.id)} placeholder={option.title} />
          ) : (option.type === 'date') ? (
            <input type="date" class="input input-sm w-full" data-custom-option-id={String(option.id)} />
          ) : (option.type === 'date_time') ? (
            <input type="datetime-local" class="input input-sm w-full" data-custom-option-id={String(option.id)} />
          ) : (option.type === 'time') ? (
            <input type="time" class="input input-sm w-full" data-custom-option-id={String(option.id)} />
          ) : (
            <input type="text" class="input input-sm w-full" data-custom-option-id={String(option.id)} placeholder={option.title} />
          )}
        </div>
      ))}
    </div>
  );
};
