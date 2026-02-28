/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product as ProductType } from '../../../../types';
import { ProductCard } from '../card/index';
import { getSection } from '../../../../page-config';

interface TabsAccordionProps {
  product: ProductType;
  currency: string;
}

/**
 * Product Content — Accordion
 *
 * Collapsible sections for description, reviews, related, and upsell.
 * Fits naturally in a sidebar layout. Description open by default.
 */
export const TabsAccordion: FC<TabsAccordionProps> = ({ product, currency }) => {
  const hasRelated = product.relatedProducts && product.relatedProducts.length > 0;
  const hasUpsell = product.upsellProducts && product.upsellProducts.length > 0;
  const showSpecs = getSection<boolean>('product', 'showSpecifications', true);

  const chevron = <svg class="w-4 h-4 transition-transform group-open:rotate-180 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>;

  return (
    <div class="flex flex-col divide-y divide-base-300 border-t border-base-300">
      {/* Description */}
      {product.description && (
        <details class="group" open>
          <summary class="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold select-none">
            Description
            {chevron}
          </summary>
          <div class="pb-4 text-sm text-base-content/70 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
        </details>
      )}

      {/* Specifications / Additional Attributes */}
      {showSpecs && product.additionalAttributes && product.additionalAttributes.length > 0 && (
        <details class="group">
          <summary class="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold select-none">
            Specifications
            {chevron}
          </summary>
          <div class="pb-4">
            <table class="table table-zebra table-sm w-full">
              <tbody>
                {product.additionalAttributes.map((attr) => (
                  <tr key={attr.code}>
                    <td class="font-medium w-2/5 text-base-content/80">{attr.label}</td>
                    <td>{attr.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Reviews */}
      <details class="group" id="accordion-reviews"
        data-controller="review"
        data-review-product-id-value={String(product.id)}
        data-review-review-count-value={String(product.reviewCount)}
      >
        <summary class="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold select-none">
          <span class="flex items-center gap-2">
            Reviews
            {product.reviewCount > 0 && <span class="badge badge-sm badge-ghost">{product.reviewCount}</span>}
          </span>
          {chevron}
        </summary>
        <div class="pb-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-sm">
              {product.reviewCount > 0 ? (
                <>
                  <span class="stars" style={`--rating: ${product.averageRating ?? 0}`}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span class="text-base-content/60">{product.averageRating?.toFixed(1)} ({product.reviewCount})</span>
                </>
              ) : (
                <span class="text-base-content/50 text-sm">No reviews yet</span>
              )}
            </div>
            <button class="btn btn-xs btn-outline" data-action="review#toggleForm">Write a Review</button>
          </div>
          <div class="review-form-wrap" data-review-target="formWrap" style="display:none">
            <form data-action="submit->review#submit" class="flex flex-col gap-3">
              <div data-review-target="ratingPicker">
                <label class="text-sm font-medium">Your Rating</label>
                <div class="rating-stars-input flex gap-1 mt-1">
                  {[1,2,3,4,5].map(n => (
                    <button type="button" data-action="review#setRating" data-rating={String(n)} aria-label={`${n} stars`} class="text-lg">&#9733;</button>
                  ))}
                </div>
                <input type="hidden" name="rating" data-review-target="ratingInput" value="" />
              </div>
              <input type="text" name="nickname" placeholder="Your Name" required maxLength={255} class="input input-sm w-full" data-review-target="nickname" />
              <input type="text" name="title" placeholder="Review Title" required maxLength={255} class="input input-sm w-full" data-review-target="title" />
              <textarea name="detail" placeholder="Your Review" required rows={3} class="textarea textarea-sm w-full" data-review-target="detail"></textarea>
              <div class="flex gap-2">
                <button type="submit" class="btn btn-sm btn-primary" data-review-target="submitBtn">Submit</button>
                <button type="button" class="btn btn-sm btn-ghost" data-action="review#toggleForm">Cancel</button>
              </div>
              <p class="text-sm" data-review-target="message"></p>
            </form>
          </div>
          <div data-review-target="list">
            <p class="text-sm text-base-content/50" data-review-target="loading">Loading reviews...</p>
          </div>
          <div data-review-target="pagination" style="display:none"></div>
        </div>
      </details>

      {/* Related Products */}
      {hasRelated && (
        <details class="group">
          <summary class="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold select-none">
            Related Products
            {chevron}
          </summary>
          <div class="pb-4 grid grid-cols-2 gap-3">
            {product.relatedProducts!.slice(0, 4).map((rp) => (
              <ProductCard key={rp.id} product={rp} currency={currency} />
            ))}
          </div>
        </details>
      )}

      {/* Upsell Products */}
      {hasUpsell && (
        <details class="group">
          <summary class="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold select-none">
            You Might Also Like
            {chevron}
          </summary>
          <div class="pb-4 grid grid-cols-2 gap-3">
            {product.upsellProducts!.slice(0, 4).map((up) => (
              <ProductCard key={up.id} product={up} currency={currency} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
};