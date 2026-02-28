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

interface TabsTabbedProps {
  product: ProductType;
  currency: string;
}

/**
 * Product Content — Full-Width Tabbed
 *
 * Traditional below-the-fold sections: description, reviews, related, upsell.
 * Each section gets its own full-width block. Best for standard 2-column layouts.
 */
export const TabsTabbed: FC<TabsTabbedProps> = ({ product, currency }) => {
  const hasRelated = product.relatedProducts && product.relatedProducts.length > 0;
  const hasUpsell = product.upsellProducts && product.upsellProducts.length > 0;
  const showSpecs = getSection<boolean>('product', 'showSpecifications', true);

  return (
    <>
      {/* Full Description */}
      {product.description && (
        <div class="product-full-description">
          <h2>Description</h2>
          <div class="description-content" dangerouslySetInnerHTML={{ __html: product.description }} />
        </div>
      )}

      {/* Specifications / Additional Attributes */}
      {showSpecs && product.additionalAttributes && product.additionalAttributes.length > 0 && (
        <div class="product-specifications mt-8">
          <h2>Specifications</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
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
        </div>
      )}

      {/* Reviews */}
      <section class="product-reviews" id="reviews"
        data-controller="review"
        data-review-product-id-value={String(product.id)}
        data-review-review-count-value={String(product.reviewCount)}
      >
        <h2>Customer Reviews</h2>

        <div class="reviews-summary">
          <div class="reviews-summary-rating">
            {product.reviewCount > 0 ? (
              <>
                <span class="stars" style={`--rating: ${product.averageRating ?? 0}`}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <span>{product.averageRating?.toFixed(1)} out of 5</span>
                <span class="reviews-total">({product.reviewCount} reviews)</span>
              </>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>
          <button class="btn btn-secondary" data-action="review#toggleForm">Write a Review</button>
        </div>

        <div class="review-form-wrap" data-review-target="formWrap" style="display:none">
          <form data-action="submit->review#submit">
            <div class="review-rating-picker" data-review-target="ratingPicker">
              <label>Your Rating</label>
              <div class="rating-stars-input">
                {[1,2,3,4,5].map(n => (
                  <button type="button" data-action="review#setRating" data-rating={String(n)} aria-label={`${n} stars`}>&#9733;</button>
                ))}
              </div>
              <input type="hidden" name="rating" data-review-target="ratingInput" value="" />
            </div>
            <input type="text" name="nickname" placeholder="Your Name" required maxLength={255} data-review-target="nickname" />
            <input type="text" name="title" placeholder="Review Title" required maxLength={255} data-review-target="title" />
            <textarea name="detail" placeholder="Your Review" required rows={4} data-review-target="detail"></textarea>
            <div class="review-form-actions">
              <button type="submit" class="btn btn-primary" data-review-target="submitBtn">Submit Review</button>
              <button type="button" class="btn btn-secondary" data-action="review#toggleForm">Cancel</button>
            </div>
            <p class="review-form-message" data-review-target="message"></p>
          </form>
        </div>

        <div class="review-list" data-review-target="list">
          <p class="review-loading" data-review-target="loading">Loading reviews...</p>
        </div>

        <div class="review-pagination" data-review-target="pagination" style="display:none"></div>
      </section>

      {/* Related Products */}
      {hasRelated && (
        <div class="mt-12">
          <h2 class="text-xl font-bold mb-4">Related Products</h2>
          <div class="grid grid-cols-2 gap-4">
            {product.relatedProducts!.slice(0, 8).map((rp) => (
              <ProductCard key={rp.id} product={rp} currency={currency} />
            ))}
          </div>
        </div>
      )}

      {/* Upsell Products */}
      {hasUpsell && (
        <div class="mt-12">
          <h2 class="text-xl font-bold mb-4">You Might Also Consider</h2>
          <div class="grid grid-cols-2 gap-4">
            {product.upsellProducts!.slice(0, 8).map((up) => (
              <ProductCard key={up.id} product={up} currency={currency} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};