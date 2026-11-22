import React from 'react';
import { Heart, Star, ExternalLink } from 'lucide-react';
import type { Product } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { t } from '../i18n.ts';
import { SmartImage } from './SmartImage.tsx';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { formatPrice, navigate, wishlistIds, toggleWishlist, language } = useStore();
  const isWishlisted = wishlistIds.includes(product.id);
  const currentPrice = product.sale_price > 0 ? product.sale_price : product.selling_price;
  const hasDiscount = product.original_price > currentPrice && product.discount_percentage > 0;

  return (
    <article className="group bg-white border border-zinc-200 hover:border-zinc-900 transition-all duration-200 flex flex-col">
      {/* Image Block (68% visual emphasis) */}
      <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
        <button
          type="button"
          onClick={() => navigate({ page: 'product', productId: product.id })}
          className="w-full h-full block text-left"
        >
          <SmartImage
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        </button>

        <button
          type="button"
          onClick={() => void toggleWishlist(product.id)}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-white/95 border border-zinc-200 transition-colors ${
            isWishlisted ? 'text-[#9C7A16] border-[#C9A227]' : 'text-zinc-700 hover:text-black'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#C9A227]' : ''}`} />
        </button>

        {product.status === 'out_of_stock' && (
          <div className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-xs font-medium py-1.5 px-3 text-center">
            Out of Stock
          </div>
        )}
      </div>

      {/* Metadata & Pricing */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1.5">
          {/* Clean unboxed metadata with typographic separators */}
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="truncate font-medium uppercase tracking-wider text-zinc-600">
              {product.brand || 'SHOPNEXA'}
            </span>
            <span
              className={`shrink-0 font-medium flex items-center gap-1 ${
                product.product_type === 'affiliate' ? 'text-[#9C7A16]' : 'text-zinc-900'
              }`}
            >
              {product.product_type === 'affiliate' ? (
                <>
                  <span>{t(language, 'affiliateProductLabel')}</span>
                  <ExternalLink className="w-3 h-3" />
                </>
              ) : (
                <span>{t(language, 'ownProductLabel')}</span>
              )}
            </span>
          </div>

          <h3 className="text-base font-semibold text-zinc-950 leading-snug line-clamp-2">
            <button
              type="button"
              onClick={() => navigate({ page: 'product', productId: product.id })}
              className="text-left hover:text-[#9C7A16] transition-colors"
            >
              {product.name}
            </button>
          </h3>

          {/* Rating (real DB reviews only) */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            <Star
              className={`w-3.5 h-3.5 ${
                product.review_count > 0 ? 'fill-[#C9A227] text-[#C9A227]' : 'text-zinc-300'
              }`}
            />
            {product.review_count > 0 ? (
              <span className="font-mono tabular-nums">
                {product.rating_avg.toFixed(1)} ({product.review_count})
              </span>
            ) : (
              <span className="text-zinc-400">No reviews yet</span>
            )}
          </div>

          {/* Available Colors & Sizes */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
            {product.colors.length > 0 && (
              <div className="flex items-center gap-1.5">
                {product.colors.slice(0, 4).map((color, idx) => (
                  <span
                    key={`${color.name}-${idx}`}
                    title={color.name}
                    className="w-3.5 h-3.5 border border-zinc-300 inline-block"
                    style={{ backgroundColor: color.hex_code }}
                  />
                ))}
                {product.colors.length > 4 && (
                  <span className="text-[11px] font-mono">+{product.colors.length - 4}</span>
                )}
              </div>
            )}

            {product.sizes.length > 0 && (
              <span className="text-[11px] text-zinc-500 truncate max-w-[140px]">
                Sizes: {product.sizes.map((s) => s.label).slice(0, 3).join(', ')}
                {product.sizes.length > 3 ? '…' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Price Baseline & View Details CTA */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold font-mono tabular-nums text-zinc-950">
                {formatPrice(currentPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs font-mono tabular-nums text-zinc-400 line-through">
                  {formatPrice(product.original_price)}
                </span>
              )}
            </div>
            {hasDiscount && (
              <span className="text-xs font-medium text-[#9C7A16]">
                Save {product.discount_percentage}%
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate({ page: 'product', productId: product.id })}
            className="px-3.5 py-2 bg-zinc-950 hover:bg-[#C9A227] text-white hover:text-black text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {t(language, 'viewDetails')}
          </button>
        </div>
      </div>
    </article>
  );
}
