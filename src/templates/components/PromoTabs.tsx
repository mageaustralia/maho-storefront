/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

interface PromoTabsProps {
  controller: string;
  hidden?: boolean;
}

/**
 * Shared promo tabs — coupon code + gift card inputs.
 * Used in both Cart and Checkout order summaries.
 * DaisyUI radio tabs handle show/hide natively via CSS.
 */
export const PromoTabs: FC<PromoTabsProps> = ({ controller, hidden }) => {
  const t = (name: string) => `${controller}-target`;
  const target = (name: string) => ({ [`data-${controller}-target`]: name });
  const action = (method: string) => `${controller}#${method}`;

  return (
    <div class="mt-4 border-t border-border pt-4" style={hidden ? 'display:none' : undefined} {...target('promoTabs')}>
      <div class="tabs tabs-border">
        <input type="radio" name={`${controller}_promo_tabs`} class="tab" aria-label="Coupon Code" checked {...target('couponTab')} />
        <div class="tab-content pt-3">
          <div {...target('couponForm')}>
            <div class="flex gap-2">
              <input type="text" class="input input-sm flex-1" placeholder="Enter coupon code"
                {...target('couponInput')} data-action={`keydown.enter->${action('applyCoupon')}`} />
              <button class="btn btn-sm btn-outline btn-primary" data-action={action('applyCoupon')}>Apply</button>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-2" style="display:none" {...target('couponApplied')}>
            <span class="badge badge-outline" {...target('couponBadge')}></span>
            <button class="btn btn-ghost btn-xs text-error" data-action={action('removeCoupon')} aria-label="Remove coupon">&times;</button>
          </div>
        </div>
        <input type="radio" name={`${controller}_promo_tabs`} class="tab" aria-label="Gift Card" {...target('giftcardTab')} />
        <div class="tab-content pt-3">
          <div class="flex gap-2">
            <input type="text" class="input input-sm flex-1" placeholder="Enter gift card code"
              {...target('giftcardInput')} data-action={`keydown.enter->${action('applyGiftcard')}`} />
            <button class="btn btn-sm btn-outline btn-primary" data-action={action('applyGiftcard')}>Apply</button>
          </div>
          <div class="flex flex-wrap gap-2 mt-2" style="display:none" {...target('giftcardsApplied')}></div>
        </div>
      </div>
    </div>
  );
};