/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { Product as ProductType } from '../../../../types';

interface InfoPanelCompactProps {
  product: ProductType;
  currency: string;
  formatPrice: (amount: number | null, currency: string) => string;
  swatchMap?: Record<string, string>;
}

/**
 * Compact Info Panel
 *
 * Slim sidebar-friendly product info: title, SKU, rating, price, stock,
 * short description, configurable/grouped/bundle/downloadable/custom options,
 * and add-to-cart. Designed for narrow column layouts (~35% width).
 */
export const InfoPanelCompact: FC<InfoPanelCompactProps> = ({ product, currency, formatPrice, swatchMap = {} }) => {
  const hasDiscount = product.specialPrice !== null && product.specialPrice < (product.price ?? 0);
  const displayPrice = product.finalPrice ?? product.price;
  const isConfigurable = product.type === 'configurable' && product.configurableOptions?.length > 0;
  const isGrouped = product.type === 'grouped' && product.groupedProducts?.length;
  const isBundle = product.type === 'bundle' && product.bundleOptions?.length;
  const isDownloadable = product.type === 'downloadable' && product.downloadableLinks?.length;
  const hasCustomOptions = product.customOptions?.length > 0;

  return (
    <div class="flex flex-col gap-5">
      {/* Title + SKU */}
      <div>
        <h1 class="text-xl font-bold leading-tight mb-1">{product.name}</h1>
        <p class="text-xs text-base-content/40" data-product-target="sku">SKU: {product.sku}</p>
      </div>

      {/* Rating */}
      {product.reviewCount > 0 && (
        <a href="#accordion-reviews" class="flex items-center gap-2 text-sm no-underline">
          <span class="stars" style={`--rating: ${product.averageRating ?? 0}`}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
          <span class="text-base-content/60">{product.reviewCount} reviews</span>
        </a>
      )}

      {/* Price */}
      {!isGrouped && (
        <div data-product-target="price">
          {isBundle ? (
            <div>
              {product.minimalPrice && (
                <div>
                  <span class="text-sm text-base-content/60">From </span>
                  <span class="text-2xl font-bold text-primary">{formatPrice(product.minimalPrice, currency)}</span>
                </div>
              )}
              <div class="text-sm mt-1" data-product-target="bundleConfiguredPrice" style="display:none">
                <span class="text-base-content/60">Price as configured: </span>
                <span class="font-bold text-lg" data-product-target="bundleTotal"></span>
              </div>
            </div>
          ) : hasDiscount ? (
            <div class="flex items-baseline gap-3">
              <span class="text-2xl font-bold text-error">{formatPrice(product.specialPrice, currency)}</span>
              <span class="text-base text-base-content/40 line-through">{formatPrice(product.price, currency)}</span>
            </div>
          ) : (
            <span class="text-2xl font-bold text-primary">{formatPrice(displayPrice, currency)}</span>
          )}
        </div>
      )}

      {/* Stock */}
      <div data-product-target="stock">
        {product.stockStatus === 'in_stock' ? (
          <span class="flex items-center gap-1.5 text-sm text-success">
            <span class="w-2 h-2 rounded-full bg-success inline-block"></span>
            In Stock
          </span>
        ) : (
          <span class="flex items-center gap-1.5 text-sm text-error">
            <span class="w-2 h-2 rounded-full bg-error inline-block"></span>
            Out of Stock
          </span>
        )}
      </div>

      {/* Short description */}
      {product.shortDescription && (
        <div class="text-sm text-base-content/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.shortDescription }} />
      )}

      {/* Configurable Options */}
      {isConfigurable && (
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
      )}

      {/* Grouped Products */}
      {isGrouped && (
        <div class="flex flex-col gap-3">
          {product.groupedProducts!.map((child) => (
            <div key={child.id} class="flex items-center gap-3 text-sm">
              {child.thumbnailUrl && <img src={child.thumbnailUrl} alt={child.name} class="w-10 h-10 rounded object-cover" />}
              <div class="flex-1">
                <p class="font-medium">{child.name}</p>
                <p class="text-primary font-semibold">{formatPrice(child.finalPrice ?? child.price, currency)}</p>
              </div>
              <input type="number" value={String(child.defaultQty || 0)} min="0" max="99" class="input input-sm w-16 text-center" data-grouped-id={String(child.id)} />
            </div>
          ))}
        </div>
      )}

      {/* Bundle Options */}
      {isBundle && (
        <div class="flex flex-col gap-4">
          {product.bundleOptions!.map((option, idx) => (
            <fieldset key={option.id} class="fieldset">
              <legend class="fieldset-legend text-sm">
                {option.title || `Option ${idx + 1}`}
                {option.required && <span class="text-error ml-0.5">*</span>}
              </legend>
              {(option.type === 'select' || option.type === 'drop_down') && (
                <select class="select select-sm w-full" data-bundle-option-id={String(option.id)} data-action="change->product#updateBundlePrice">
                  <option value="">Choose...</option>
                  {option.selections.map((sel) => (
                    <option key={sel.id} value={String(sel.id)} selected={sel.isDefault}>
                      {sel.name}{sel.price > 0 ? ` +${formatPrice(sel.price, currency)}` : ''}
                    </option>
                  ))}
                </select>
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
                      <input type="radio" class="radio radio-xs" name={`bundle_option_${option.id}`} value={String(sel.id)} checked={sel.isDefault} data-bundle-option-id={String(option.id)} />
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
                      <input type="checkbox" class="checkbox checkbox-xs" value={String(sel.id)} checked={sel.isDefault} data-bundle-option-id={String(option.id)} />
                      <span>{sel.name}</span>
                      {sel.price > 0 && <span class="text-base-content/50">+{formatPrice(sel.price, currency)}</span>}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ))}
        </div>
      )}

      {/* Downloadable Links */}
      {isDownloadable && (
        <div>
          <label class="text-sm font-medium mb-2 block">Available Downloads</label>
          {product.downloadableLinks!.map((link) => (
            <label key={link.id} class="flex items-center gap-2 text-sm mb-1">
              {product.linksPurchasedSeparately && <input type="checkbox" class="checkbox checkbox-xs" data-download-link-id={String(link.id)} />}
              <span>{link.title}</span>
              {product.linksPurchasedSeparately && link.price > 0 && <span class="text-base-content/50">+{formatPrice(link.price, currency)}</span>}
            </label>
          ))}
        </div>
      )}

      {/* Custom Options */}
      {hasCustomOptions && (
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
                    <option key={val.id} value={String(val.id)}>{val.title} {val.price > 0 ? `(+${formatPrice(val.price, currency)})` : ''}</option>
                  ))}
                </select>
              ) : (option.type === 'area' || option.type === 'textarea') ? (
                <textarea class="textarea textarea-sm w-full" rows={3} data-custom-option-id={String(option.id)} placeholder={option.title} />
              ) : (
                <input type="text" class="input input-sm w-full" data-custom-option-id={String(option.id)} placeholder={option.title} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add to Cart */}
      <div data-product-target="actionsSticky">
        {product.stockStatus === 'in_stock' ? (
          <div class="flex flex-col gap-3">
            {!isGrouped && !isBundle && (
              <div class="flex items-center gap-3">
                <div class="join">
                  <button type="button" class="btn btn-sm join-item" data-action="product#decrementQty" aria-label="Decrease quantity">-</button>
                  <input type="number" value="1" min="1" max="99" class="input input-sm join-item w-14 text-center" data-product-target="qty" />
                  <button type="button" class="btn btn-sm join-item" data-action="product#incrementQty" aria-label="Increase quantity">+</button>
                </div>
                <button class="wishlist-btn" data-action="click->wishlist#toggle" data-product-id={String(product.id)} aria-label="Add to Wishlist" style="width:36px;height:36px;flex-shrink:0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            )}
            <button class="btn btn-primary w-full" data-action="product#stickyAdd" data-product-target="addButton">
              Add to Cart
            </button>
            <div class="text-sm text-center" data-product-target="message"></div>
          </div>
        ) : (
          <div class="flex items-center gap-3">
            <button class="btn btn-disabled w-full" disabled>Out of Stock</button>
            <button class="wishlist-btn" data-action="click->wishlist#toggle" data-product-id={String(product.id)} aria-label="Add to Wishlist" style="width:36px;height:36px;flex-shrink:0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};