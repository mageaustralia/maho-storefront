/**
 * Maho Storefront — Filterable Pages Plugin
 * MegaMenuPanel: renders attribute columns + featured product in a mega dropdown
 *
 * Usage:
 *   <MegaMenuPanel menuData={menuData} categoryUrlKey="racquets" />
 *
 * Renders inside the header's mega dropdown. Each column shows attribute options
 * (brands, sizes, etc.) with product counts and clean URLs. The rightmost column
 * shows a featured product if configured.
 */

import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';
import type { MenuData, MenuColumn, FeaturedProduct } from '../../../types';

interface MegaMenuPanelProps {
  menuData: MenuData;
  categoryUrlKey: string;
}

export const MegaMenuPanel: FC<MegaMenuPanelProps> = ({ menuData, categoryUrlKey }) => {
  if (!menuData.columns?.length) return null;

  const hasFeatured = !!menuData.featuredProduct;
  const columnsCount = menuData.columns.length;

  return (
    <div class="flex gap-6">
      {/* Attribute columns */}
      <div class={`flex-1 grid gap-6 ${columnsCount >= 3 ? 'grid-cols-3' : columnsCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {menuData.columns.map((column) => (
          <MegaMenuColumn
            key={column.attributeCode}
            column={column}
            categoryUrlKey={categoryUrlKey}
          />
        ))}
      </div>

      {/* Featured product */}
      {hasFeatured && (
        <FeaturedProductCard product={menuData.featuredProduct!} />
      )}
    </div>
  );
};

const MegaMenuColumn: FC<{ column: MenuColumn; categoryUrlKey: string }> = ({ column, categoryUrlKey }) => (
  <div>
    <div class="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-3">
      {column.title}
    </div>
    <div class="flex flex-col gap-0.5">
      {column.items.map((item) => (
        <a
          key={item.optionId}
          href={`/${categoryUrlKey}/${item.urlKey}`}
          data-turbo-prefetch="true"
          class="block px-2 py-1.5 text-sm text-base-content/70 rounded-md no-underline transition-colors hover:text-base-content hover:bg-base-content/10"
        >
          {item.label}
          <span class="text-base-content/30 text-xs ml-1">({item.count})</span>
        </a>
      ))}
    </div>
  </div>
);

const FeaturedProductCard: FC<{ product: FeaturedProduct }> = ({ product }) => (
  <a
    href={product.url}
    class="shrink-0 w-[200px] rounded-lg overflow-hidden bg-base-200 no-underline group/featured flex flex-col"
    data-turbo-prefetch="true"
  >
    {product.imageUrl && (
      <div class="aspect-square overflow-hidden bg-base-200">
        <img
          src={product.imageUrl}
          alt={product.name}
          class="w-full h-full object-contain group-hover/featured:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
    )}
    <div class="p-3">
      <div class="text-xs font-bold uppercase tracking-wider text-primary mb-1">Featured</div>
      <div class="text-sm font-medium text-base-content line-clamp-2">{product.name}</div>
      {product.price > 0 && (
        <div class="text-sm font-semibold text-base-content mt-1">
          ${product.price.toFixed(2)}
        </div>
      )}
    </div>
  </a>
);
