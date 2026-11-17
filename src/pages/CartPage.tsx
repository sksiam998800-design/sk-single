import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Headphones,
  Info,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  applyCouponAsync,
  clearCartAsync,
  toggleCartItemSelectionAsync,
  updateCartQtyAsync,
} from '../features/cart/cartSlice';
import { openAuthModal } from '../features/auth/authSlice';
import { showToast } from '../features/notifications/toastSlice';
import { apiRequest, isAbortError } from '../services/api';
import { CartHeroSlider } from '../components/cart/CartHeroSlider';
import { ConfirmDialog } from '../components/ui/Modal';
import { ResilientImage } from '../components/ui/ResilientImage';
import {
  DEFAULT_CART_HERO_SETTINGS,
  FALLBACK_CART_HERO_SLIDES,
  filterAndSortHeroSlides,
  normalizeCartHeroSettings,
} from '../lib/cartHero';
import { formatStoreCurrency } from '../lib/dateTime';
import { summarizeCartMetrics } from '../lib/pricingEngine';
import { useSeoMeta } from '../lib/useSeoMeta';
import type { CartHeroSliderSettings, HeroSlideRecord } from '../types/commerce';

interface CartHeroApiResponse {
  ok: true;
  totalManagedSlides?: number;
  slides: HeroSlideRecord[];
  settings?: Partial<CartHeroSliderSettings> | null;
}

function BkashMark() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#E2136E] text-white text-[10px] font-black leading-none shrink-0">
      b
    </span>
  );
}

function NagadMark() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-[#F7941D] to-[#ED1C24] text-white text-[10px] font-black leading-none shrink-0">
      N
    </span>
  );
}

export function CartPage() {
  useSeoMeta({ title: 'Shopping Cart | NOVARA COMMERCE', noIndex: true });

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, discount, couponCode, couponMessage, appliedRuleName, loading: cartLoading } = useAppSelector(
    (s) => s.cart,
  );
  const { user } = useAppSelector((s) => s.auth);
  const { settings } = useAppSelector((s) => s.storefront);

  const currencyCfg = settings?.currencySettings;
  const freeShippingThreshold = settings?.shippingSettings?.freeShippingThreshold ?? 999;
  const defaultShippingCharge = settings?.shippingSettings?.dhakaMetroCharge ?? 60;
  const paymentMethods = settings?.paymentMethods;

  const [heroSlides, setHeroSlides] = useState<HeroSlideRecord[]>(FALLBACK_CART_HERO_SLIDES);
  const [heroSettings, setHeroSettings] = useState<CartHeroSliderSettings>(DEFAULT_CART_HERO_SETTINGS);
  const [heroLoading, setHeroLoading] = useState(true);

  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [busyLineKey, setBusyLineKey] = useState<string | null>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearingCart, setClearingCart] = useState(false);
  const [shippingTooltipOpen, setShippingTooltipOpen] = useState(false);

  useEffect(() => {
    setCouponInput(couponCode || '');
  }, [couponCode]);

  useEffect(() => {
    const controller = new AbortController();
    setHeroLoading(true);
    apiRequest<CartHeroApiResponse>('/api/storefront/cart-hero', { signal: controller.signal })
      .then((res) => {
        const normalized = normalizeCartHeroSettings(res.settings);
        setHeroSettings(normalized);
        if (typeof res.totalManagedSlides === 'number' && res.totalManagedSlides > 0) {
          setHeroSlides(filterAndSortHeroSlides(res.slides || [], { placement: 'cart', activeOnly: true }));
        } else if ((res.slides || []).length > 0) {
          setHeroSlides(filterAndSortHeroSlides(res.slides || [], { placement: 'cart', activeOnly: true }));
        } else {
          setHeroSlides(FALLBACK_CART_HERO_SLIDES);
        }
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setHeroSettings(normalizeCartHeroSettings(settings?.cartHeroSettings));
        setHeroSlides(FALLBACK_CART_HERO_SLIDES);
      })
      .finally(() => setHeroLoading(false));

    return () => controller.abort();
  }, [settings?.cartHeroSettings]);

  const metrics = useMemo(
    () =>
      summarizeCartMetrics({
        items,
        couponDiscount: discount,
        freeShippingThreshold,
        defaultShippingCharge,
      }),
    [items, discount, freeShippingThreshold, defaultShippingCharge],
  );

  const hasUnavailableSelected = useMemo(
    () => items.some((i) => i.selected !== false && (!i.isAvailable || i.availableStock <= 0)),
    [items],
  );

  const handleQty = async (productId: string, variantId: string | null | undefined, qty: number) => {
    const key = `${productId}::${variantId || 'default'}`;
    setBusyLineKey(key);
    try {
      const res = await dispatch(
        updateCartQtyAsync({ productId, variantId, quantity: qty, isAuthenticated: Boolean(user) }),
      );
      if (updateCartQtyAsync.rejected.match(res)) {
        dispatch(showToast({ variant: 'error', message: String(res.payload || 'Unable to update cart') }));
      }
    } finally {
      setBusyLineKey(null);
    }
  };

  const handleToggleItem = async (productId: string, variantId: string | null | undefined, selected: boolean) => {
    const res = await dispatch(
      toggleCartItemSelectionAsync({
        productId,
        variantId,
        selected,
        isAuthenticated: Boolean(user),
      }),
    );
    if (toggleCartItemSelectionAsync.rejected.match(res)) {
      dispatch(showToast({ variant: 'error', message: String(res.payload || 'Unable to update selection') }));
    }
  };

  const handleToggleAll = async (selected: boolean) => {
    const res = await dispatch(
      toggleCartItemSelectionAsync({
        selectAll: true,
        selected,
        isAuthenticated: Boolean(user),
      }),
    );
    if (toggleCartItemSelectionAsync.rejected.match(res)) {
      dispatch(showToast({ variant: 'error', message: String(res.payload || 'Unable to update selection') }));
    }
  };

  const handleConfirmClearCart = async () => {
    setClearingCart(true);
    try {
      const res = await dispatch(clearCartAsync({ isAuthenticated: Boolean(user) }));
      if (clearCartAsync.fulfilled.match(res)) {
        setClearModalOpen(false);
        setCouponError(null);
        dispatch(showToast({ variant: 'info', message: 'All items removed from your cart.' }));
      } else {
        dispatch(showToast({ variant: 'error', message: String(res.payload || 'Unable to clear cart') }));
      }
    } finally {
      setClearingCart(false);
    }
  };

  const handleApplyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const trimmed = couponInput.trim().toUpperCase();
    if (!user) {
      dispatch(
        openAuthModal({
          tab: 'login',
          returnUrl: '/cart',
          notice: 'Sign in to validate and apply promotional coupons.',
        }),
      );
      return;
    }
    if (!trimmed) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await dispatch(applyCouponAsync(trimmed));
      if (applyCouponAsync.fulfilled.match(res)) {
        dispatch(
          showToast({
            variant: 'success',
            message: res.payload.couponCode ? `Coupon ${res.payload.couponCode} applied!` : 'Coupon removed.',
          }),
        );
      } else {
        const msg = String(res.payload || 'Invalid or ineligible coupon.');
        setCouponError(msg);
        dispatch(showToast({ variant: 'error', message: msg }));
      }
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponError(null);
    setApplyingCoupon(true);
    try {
      const res = await dispatch(applyCouponAsync(''));
      if (applyCouponAsync.fulfilled.match(res)) {
        setCouponInput('');
        dispatch(showToast({ variant: 'info', message: 'Coupon removed from order summary.' }));
      }
    } finally {
      setApplyingCoupon(false);
    }
  };

  const navigateToCheckout = (preferredPayment?: 'bkash' | 'sslcommerz') => {
    if (metrics.selectedLineCount === 0) {
      dispatch(showToast({ variant: 'error', message: 'Select at least one item before proceeding to checkout.' }));
      return;
    }
    if (hasUnavailableSelected) {
      dispatch(showToast({ variant: 'error', message: 'Remove or deselect out-of-stock items to continue.' }));
      return;
    }
    const targetUrl = preferredPayment ? `/checkout?payment=${preferredPayment}` : '/checkout';
    if (!user) {
      dispatch(
        openAuthModal({
          tab: 'login',
          returnUrl: targetUrl,
          notice: 'Please sign in or register an account before placing an order.',
        }),
      );
      return;
    }
    navigate(targetUrl);
  };

  const showBkashQuickPay = !paymentMethods || paymentMethods.bkashEnabled !== false;
  const showSslQuickPay =
    !paymentMethods || paymentMethods.sslcommerzEnabled !== false || paymentMethods.cardEnabled !== false;
  const showCardLogos =
    !paymentMethods || paymentMethods.cardEnabled !== false || paymentMethods.sslcommerzEnabled !== false;
  const showBkashLogo =
    !paymentMethods || paymentMethods.bkashEnabled !== false || paymentMethods.sslcommerzEnabled !== false;
  const showNagadLogo = !paymentMethods || paymentMethods.sslcommerzEnabled !== false;
  const showCodLogo = !paymentMethods || paymentMethods.codEnabled !== false;

  const confidenceTitle =
    heroSettings.confidenceBanner?.title || 'Shop with Confidence';
  const confidenceSubtitle =
    heroSettings.confidenceBanner?.subtitle || 'Safe Payment  |  Secure Checkout  |  7-Day Return Policy';

  return (
    <div className="bg-[#F4F7FF] pb-6">
      {/* Admin-Controlled Dynamic Cart Hero Slider */}
      <CartHeroSlider slides={heroSlides} settings={heroSettings} loading={heroLoading} />

      <div className="mx-auto max-w-[1380px] space-y-6 px-4 pt-6 sm:pt-8">
        {items.length === 0 ? (
          <section
            aria-label="Empty Shopping Cart"
            className="rounded-2xl border border-[#DCE6F5] bg-white px-6 py-14 text-center shadow-[0_8px_30px_rgba(15,29,58,0.04)]"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1155EE]">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="font-display mt-5 text-2xl font-bold text-[#0B1730]">Your Cart is Empty</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#5B6B88]">
              Looks like you haven&apos;t added any products yet. Explore our latest electronics, lifestyle accessories, and curated deals.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-[#1155EE] px-7 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0B44CC]"
              >
                <span>Continue Shopping</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/offers"
                className="inline-flex items-center gap-2 rounded-full border border-[#DCE6F5] bg-[#F8FAFF] px-6 py-2.5 text-sm font-semibold text-[#0F1D3A] hover:border-[#1155EE] hover:text-[#1155EE]"
              >
                Explore Special Offers
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Left Column: Cart Items + Coupon Bar */}
            <section
              aria-label="Shopping Cart Items"
              className="overflow-hidden rounded-2xl border border-[#DCE6F5] bg-white shadow-[0_8px_30px_rgba(15,29,58,0.04)] lg:col-span-8"
            >
              {/* Cart Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    <ShoppingCart className="h-5 w-5 text-[#1155EE]" />
                    <h2 className="font-display text-xl font-bold text-[#0B1730]">
                      Your Cart{' '}
                      <span className="font-medium text-[#5B6B88]">
                        ({items.length} {items.length === 1 ? 'Item' : 'Items'})
                      </span>
                    </h2>
                  </div>

                  {items.length > 1 && (
                    <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F8FAFF] px-2.5 py-1 text-xs font-semibold text-[#334463] hover:border-[#1155EE]/40">
                      <input
                        type="checkbox"
                        checked={metrics.allSelected}
                        onChange={(e) => handleToggleAll(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#1155EE] focus:ring-[#1155EE]"
                      />
                      <span>Select All</span>
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setClearModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1155EE] hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="underline underline-offset-4">Clear Cart</span>
                </button>
              </div>

              {/* Cart Items List */}
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const lineKey = `${item.productId}::${item.variantId || 'default'}`;
                  const isBusy = busyLineKey === lineKey || cartLoading;
                  const isSelected = item.selected !== false;
                  const lineTotal = item.unitPrice * item.quantity;
                  const hasDiscount = Boolean(item.originalPrice && item.originalPrice > item.unitPrice);
                  const discountPct =
                    item.discountPercent && item.discountPercent > 0
                      ? item.discountPercent
                      : hasDiscount && item.originalPrice
                        ? Math.round(((item.originalPrice - item.unitPrice) / item.originalPrice) * 100)
                        : 0;
                  const lineQualifiesFreeShipping =
                    item.isAvailable &&
                    item.availableStock > 0 &&
                    (freeShippingThreshold === 0 || lineTotal >= freeShippingThreshold);
                  const maxQty = Math.max(1, item.availableStock);

                  return (
                    <div
                      key={lineKey}
                      className={`flex flex-col gap-4 px-5 py-5 transition-colors sm:flex-row sm:items-center sm:px-6 ${
                        isSelected ? 'bg-white' : 'bg-slate-50/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleItem(item.productId, item.variantId, e.target.checked)}
                          aria-label={`Select ${item.name} for checkout`}
                          className="mt-2 sm:mt-0 h-4.5 w-4.5 shrink-0 cursor-pointer rounded border-slate-300 text-[#1155EE] focus:ring-[#1155EE]"
                        />

                        <Link
                          to={`/product/${item.slug}`}
                          className="h-20 w-24 sm:h-24 sm:w-28 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-[#F8FAFC] p-2 flex items-center justify-center"
                        >
                          <ResilientImage
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-contain"
                          />
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/product/${item.slug}`}
                            className="font-display block truncate text-[15px] sm:text-base font-bold text-[#0F1D3A] hover:text-[#1155EE]"
                          >
                            {item.name}
                          </Link>

                          <p className="mt-0.5 truncate text-xs text-[#64748B]">
                            {item.variantTitle
                              ? `${item.variantTitle}${item.shortDescription ? ` · ${item.shortDescription}` : ''}`
                              : item.shortDescription || `SKU: ${item.sku}`}
                          </p>

                          {/* Stock & Free Shipping Status Pills */}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {item.isAvailable && item.availableStock > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <Check className="h-3 w-3" />
                                {item.availableStock <= 5 ? `In Stock (${item.availableStock} left)` : 'In Stock'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                Out of Stock
                              </span>
                            )}

                            {lineQualifiesFreeShipping && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-[#D4E2FC] bg-[#EEF4FF] px-2 py-0.5 text-[11px] font-semibold text-[#1155EE]">
                                <Truck className="h-3 w-3" />
                                Free Shipping
                              </span>
                            )}
                          </div>

                          {/* Unit Pricing & Discount Pill */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <span className="font-mono-tabular text-base sm:text-[17px] font-extrabold text-[#0B1730]">
                              {formatStoreCurrency(item.unitPrice, currencyCfg)}
                            </span>
                            {hasDiscount && item.originalPrice && (
                              <span className="font-mono-tabular text-xs text-slate-400 line-through">
                                {formatStoreCurrency(item.originalPrice, currencyCfg)}
                              </span>
                            )}
                            {discountPct > 0 && (
                              <span className="rounded-full bg-[#EF4444] px-2 py-0.5 text-[10px] font-bold text-white">
                                {discountPct}% OFF
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stepper, Line Total & Remove */}
                      <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:justify-end sm:border-t-0 sm:pt-0">
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                          <button
                            type="button"
                            disabled={isBusy || item.quantity <= 1}
                            onClick={() => handleQty(item.productId, item.variantId, item.quantity - 1)}
                            aria-label={`Decrease ${item.name} quantity`}
                            className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-mono-tabular w-9 text-center text-sm font-bold text-[#0F1D3A]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={isBusy || item.quantity >= maxQty || !item.isAvailable}
                            title={item.quantity >= maxQty ? `Maximum ${maxQty} available` : 'Increase quantity'}
                            onClick={() => handleQty(item.productId, item.variantId, item.quantity + 1)}
                            aria-label={`Increase ${item.name} quantity`}
                            className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <p className="font-mono-tabular min-w-[96px] text-right text-base sm:text-[17px] font-extrabold text-[#0B1730]">
                          {formatStoreCurrency(lineTotal, currencyCfg)}
                        </p>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleQty(item.productId, item.variantId, 0)}
                          aria-label={`Remove ${item.name}`}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon & Continue Shopping Bar */}
              <div className="border-t border-slate-100 bg-[#F7FAFF] px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <form onSubmit={handleApplyCoupon} className="flex flex-1 flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#0F1D3A] whitespace-nowrap">
                      <Tag className="h-4 w-4 text-[#1155EE]" />
                      <span>Have a Coupon Code?</span>
                    </div>

                    <div className="flex flex-1 min-w-[210px] max-w-sm items-center gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          if (couponError) setCouponError(null);
                        }}
                        placeholder="Enter coupon code"
                        aria-label="Coupon code"
                        className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium uppercase text-[#0F1D3A] placeholder:normal-case placeholder:text-slate-400 focus:border-[#1155EE] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={applyingCoupon}
                        className="h-9 shrink-0 rounded-lg bg-[#1155EE] px-4 text-xs font-semibold text-white transition hover:bg-[#0B44CC] disabled:opacity-60"
                      >
                        {applyingCoupon ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                  </form>

                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1155EE] hover:text-[#0B44CC] whitespace-nowrap self-start md:self-auto"
                  >
                    <span className="underline underline-offset-4">Continue Shopping</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Active Coupon Pill / Validation Feedback */}
                {(couponCode || couponError || couponMessage) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    {couponCode && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          Coupon <span className="font-mono-tabular font-bold">{couponCode}</span> applied
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          aria-label="Remove coupon"
                          className="ml-1 rounded-full p-0.5 text-emerald-700 hover:bg-emerald-200/60"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {couponError && <span className="font-medium text-rose-600">{couponError}</span>}
                    {!couponError && couponMessage && (
                      <span className="font-medium text-amber-700">{couponMessage}</span>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Right Column: Sticky Order Summary */}
            <aside
              aria-label="Order Summary"
              className="overflow-hidden rounded-2xl border border-[#DCE6F5] bg-white shadow-[0_10px_32px_rgba(11,31,68,0.08)] lg:sticky lg:top-24 lg:col-span-4"
            >
              {/* Navy Gradient Header */}
              <div className="flex items-center gap-2.5 bg-gradient-to-r from-[#091D42] to-[#123370] px-6 py-4 text-white">
                <ShoppingCart className="h-5 w-5 text-white" />
                <h2 className="font-display text-lg font-bold tracking-tight">Order Summary</h2>
              </div>

              <div className="p-5 sm:p-6">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#475569]">
                      Subtotal ({metrics.selectedUnitsCount}{' '}
                      {metrics.selectedUnitsCount === 1 ? 'Item' : 'Items'})
                    </span>
                    <span className="font-mono-tabular font-bold text-[#0F1D3A]">
                      {formatStoreCurrency(metrics.subtotal, currencyCfg)}
                    </span>
                  </div>

                  {metrics.couponDiscount > 0 && (
                    <div className="flex items-center justify-between gap-2 text-emerald-600">
                      <span className="font-medium">
                        Discount
                        {couponCode
                          ? ` (${couponCode})`
                          : appliedRuleName
                            ? ` (${appliedRuleName})`
                            : ''}
                      </span>
                      <span className="font-mono-tabular font-bold">
                        - {formatStoreCurrency(metrics.couponDiscount, currencyCfg)}
                      </span>
                    </div>
                  )}

                  {metrics.productSavings > 0 && (
                    <div className="flex items-center justify-between gap-2 text-xs text-emerald-700">
                      <span>Product Sale Savings</span>
                      <span className="font-mono-tabular font-semibold">
                        Saved {formatStoreCurrency(metrics.productSavings, currencyCfg)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex items-center gap-1.5 text-[#475569]">
                      <span>Shipping Fee</span>
                      <button
                        type="button"
                        onClick={() => setShippingTooltipOpen((prev) => !prev)}
                        onMouseEnter={() => setShippingTooltipOpen(true)}
                        onMouseLeave={() => setShippingTooltipOpen(false)}
                        aria-label="Shipping calculation details"
                        className="text-slate-400 hover:text-[#1155EE] focus-visible:outline-2 focus-visible:outline-[#1155EE]"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                      {shippingTooltipOpen && (
                        <div
                          role="tooltip"
                          className="absolute bottom-full left-0 z-30 mb-2 w-60 rounded-xl border border-slate-200 bg-white p-3 text-[11px] leading-relaxed text-slate-600 shadow-lg"
                        >
                          {freeShippingThreshold > 0
                            ? `Free standard shipping on selected orders of ${formatStoreCurrency(
                                freeShippingThreshold,
                                currencyCfg,
                              )} or more. Estimated ${formatStoreCurrency(
                                defaultShippingCharge,
                                currencyCfg,
                              )} Dhaka Metro rate below threshold.`
                            : `Standard delivery rate starts at ${formatStoreCurrency(defaultShippingCharge, currencyCfg)}.`}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {metrics.selectedLineCount === 0 ? (
                        <span className="font-mono-tabular font-semibold text-slate-400">
                          {formatStoreCurrency(0, currencyCfg)}
                        </span>
                      ) : metrics.freeShippingQualified ? (
                        <>
                          <span className="font-mono-tabular font-bold text-[#0F1D3A]">
                            {formatStoreCurrency(0, currencyCfg)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            <Check className="h-3 w-3" /> Free
                          </span>
                        </>
                      ) : (
                        <span className="font-mono-tabular font-bold text-[#0F1D3A]">
                          {formatStoreCurrency(metrics.shippingFee, currencyCfg)}
                        </span>
                      )}
                    </div>
                  </div>

                  {metrics.selectedLineCount > 0 && !metrics.freeShippingQualified && metrics.amountToFreeShipping > 0 && (
                    <p className="rounded-lg bg-[#F4F7FF] px-3 py-2 text-[11px] font-medium text-[#1155EE]">
                      Add {formatStoreCurrency(metrics.amountToFreeShipping, currencyCfg)} more to unlock Free Shipping!
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="font-display text-base sm:text-lg font-extrabold text-[#0B1730]">
                    Total Amount
                  </span>
                  <span className="font-mono-tabular text-xl sm:text-2xl font-extrabold text-[#0B1730]">
                    {formatStoreCurrency(metrics.total, currencyCfg)}
                  </span>
                </div>

                {hasUnavailableSelected && (
                  <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    One or more selected items are out of stock. Uncheck or remove them to proceed.
                  </p>
                )}

                <button
                  type="button"
                  disabled={metrics.selectedLineCount === 0 || hasUnavailableSelected}
                  onClick={() => navigateToCheckout()}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1155EE] to-[#0D47D9] px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:from-[#0E49D4] hover:to-[#0939BA] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  <span>{user ? 'Proceed to Checkout' : 'Proceed to Checkout'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                {/* Quick Online Payment Methods */}
                {(showBkashQuickPay || showSslQuickPay) && (
                  <div className="mt-4 space-y-2.5">
                    <div className="relative flex items-center justify-center py-1">
                      <div className="w-full border-t border-slate-200" />
                      <span className="bg-white px-3 text-xs font-medium text-slate-400">or</span>
                    </div>

                    {showBkashQuickPay && (
                      <button
                        type="button"
                        disabled={metrics.selectedLineCount === 0 || hasUnavailableSelected}
                        onClick={() => navigateToCheckout('bkash')}
                        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1D3A] transition hover:border-[#E2136E]/50 hover:bg-pink-50/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <BkashMark />
                        <span>Pay with bKash</span>
                      </button>
                    )}

                    {showSslQuickPay && (
                      <button
                        type="button"
                        disabled={metrics.selectedLineCount === 0 || hasUnavailableSelected}
                        onClick={() => navigateToCheckout('sslcommerz')}
                        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1D3A] transition hover:border-[#F7941D]/60 hover:bg-amber-50/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <NagadMark />
                        <span>Pay with Nagad / SSLCommerz</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* 4-Column Trust Indicators Strip */}
        <section
          aria-label="Shopping Guarantees"
          className="grid grid-cols-1 gap-4 rounded-2xl border border-[#DCE6F5] bg-white px-6 py-5 shadow-[0_6px_24px_rgba(15,29,58,0.03)] sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1155EE]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#0F1D3A]">Secure Shopping</h3>
              <p className="text-xs text-[#64748B]">Your data is safe</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1155EE]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#0F1D3A]">Free Shipping</h3>
              <p className="text-xs text-[#64748B]">
                {freeShippingThreshold > 0
                  ? `On orders over ${formatStoreCurrency(freeShippingThreshold, currencyCfg)}`
                  : 'On eligible orders'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1155EE]">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#0F1D3A]">24/7 Support</h3>
              <p className="text-xs text-[#64748B]">Always here to help</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1155EE]">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#0F1D3A]">Easy Returns</h3>
              <p className="text-xs text-[#64748B]">Within 7 days</p>
            </div>
          </div>
        </section>

        {/* Shop with Confidence Promotional Trust Banner */}
        {heroSettings.confidenceBanner?.enabled !== false && (
          <section
            aria-label="Shop with Confidence"
            className="relative overflow-hidden rounded-2xl border border-[#BCD4FA] bg-gradient-to-r from-[#CFE2FD] via-[#8DB8FA] to-[#2365EE] px-6 py-5 sm:px-8 sm:py-6 shadow-sm"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-12 -top-12 h-48 w-64 rotate-12 rounded-3xl bg-white/25 blur-sm"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-1/3 -bottom-12 h-48 w-64 -rotate-12 rounded-3xl bg-white/15 blur-sm"
            />

            <div className="relative z-10 flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2B70FF] to-[#0B39A8] text-white shadow-lg ring-4 ring-white/60">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#0B1730]">
                    {confidenceTitle}
                  </h2>
                  <p className="mt-0.5 text-xs sm:text-sm font-medium text-[#153166]">
                    {confidenceSubtitle}
                  </p>
                </div>
              </div>

              {(showCardLogos || showBkashLogo || showNagadLogo || showCodLogo) && (
                <div className="flex flex-wrap items-center gap-3.5 rounded-xl bg-white px-5 py-3 shadow-sm">
                  {showCardLogos && (
                    <>
                      <span className="font-display text-base font-black italic tracking-tight text-[#1A1F71]">
                        VISA
                      </span>
                      <span className="inline-flex items-center gap-1" aria-label="Mastercard">
                        <span className="h-5 w-5 rounded-full bg-[#EB001B]" />
                        <span className="-ml-2.5 h-5 w-5 rounded-full bg-[#F79E1B]/90" />
                      </span>
                    </>
                  )}
                  {showBkashLogo && (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-[#E2136E]">
                      <BkashMark />
                      <span>bKash</span>
                    </span>
                  )}
                  {showNagadLogo && (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-[#EA580C]">
                      <NagadMark />
                      <span>Nagad</span>
                    </span>
                  )}
                  {showCodLogo && !showBkashLogo && !showNagadLogo && (
                    <span className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
                      Cash on Delivery
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmDialog
        open={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        onConfirm={handleConfirmClearCart}
        title="Clear Shopping Cart"
        message={`Remove all ${items.length} item${items.length === 1 ? '' : 's'} from your shopping cart? This action cannot be undone.`}
        confirmLabel="Yes, Clear Cart"
        cancelLabel="Keep Items"
        destructive
        loading={clearingCart}
      />
    </div>
  );
}
