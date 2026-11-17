import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Heart,
  ShoppingCart,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { addToCartAsync, openCartDrawer } from '../features/cart/cartSlice';
import {
  clearWishlistAsync,
  removeWishlistAsync,
  selectWishlistItems,
  selectWishlistLoading,
} from '../features/wishlist/wishlistSlice';
import { showToast } from '../features/notifications/toastSlice';
import { apiRequest } from '../services/api';
import { AccountLayout } from '../components/account/AccountLayout';
import { WishlistHeroSlider } from '../components/wishlist/WishlistHeroSlider';
import { ConfirmDialog } from '../components/ui/Modal';
import { ResilientImage } from '../components/ui/ResilientImage';
import {
  DEFAULT_WISHLIST_HERO_SETTINGS,
  FALLBACK_WISHLIST_HERO_SLIDES,
  filterAndSortHeroSlides,
  normalizeWishlistHeroSettings,
} from '../lib/cartHero';
import { extractProductSpecBadges } from '../lib/wishlist';
import { formatStoreCurrency } from '../lib/dateTime';
import { useSeoMeta } from '../lib/useSeoMeta';
import type {
  BannerRecord,
  CartHeroSliderSettings,
  HeroSlideRecord,
  ProductItem,
} from '../types/commerce';
import wishlistGiftPromoImg from '../assets/images/wishlist_gift_promo_1794919699090.jpg';

export function WishlistPage() {
  useSeoMeta({
    title: 'My Wishlist | NOVARA COMMERCE',
    description: 'Save your favorite products for later, monitor price drops, and move items to your cart.',
    noIndex: true,
  });

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const currencyCfg = useAppSelector((s) => s.storefront.settings?.currencySettings);
  const items = useAppSelector(selectWishlistItems);
  const loading = useAppSelector(selectWishlistLoading);

  const [heroSlides, setHeroSlides] = useState<HeroSlideRecord[]>(FALLBACK_WISHLIST_HERO_SLIDES);
  const [heroSettings, setHeroSettings] = useState<CartHeroSliderSettings>(DEFAULT_WISHLIST_HERO_SETTINGS);
  const [bottomBanner, setBottomBanner] = useState<BannerRecord | null>(null);
  const [heroLoading, setHeroLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);

  // Sync selectedIds cleanly when items change (default selected like reference checkboxes)
  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = items.map((p) => p.id);
      if (validIds.length === 0) return [];
      const kept = prev.filter((id) => validIds.includes(id));
      return kept.length > 0 ? kept : validIds;
    });
  }, [items]);

  // Fetch dynamic Wishlist Hero slides + settings + optional bottom promo banner
  useEffect(() => {
    let active = true;
    setHeroLoading(true);
    apiRequest<{
      ok: true;
      totalManagedSlides: number;
      slides: HeroSlideRecord[];
      settings: Partial<CartHeroSliderSettings> | null;
      bottomBanner: BannerRecord | null;
    }>('/api/storefront/wishlist-hero')
      .then((res) => {
        if (!active) return;
        const normalizedSettings = normalizeWishlistHeroSettings(res.settings);
        setHeroSettings(normalizedSettings);
        const serverSlides = filterAndSortHeroSlides(res.slides || [], { placement: 'wishlist' });
        if (res.totalManagedSlides > 0) {
          setHeroSlides(serverSlides);
        } else {
          setHeroSlides(FALLBACK_WISHLIST_HERO_SLIDES);
        }
        setBottomBanner(res.bottomBanner || null);
      })
      .catch(() => {
        if (!active) return;
        setHeroSettings(DEFAULT_WISHLIST_HERO_SETTINGS);
        setHeroSlides(FALLBACK_WISHLIST_HERO_SLIDES);
        setBottomBanner(null);
      })
      .finally(() => {
        if (active) setHeroLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const selectedProducts = useMemo(
    () => items.filter((it) => selectedIds.includes(it.id)),
    [items, selectedIds],
  );

  const toggleSelect = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((p) => p.id));
    }
  };

  const handleRemoveItem = async (product: ProductItem) => {
    const res = await dispatch(
      removeWishlistAsync({ isAuthenticated: Boolean(user), productId: product.id }),
    );
    if (removeWishlistAsync.fulfilled.match(res)) {
      dispatch(showToast({ variant: 'info', message: `${product.name} removed from wishlist.` }));
    } else {
      dispatch(showToast({ variant: 'error', message: String(res.payload || 'Unable to remove item') }));
    }
  };

  const handleConfirmClearAll = async () => {
    setClearing(true);
    try {
      const res = await dispatch(clearWishlistAsync({ isAuthenticated: Boolean(user) }));
      if (clearWishlistAsync.fulfilled.match(res)) {
        setSelectedIds([]);
        setClearDialogOpen(false);
        dispatch(showToast({ variant: 'info', message: 'Wishlist cleared.' }));
      } else {
        dispatch(showToast({ variant: 'error', message: String(res.payload || 'Unable to clear wishlist') }));
      }
    } finally {
      setClearing(false);
    }
  };

  const handleAddSingleToCart = async (product: ProductItem) => {
    const unlimitedOrBackorder = product.manageInventory === false || Boolean(product.allowBackorder);
    const outOfStock = !unlimitedOrBackorder && product.availableStock <= 0;
    if (outOfStock) {
      dispatch(showToast({ variant: 'warning', message: 'This item is currently out of stock.' }));
      return;
    }

    if (product.hasVariants && product.variants && product.variants.length > 0) {
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
          imageUrl: product.images?.[0]?.url || '',
          unitPrice: product.currentPrice,
          originalPrice: product.originalPrice,
          discountPercent: product.discountPercent,
          quantity: 1,
          availableStock: unlimitedOrBackorder ? Math.max(product.availableStock || 0, 99) : product.availableStock,
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

  const handleBulkAddSelected = async () => {
    if (selectedProducts.length === 0 || bulkAdding) return;
    setBulkAdding(true);
    let addedCount = 0;
    let skippedVariantsOrOos = 0;
    try {
      for (const product of selectedProducts) {
        const unlimitedOrBackorder = product.manageInventory === false || Boolean(product.allowBackorder);
        const outOfStock = !unlimitedOrBackorder && product.availableStock <= 0;
        const hasVariants = product.hasVariants && product.variants && product.variants.length > 0;
        if (outOfStock || hasVariants) {
          skippedVariantsOrOos += 1;
          continue;
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
              imageUrl: product.images?.[0]?.url || '',
              unitPrice: product.currentPrice,
              originalPrice: product.originalPrice,
              discountPercent: product.discountPercent,
              quantity: 1,
              availableStock: unlimitedOrBackorder ? Math.max(product.availableStock || 0, 99) : product.availableStock,
              isAvailable: true,
              selected: true,
            },
          }),
        );
        if (addToCartAsync.fulfilled.match(res)) {
          addedCount += 1;
        }
      }

      if (addedCount > 0) {
        dispatch(
          showToast({
            variant: 'success',
            message: `${addedCount} selected item${addedCount === 1 ? '' : 's'} added to cart.`,
          }),
        );
        dispatch(openCartDrawer());
      }
      if (skippedVariantsOrOos > 0) {
        dispatch(
          showToast({
            variant: 'info',
            message: `${skippedVariantsOrOos} item(s) require option selection or are out of stock.`,
          }),
        );
      }
    } finally {
      setBulkAdding(false);
    }
  };

  return (
    <div className="bg-[#F4F7FF] min-h-[75vh]">
      {/* 1. Dynamic Wishlist Hero Slider matching Reference */}
      <WishlistHeroSlider slides={heroSlides} settings={heroSettings} loading={heroLoading} />

      {/* 2. Main 2-Column Account & Wishlist Body */}
      <div className="py-7 sm:py-9">
        <AccountLayout activeKey="wishlist">
          <div className="space-y-6">
            {/* Main Wishlist White Panel */}
            <section className="rounded-2xl border border-[#DCE6F7] bg-white p-5 sm:p-6 shadow-xs">
              {/* Top Bar: Blue Heart + My Wishlist (N Items) + Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EEF3FC]">
                <div className="flex items-center gap-2.5">
                  <Heart className="h-6 w-6 fill-[#1155EE] text-[#1155EE]" />
                  <h2 className="font-display text-xl sm:text-[22px] font-extrabold tracking-tight text-[#0B1730]">
                    My Wishlist{' '}
                    <span className="font-sans text-base font-medium text-slate-500">
                      ({items.length} {items.length === 1 ? 'Item' : 'Items'})
                    </span>
                  </h2>
                </div>

                {items.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="rounded-lg border border-[#DCE6F7] bg-[#F8FAFF] px-3 py-1.5 text-xs font-semibold text-[#0B1730] hover:border-[#1155EE] hover:text-[#1155EE]"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>

                    {selectedProducts.length > 0 && (
                      <button
                        type="button"
                        disabled={bulkAdding}
                        onClick={handleBulkAddSelected}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1155EE] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0B44CC] disabled:opacity-60"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>
                          {bulkAdding ? 'Adding...' : `Add Selected (${selectedProducts.length})`}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setClearDialogOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F7] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0B1730] hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Wishlist Items List */}
              {loading && items.length === 0 ? (
                <div className="mt-5 space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF4FF] text-[#1155EE]">
                    <Heart className="h-8 w-8" />
                  </div>
                  <h3 className="font-display mt-4 text-lg font-extrabold text-[#0B1730]">
                    Your Wishlist Is Empty
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                    Tap the heart icon on any product while browsing to save your favorites here for later.
                  </p>
                  <Link
                    to="/shop"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1155EE] px-7 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0B44CC]"
                  >
                    <span>Explore Products</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {items.map((item) => {
                    const checked = selectedIds.includes(item.id);
                    const primaryImage = item.images?.[0]?.url || '';
                    const specs = extractProductSpecBadges(item, 2);
                    const unlimitedOrBackorder = item.manageInventory === false || Boolean(item.allowBackorder);
                    const outOfStock = !unlimitedOrBackorder && item.availableStock <= 0;
                    const lowStock = !outOfStock && !unlimitedOrBackorder && item.availableStock <= 5;
                    const hasVariants = Boolean(item.hasVariants && item.variants && item.variants.length > 0);

                    return (
                      <article
                        key={item.id}
                        className="relative flex flex-col gap-4 rounded-2xl border border-[#DCE6F7] bg-white p-4 transition-all hover:border-[#B6CCF7] hover:shadow-sm sm:flex-row sm:items-center"
                      >
                        {/* Top-right × Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          aria-label={`Remove ${item.name} from wishlist`}
                          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        {/* Left Checkbox + Product Thumbnail */}
                        <div className="flex items-center gap-3.5 shrink-0">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`Select ${item.name}`}
                            onClick={() => toggleSelect(item.id)}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              checked
                                ? 'border-[#1155EE] bg-[#1155EE] text-white'
                                : 'border-slate-300 bg-white text-transparent hover:border-[#1155EE]'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </button>

                          <Link
                            to={`/product/${item.slug}`}
                            className="flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E2ECFA] bg-[#F8FAFF] p-1.5"
                          >
                            <ResilientImage
                              src={primaryImage}
                              alt={item.name}
                              className="h-full w-full object-contain transition-transform duration-200 hover:scale-105"
                            />
                          </Link>
                        </div>

                        {/* Center Details */}
                        <div className="min-w-0 flex-1 space-y-1.5 sm:pr-4">
                          <Link
                            to={`/product/${item.slug}`}
                            className="block font-display text-base sm:text-[17px] font-extrabold text-[#0B1730] hover:text-[#1155EE] pr-7 truncate"
                          >
                            {item.name}
                          </Link>

                          {item.shortDescription && (
                            <p className="line-clamp-1 text-xs sm:text-[13px] text-slate-500">
                              {item.shortDescription}
                            </p>
                          )}

                          {/* Honest Rating Row */}
                          <div className="flex items-center gap-1.5 text-xs">
                            {item.reviewCount > 0 ? (
                              <>
                                <span className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-3.5 w-3.5 ${
                                        star <= Math.round(item.ratingAverage)
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-slate-200'
                                      }`}
                                    />
                                  ))}
                                </span>
                                <span className="font-bold text-[#0B1730]">
                                  {item.ratingAverage.toFixed(1)}
                                </span>
                                <span className="text-slate-400">
                                  ({item.reviewCount.toLocaleString()} review{item.reviewCount === 1 ? '' : 's'})
                                </span>
                              </>
                            ) : (
                              <span className="text-[11.5px] text-slate-400">No reviews yet</span>
                            )}
                          </div>

                          {/* Spec Chips */}
                          {specs.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {specs.map((badge) => (
                                <span
                                  key={badge}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-[#DCE6F7] bg-[#F4F8FF] px-2.5 py-0.5 text-[11px] font-medium text-[#0B1730]"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#1155EE]" aria-hidden="true" />
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Price + Discount Badge */}
                          <div className="flex flex-wrap items-baseline gap-2.5 pt-0.5">
                            <span className="font-mono-tabular text-lg sm:text-xl font-extrabold text-[#1155EE]">
                              {formatStoreCurrency(item.currentPrice, currencyCfg)}
                            </span>
                            {item.originalPrice && item.originalPrice > item.currentPrice && (
                              <span className="font-mono-tabular text-xs sm:text-sm text-slate-400 line-through">
                                {formatStoreCurrency(item.originalPrice, currencyCfg)}
                              </span>
                            )}
                            {item.discountPercent > 0 && (
                              <span className="rounded-full bg-[#EF4444] px-2.5 py-0.5 text-[10px] font-bold text-white">
                                {item.discountPercent}% OFF
                              </span>
                            )}
                          </div>

                          {/* Stock Availability Indicator */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                            {outOfStock ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                                Out of Stock
                              </span>
                            ) : lowStock ? (
                              <>
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                                  Low Stock ({item.availableStock} left)
                                </span>
                                <span className="text-[11.5px] font-medium text-[#0B1730]">
                                  Order soon before it sells out
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                  In Stock
                                </span>
                                <span className="text-[11.5px] font-medium text-[#0B1730]">
                                  Available for immediate delivery
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right Action Buttons Stack */}
                        <div className="flex shrink-0 flex-row gap-2 sm:w-40 sm:flex-col sm:pt-5">
                          <button
                            type="button"
                            disabled={outOfStock}
                            onClick={() => handleAddSingleToCart(item)}
                            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-[13px] font-semibold text-white transition-colors ${
                              outOfStock
                                ? 'cursor-not-allowed bg-slate-300 text-slate-600'
                                : 'bg-[#1155EE] hover:bg-[#0B44CC] shadow-xs'
                            }`}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span>
                              {outOfStock ? 'Out of Stock' : hasVariants ? 'Select Option' : 'Add to Cart'}
                            </span>
                          </button>

                          <Link
                            to={`/product/${item.slug}`}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#DCE6F7] bg-white px-4 py-2 text-xs sm:text-[13px] font-semibold text-[#0B1730] transition-colors hover:border-[#1155EE] hover:text-[#1155EE]"
                          >
                            <span>View Details</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Bottom Promotional Card ("Don't Miss Out!" matching Reference or Dynamic DB Banner) */}
            {bottomBanner ? (
              <div className="overflow-hidden rounded-2xl border border-[#DCE6F7] bg-gradient-to-r from-[#EEF4FF] via-[#DCE9FF] to-[#CFE0FF] shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-5 sm:p-6">
                  {bottomBanner.desktopImageUrl && (
                    <div className="md:col-span-4 h-32 sm:h-36 overflow-hidden rounded-xl bg-white/60">
                      <ResilientImage
                        src={bottomBanner.desktopImageUrl}
                        alt={bottomBanner.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className={bottomBanner.desktopImageUrl ? 'md:col-span-5' : 'md:col-span-8'}>
                    {(bottomBanner.eyebrow || bottomBanner.promoLabel) && (
                      <span className="inline-block rounded-full bg-white/90 px-3 py-0.5 text-[11px] font-bold text-[#1155EE]">
                        {bottomBanner.eyebrow || bottomBanner.promoLabel}
                      </span>
                    )}
                    <h3 className="font-display mt-1 text-xl sm:text-2xl font-extrabold text-[#0B1730]">
                      {bottomBanner.title}
                    </h3>
                    {bottomBanner.subtitle && (
                      <p className="mt-1 text-xs sm:text-sm text-[#283B5E]">{bottomBanner.subtitle}</p>
                    )}
                  </div>
                  <div className="md:col-span-3 flex md:justify-end">
                    <Link
                      to={bottomBanner.destinationUrl || '/shop'}
                      className="inline-flex items-center gap-2 rounded-full bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0B44CC]"
                    >
                      <span>{bottomBanner.ctaText || 'Shop Now'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-[#DCE6F7] bg-gradient-to-r from-[#EEF4FF] via-[#DCE9FF] to-[#CFE0FF] shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-12 items-center">
                  <div
                    className="hidden md:block md:col-span-4 h-40 overflow-hidden"
                    style={{
                      WebkitMaskImage: 'linear-gradient(to right, black 55%, transparent 100%)',
                      maskImage: 'linear-gradient(to right, black 55%, transparent 100%)',
                    }}
                  >
                    <img
                      src={wishlistGiftPromoImg}
                      alt="Exclusive NOVARA Gift Rewards"
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <div className="md:col-span-5 px-6 py-6 text-center md:text-left">
                    <h3 className="font-display text-2xl font-extrabold tracking-tight text-[#0B1730]">
                      Don&apos;t Miss Out!
                    </h3>
                    <p className="mt-1 text-sm text-[#283B5E]">
                      Complete your purchase and get exclusive offers and rewards.
                    </p>
                  </div>
                  <div className="md:col-span-3 flex justify-center md:justify-end px-6 pb-6 md:py-6">
                    <Link
                      to="/shop"
                      className="inline-flex items-center gap-2 rounded-full bg-[#1155EE] px-7 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-[#0B44CC]"
                    >
                      <span>Shop Now</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </AccountLayout>
      </div>

      <ConfirmDialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        onConfirm={handleConfirmClearAll}
        title="Clear Entire Wishlist"
        message={`Are you sure you want to remove all ${items.length} saved product${items.length === 1 ? '' : 's'} from your wishlist?`}
        confirmLabel="Clear Wishlist"
        destructive
        loading={clearing}
      />
    </div>
  );
}
