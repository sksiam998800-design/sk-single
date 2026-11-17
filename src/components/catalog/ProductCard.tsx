import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import type { ProductItem } from '../../types/commerce';
import { ResilientImage } from '../ui/ResilientImage';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { addToCartAsync, openCartDrawer } from '../../features/cart/cartSlice';
import { selectIsWishlisted, toggleWishlistAsync } from '../../features/wishlist/wishlistSlice';
import { showToast } from '../../features/notifications/toastSlice';
import { formatStoreCurrency } from '../../lib/dateTime';

interface ProductCardProps {
  product: ProductItem;
  compact?: boolean;
  showRating?: boolean;
}

export function ProductCard({ product, compact = false, showRating = true }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const currencyCfg = useAppSelector((s) => s.storefront.settings?.currencySettings);
  const isWishlisted = useAppSelector((s) => selectIsWishlisted(s, product.id));
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const primaryImage = product.images?.[0]?.url || '';
  const hasVariants = product.hasVariants && product.variants && product.variants.length > 0;
  const unlimitedOrBackorder = product.manageInventory === false || Boolean(product.allowBackorder);
  const outOfStock = !unlimitedOrBackorder && product.availableStock <= 0;
  const effectiveMaxStock = unlimitedOrBackorder ? Math.max(product.availableStock || 0, 99) : product.availableStock;

  const handleAddToCart = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) {
      dispatch(showToast({ variant: 'warning', message: 'This item is currently out of stock.' }));
      return;
    }

    // If product has variants, route to PDP so customer chooses the exact variant
    if (hasVariants) {
      navigate(`/product/${product.slug}`);
      return;
    }

    const res = await dispatch(
      addToCartAsync({
        isAuthenticated: Boolean(user),
        item: {
          productId: product.id,
          variantId: null,
          slug: product.slug,
          name: product.name,
          shortDescription: product.shortDescription || '',
          sku: product.sku,
          imageUrl: primaryImage,
          unitPrice: product.currentPrice,
          originalPrice: product.originalPrice,
          discountPercent: product.discountPercent,
          quantity: 1,
          availableStock: effectiveMaxStock,
          isAvailable: true,
          selected: true,
        },
      }),
    );

    if (addToCartAsync.fulfilled.match(res)) {
      dispatch(showToast({ variant: 'success', message: `${product.name} added to cart.` }));
      dispatch(openCartDrawer());
    } else {
      dispatch(showToast({ variant: 'error', message: String(res.payload || 'Unable to add to cart') }));
    }
  };

  const handleWishlist = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (togglingWishlist) return;
    setTogglingWishlist(true);
    try {
      const res = await dispatch(
        toggleWishlistAsync({
          isAuthenticated: Boolean(user),
          productId: product.id,
          product,
        }),
      );
      if (toggleWishlistAsync.fulfilled.match(res)) {
        dispatch(
          showToast({
            variant: 'success',
            message: res.payload.wishlisted ? 'Added to wishlist.' : 'Removed from wishlist.',
          }),
        );
      } else {
        dispatch(showToast({ variant: 'error', message: String(res.payload || 'Wishlist update failed') }));
      }
    } finally {
      setTogglingWishlist(false);
    }
  };

  return (
    <article className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <div className="relative mb-2.5 aspect-square w-full overflow-hidden rounded-lg bg-[#F8FAFC] p-2">
          {product.discountPercent > 0 && (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-[#1155EE] px-2 py-0.5 text-[10px] font-bold text-white">
              -{product.discountPercent}%
            </span>
          )}
          {!compact && (
            <button
              type="button"
              onClick={handleWishlist}
              disabled={togglingWishlist}
              aria-pressed={isWishlisted}
              aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
              className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-colors ${
                isWishlisted
                  ? 'border border-rose-200 bg-rose-50 text-rose-500'
                  : 'bg-white/90 text-slate-500 hover:text-rose-600'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          )}
          <Link to={`/product/${product.slug}`} className="block h-full w-full">
            <ResilientImage
              src={primaryImage}
              alt={product.name}
              className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </Link>
        </div>

        <Link
          to={`/product/${product.slug}`}
          className={`block font-semibold text-[#0F1D3A] hover:text-[#1155EE] ${
            compact ? 'line-clamp-1 text-xs text-center' : 'line-clamp-2 min-h-[2.3rem] text-[13px] leading-snug'
          }`}
        >
          {product.name}
        </Link>

        {/* Authentic ratings ONLY when real approved reviews exist */}
        {showRating && !compact && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            {product.reviewCount > 0 ? (
              <>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-[#0F1D3A]">{product.ratingAverage.toFixed(1)}</span>
                <span>({product.reviewCount})</span>
              </>
            ) : (
              <span className="text-slate-400">No reviews yet</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-2">
        <div className={`flex items-baseline gap-1.5 ${compact ? 'justify-center' : ''}`}>
          <span className="font-mono-tabular text-sm font-bold text-[#1155EE]">
            {formatStoreCurrency(product.currentPrice, currencyCfg)}
          </span>
          {product.originalPrice && !compact && (
            <span className="font-mono-tabular text-[11px] text-slate-400 line-through">
              {formatStoreCurrency(product.originalPrice, currencyCfg)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={outOfStock}
          className={`mt-2 w-full rounded-lg py-1.5 text-xs font-semibold text-white transition-colors ${
            outOfStock
              ? 'cursor-not-allowed bg-slate-300 text-slate-600'
              : 'bg-[#1155EE] hover:bg-[#0B44CC]'
          }`}
        >
          {outOfStock ? 'Out of Stock' : hasVariants ? 'Select Option' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
