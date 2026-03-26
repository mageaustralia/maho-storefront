import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export const PromoTabs: FC<{ controller?: string }> = ({ controller = 'checkout' }) => (
  <div class="flex flex-col gap-3">
    <h2 class="text-lg font-semibold">Promo Codes</h2>
    <div class="flex gap-2">
      <input type="text" class="input input-sm grow" placeholder="Coupon code"
        data-action={`keydown.enter->${controller}#applyCoupon`}
        {...{ [`data-${controller}-target`]: 'couponInput' }} />
      <button class="btn btn-sm btn-outline" data-action={`${controller}#applyCoupon`}>Apply</button>
    </div>
    <div class="text-sm" {...{ [`data-${controller}-target`]: 'couponMessage' }} style="display:none"></div>
    <div class="flex gap-2">
      <input type="text" class="input input-sm grow" placeholder="Gift card code"
        data-action={`keydown.enter->${controller}#applyGiftcard`}
        {...{ [`data-${controller}-target`]: 'giftcardInput' }} />
      <button class="btn btn-sm btn-outline" data-action={`${controller}#applyGiftcard`}>Apply</button>
    </div>
    <div class="text-sm" {...{ [`data-${controller}-target`]: 'giftcardMessage' }} style="display:none"></div>
  </div>
);
