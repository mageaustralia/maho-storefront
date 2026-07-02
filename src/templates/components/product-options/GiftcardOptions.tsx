/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { OptionsProps } from './types';

export const GiftcardOptions: FC<OptionsProps> = ({ product, currency, formatPrice }) => {
  const hasAmountDropdown =
    (product.giftcardType === 'fixed' || product.giftcardType === 'combined')
    && (product.giftcardAmounts?.length ?? 0) > 0;
  const hasCustomAmount = product.giftcardType === 'range' || product.giftcardType === 'combined';
  const customHidden = product.giftcardType === 'combined';
  return (
    <div class="flex flex-col gap-3">
      {hasAmountDropdown && (
        <div>
          <label for="giftcard_amount_select" class="text-sm font-medium mb-1 block">
            Select Amount <span class="text-error ml-0.5">*</span>
          </label>
          <select id="giftcard_amount_select" class="select select-sm w-full" required data-giftcard-field="amount_select">
            <option value="">-- Please Select --</option>
            {product.giftcardAmounts!.map((amt) => (
              <option key={amt} value={String(amt)}>{formatPrice(amt, currency)}</option>
            ))}
            {product.giftcardType === 'combined' && <option value="custom">Other Amount</option>}
          </select>
        </div>
      )}
      {hasCustomAmount && (
        <div data-giftcard-field="custom_wrap" style={customHidden ? 'display:none' : ''}>
          <label for="giftcard_custom_amount" class="text-sm font-medium mb-1 block">
            {product.giftcardType === 'range' ? 'Amount' : 'Custom Amount'} <span class="text-error ml-0.5">*</span>
            {product.giftcardMinAmount && product.giftcardMaxAmount && (
              <span class="text-xs text-base-content/60 ml-2">({product.giftcardMinAmount} - {product.giftcardMaxAmount})</span>
            )}
          </label>
          <input
            type="number"
            id="giftcard_custom_amount"
            class="input input-sm w-full"
            step="1"
            min={product.giftcardMinAmount ?? undefined}
            max={product.giftcardMaxAmount ?? undefined}
            required={product.giftcardType === 'range'}
            data-giftcard-field="custom_amount"
          />
        </div>
      )}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label for="giftcard_sender_name" class="text-sm font-medium mb-1 block">Your Name <span class="text-error ml-0.5">*</span></label>
          <input type="text" id="giftcard_sender_name" class="input input-sm w-full" maxLength={255} required data-giftcard-field="sender_name" />
        </div>
        <div>
          <label for="giftcard_sender_email" class="text-sm font-medium mb-1 block">Your Email <span class="text-error ml-0.5">*</span></label>
          <input type="email" id="giftcard_sender_email" class="input input-sm w-full" maxLength={255} autoComplete="email" required data-giftcard-field="sender_email" />
        </div>
        <div>
          <label for="giftcard_recipient_name" class="text-sm font-medium mb-1 block">Recipient Name <span class="text-error ml-0.5">*</span></label>
          <input type="text" id="giftcard_recipient_name" class="input input-sm w-full" maxLength={255} required data-giftcard-field="recipient_name" />
        </div>
        <div>
          <label for="giftcard_recipient_email" class="text-sm font-medium mb-1 block">Recipient Email <span class="text-error ml-0.5">*</span></label>
          <input type="email" id="giftcard_recipient_email" class="input input-sm w-full" maxLength={255} autoComplete="off" required data-giftcard-field="recipient_email" />
        </div>
      </div>
      {product.giftcardIsMessageAllowed && (
        <div>
          <label for="giftcard_message" class="text-sm font-medium mb-1 block">Personal Message</label>
          <textarea id="giftcard_message" class="textarea textarea-sm w-full" rows={3} maxLength={500} placeholder="Add a message..." data-giftcard-field="message" />
        </div>
      )}
      <div>
        <label for="giftcard_delivery_date" class="text-sm font-medium mb-1 block">
          Schedule Delivery <span class="text-xs text-base-content/60">(optional)</span>
        </label>
        <input type="date" id="giftcard_delivery_date" class="input input-sm w-full" data-giftcard-field="delivery_date" />
      </div>
    </div>
  );
};
