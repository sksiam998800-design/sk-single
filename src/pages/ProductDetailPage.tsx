import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Award,
  BatteryCharging,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Feather,
  Headphones,
  Heart,
  HelpCircle,
  Lock,
  MessageSquarePlus,
  Minus,
  Monitor,
  Package,
  PlayCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  Zap,
  ZoomIn,
} from 'lucide-react';
import { apiRequest, isAbortError } from '../services/api';
import type {
  ProductItem,
  ProductQuestionItem,
  ProductTrustHighlightItem,
  ProductVariant,
  ReviewItem,
} from '../types/commerce';
import { buildGroupedSpecifications, type GroupedSpecificationSection } from '../lib/productAttributes';
import {
  extractVariantDimensions,
  getDimensionOptionStates,
  pickVariantForOptionChange,
} from '../lib/variantEngine';
import { ResilientImage } from '../components/ui/ResilientImage';
import { Modal } from '../components/ui/Modal';
import { ProductCard } from '../components/catalog/ProductCard';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { addToCartAsync, openCartDrawer } from '../features/cart/cartSlice';
import { selectIsWishlisted, toggleWishlistAsync } from '../features/wishlist/wishlistSlice';
import { openAuthModal } from '../features/auth/authSlice';
import { showToast } from '../features/notifications/toastSlice';
import {
  calculateShippingCharge,
  getDistrictsForDivision,
  getDivisionNames,
  getUpazilasForDistrict,
} from '../lib/bdLocations';
import { formatStoreCurrency } from '../lib/dateTime';
import { computeAvailableStock } from '../lib/orderStateMachine';
import { resolveEffectiveUnitPrice } from '../lib/pricingEngine';
import { useSeoMeta } from '../lib/useSeoMeta';

interface ReviewSummary {
  average: number;
  total: number;
  histogram: Record<number, number>;
}

type PdpTab = 'description' | 'specs' | 'reviews' | 'qa' | 'shipping';

const DEFAULT_TRUST_HIGHLIGHTS: ProductTrustHighlightItem[] = [
  { icon: 'shield-check', title: '100% Original', subtitle: 'Products' },
  { icon: 'truck', title: 'Fast Delivery', subtitle: 'Across Bangladesh' },
  { icon: 'headphones', title: '24/7 Support', subtitle: 'Always Here' },
  { icon: 'lock', title: 'Secure Payment', subtitle: 'SSL Encrypted' },
  { icon: 'rotate-ccw', title: 'Easy Returns', subtitle: 'Within 7 Days' },
];

function renderHighlightIcon(iconKey: string, className = 'h-5 w-5 text-[#1155EE]') {
  const key = (iconKey || '').trim().toLowerCase();
  if (key.includes('cpu') || key.includes('chip') || key.includes('processor')) return <Cpu className={className} />;
  if (key.includes('battery') || key.includes('power')) return <BatteryCharging className={className} />;
  if (key.includes('display') || key.includes('monitor') || key.includes('screen')) return <Monitor className={className} />;
  if (key.includes('feather') || key.includes('light') || key.includes('weight')) return <Feather className={className} />;
  if (key.includes('truck') || key.includes('delivery') || key.includes('ship')) return <Truck className={className} />;
  if (key.includes('headphone') || key.includes('support')) return <Headphones className={className} />;
  if (key.includes('lock') || key.includes('secure')) return <Lock className={className} />;
  if (key.includes('rotate') || key.includes('return')) return <RotateCcw className={className} />;
  if (key.includes('zap') || key.includes('fast') || key.includes('flash')) return <Zap className={className} />;
  if (key.includes('award') || key.includes('warranty')) return <Award className={className} />;
  if (key.includes('sparkle')) return <Sparkles className={className} />;
  if (key.includes('package') || key.includes('box')) return <Package className={className} />;
  if (key.includes('check')) return <CheckCircle2 className={className} />;
  return <ShieldCheck className={className} />;
}

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { settings, promotionalAds } = useAppSelector((s) => s.storefront);

  const [product, setProduct] = useState<ProductItem | null>(null);
  const isWishlisted = useAppSelector((s) => selectIsWishlisted(s, product?.id || ''));
  const [groupedSpecsFromApi, setGroupedSpecsFromApi] = useState<GroupedSpecificationSection[]>([]);
  const [related, setRelated] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [variantSelection, setVariantSelection] = useState<Record<string, string>>({});

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [isHoveringStage, setIsHoveringStage] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<PdpTab>('description');
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Delivery estimator
  const [estDivision, setEstDivision] = useState('Dhaka');
  const [estDistrict, setEstDistrict] = useState('Dhaka');
  const [estUpazila, setEstUpazila] = useState('Dhanmondi');

  // Reviews
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    average: 0,
    total: 0,
    histogram: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [canReview, setCanReview] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Customer Q&A
  const [questionInput, setQuestionInput] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [localQuestions, setLocalQuestions] = useState<ProductQuestionItem[]>([]);

  const loadProduct = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{
          ok: true;
          product: ProductItem;
          groupedSpecifications?: GroupedSpecificationSection[];
          relatedProducts: ProductItem[];
        }>(`/api/products/${slug}`, { signal });

        setProduct(res.product);
        setGroupedSpecsFromApi(Array.isArray(res.groupedSpecifications) ? res.groupedSpecifications : []);
        setRelated(Array.isArray(res.relatedProducts) ? res.relatedProducts : []);
        setLocalQuestions(Array.isArray(res.product.questions) ? res.product.questions : []);

        const activeVariants = (res.product.variants || []).filter((v) => v.isActive !== false);
        const bypassStock = res.product.manageInventory === false || Boolean(res.product.allowBackorder);
        const inStockVariant = activeVariants.find(
          (v) => bypassStock || computeAvailableStock(v.stockOnHand, v.reservedStock) > 0,
        );
        const initialVariant =
          res.product.hasVariants && activeVariants.length > 0 ? inStockVariant || activeVariants[0] : null;

        setSelectedVariant(initialVariant);
        setVariantSelection(initialVariant?.options ? { ...initialVariant.options } : {});
        setActiveImageIdx(0);
        setQuantity(1);
        setActiveTab('description');
      } catch (err) {
        if (isAbortError(err)) return;
        setProduct(null);
        setGroupedSpecsFromApi([]);
        setRelated([]);
        setError(err instanceof Error ? err.message : 'Unable to load product.');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadProduct(controller.signal);
    return () => controller.abort();
  }, [loadProduct]);

  const loadReviews = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await apiRequest<{
        ok: true;
        reviews: ReviewItem[];
        summary: ReviewSummary;
        eligibility: { canReview: boolean };
      }>(`/api/products/${slug}/reviews?sort=${reviewSort}`);
      setReviews(Array.isArray(res.reviews) ? res.reviews : []);
      if (res.summary) {
        setReviewSummary({
          average: Number(res.summary.average || 0),
          total: Number(res.summary.total || 0),
          histogram: res.summary.histogram || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        });
      }
      setCanReview(Boolean(res.eligibility?.canReview));
    } catch {
      // Reviews unavailable when product or DB is offline
    }
  }, [slug, reviewSort]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews, user]);

  useSeoMeta({
    title: product ? `${product.seoTitle || product.name} | NOVARA COMMERCE` : 'Product Details | NOVARA COMMERCE',
    description: product?.seoDescription || product?.shortDescription || product?.description?.slice(0, 155),
    jsonLd: product
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          sku: selectedVariant?.sku || product.sku,
          description: product.shortDescription || product.description,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'BDT',
            price: selectedVariant?.salePrice ?? selectedVariant?.price ?? product.currentPrice,
            availability:
              product.manageInventory === false || product.allowBackorder || product.availableStock > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
          },
          ...(reviewSummary.total > 0
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: reviewSummary.average,
                  reviewCount: reviewSummary.total,
                },
              }
            : {}),
        }
      : undefined,
  });

  const variantDimensions = useMemo(() => {
    if (!product || !product.hasVariants || !product.variants?.length) return [];
    return extractVariantDimensions(product.variants, product.variantOptions);
  }, [product]);

  const dimensionOptionStates = useMemo(() => {
    if (!product || variantDimensions.length === 0) return {};
    return getDimensionOptionStates({
      variants: product.variants,
      dimensions: variantDimensions,
      currentSelection: variantSelection,
      allowBackorder: product.allowBackorder,
      manageInventory: product.manageInventory,
    });
  }, [product, variantDimensions, variantSelection]);

  const groupedSpecifications = useMemo(() => {
    if (groupedSpecsFromApi.length > 0) return groupedSpecsFromApi;
    if (!product) return [];
    return buildGroupedSpecifications({
      attributeValues: product.attributeValues,
      specifications: product.specifications,
      legacyAttributes: product.attributes,
    });
  }, [groupedSpecsFromApi, product]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const seen = new Set<string>();
    const list: Array<{ url: string; alt: string }> = [];
    const pushUnique = (url?: string, alt?: string) => {
      const clean = (url || '').trim();
      if (!clean || seen.has(clean)) return;
      seen.add(clean);
      list.push({ url: clean, alt: alt || product.name });
    };

    if (selectedVariant?.imageUrl) {
      pushUnique(selectedVariant.imageUrl, selectedVariant.title);
    }
    if (selectedVariant?.images?.length) {
      for (const img of selectedVariant.images) {
        if (typeof img === 'string') {
          pushUnique(img, selectedVariant.title);
        } else {
          pushUnique(img.url, img.alt || selectedVariant.title);
        }
      }
    }
    for (const img of product.images || []) {
      pushUnique(img.url, img.alt || product.name);
    }
    return list;
  }, [product, selectedVariant]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1380px] px-4 py-8">
        <div className="mb-4 h-4 w-64 animate-pulse rounded bg-slate-200/70" />
        <div className="grid grid-cols-1 gap-7 rounded-2xl border border-slate-200 bg-white p-6 lg:grid-cols-12">
          <div className="h-[460px] animate-pulse rounded-2xl bg-slate-200/70 lg:col-span-6" />
          <div className="space-y-4 lg:col-span-6">
            <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200/70" />
            <div className="h-9 w-3/4 animate-pulse rounded bg-slate-200/70" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200/70" />
            <div className="h-12 w-1/3 animate-pulse rounded bg-slate-200/70" />
            <div className="grid grid-cols-4 gap-2.5">
              <div className="h-20 animate-pulse rounded-xl bg-slate-200/70" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200/70" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200/70" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200/70" />
            </div>
            <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200/70" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#0F1D3A]">Product Unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{error || 'This product could not be found.'}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {error && (
            <button
              type="button"
              onClick={() => loadProduct()}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#0F1D3A] hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          )}
          <Link to="/shop" className="inline-block rounded-full bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white">
            Return to Shop
          </Link>
        </div>
      </div>
    );
  }

  const rawVariantPrice = selectedVariant?.price ?? product.basePrice;
  const variantSalePrice =
    selectedVariant?.salePrice ??
    (selectedVariant?.compareAtPrice && selectedVariant.compareAtPrice > rawVariantPrice
      ? rawVariantPrice
      : undefined);
  const variantBasePrice =
    selectedVariant?.compareAtPrice && selectedVariant.compareAtPrice > (variantSalePrice ?? rawVariantPrice)
      ? selectedVariant.compareAtPrice
      : rawVariantPrice;

  const activePricing = resolveEffectiveUnitPrice({
    basePrice: selectedVariant ? variantBasePrice : product.basePrice,
    salePrice: selectedVariant ? variantSalePrice : product.salePrice,
    flashSalePrice: product.flashSalePrice,
    flashSaleStartsAt: product.flashSaleStartsAt,
    flashSaleEndsAt: product.flashSaleEndsAt,
  });

  const manageInventory = product.manageInventory !== false;
  const allowBackorder = Boolean(product.allowBackorder);
  const rawActiveStock = selectedVariant
    ? computeAvailableStock(selectedVariant.stockOnHand, selectedVariant.reservedStock)
    : product.availableStock;
  const canPurchase = !manageInventory || allowBackorder || rawActiveStock > 0;
  const effectiveMaxQuantity = !manageInventory || allowBackorder ? Math.max(rawActiveStock, 99) : rawActiveStock;

  const activeSku = selectedVariant?.sku || product.sku;
  const safeImageIdx = activeImageIdx < galleryImages.length ? activeImageIdx : 0;
  const currentImgUrl = galleryImages[safeImageIdx]?.url || '';
  const visibleThumbnails = galleryImages.slice(0, 4);
  const extraImagesCount = Math.max(0, galleryImages.length - 4);

  const shippingEstimate = calculateShippingCharge({
    division: estDivision,
    district: estDistrict,
    upazila: estUpazila,
    subtotal: activePricing.currentPrice * quantity,
    config: settings?.shippingSettings,
    deliveryZones: settings?.deliveryZones,
  });
  const freeThreshold = settings?.shippingSettings?.freeShippingThreshold ?? 999;
  const currencyCfg = settings?.currencySettings;
  const productDetailAd = (promotionalAds || []).find((ad) => ad.placement === 'product_detail');

  const trustHighlights =
    settings?.productTrustHighlights && settings.productTrustHighlights.length > 0
      ? settings.productTrustHighlights
      : DEFAULT_TRUST_HIGHLIGHTS;

  const catObj = typeof product.categoryId === 'object' && product.categoryId ? product.categoryId : null;
  const subCatObj = typeof product.subCategoryId === 'object' && product.subCategoryId ? product.subCategoryId : null;

  const enabledContentSections = (product.contentSections || [])
    .filter((sec) => sec.isEnabled !== false && sec.showToCustomer !== false)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const sortedHighlights = (product.highlights || [])
    .filter((h) => h.title?.trim())
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .slice(0, 4);

  const ratingScoreDisplay = reviewSummary.total > 0 ? reviewSummary.average : Number(product.ratingAverage ?? 0);
  const ratingCountDisplay = reviewSummary.total > 0 ? reviewSummary.total : Number(product.reviewCount ?? 0);
  const featuredTopReview = reviews[0] || null;

  const handleSelectDimensionOption = (dimensionName: string, nextValue: string) => {
    const picked = pickVariantForOptionChange({
      variants: product.variants,
      currentSelection: variantSelection,
      dimensionName,
      nextValue,
      allowBackorder,
      manageInventory,
    });
    if (picked.variant) {
      setSelectedVariant(picked.variant as ProductVariant);
      setVariantSelection(picked.selection);
      setQuantity(1);
      if (picked.variant.imageUrl) {
        setActiveImageIdx(0);
      }
    }
  };

  const handleAddOrBuy = async (buyNow: boolean) => {
    if (!canPurchase) {
      dispatch(showToast({ variant: 'warning', message: 'This item is currently out of stock.' }));
      return;
    }

    const res = await dispatch(
      addToCartAsync({
        isAuthenticated: Boolean(user),
        item: {
          productId: product.id,
          variantId: selectedVariant?._id || null,
          slug: product.slug,
          name: product.name,
          shortDescription: product.shortDescription || '',
          sku: activeSku,
          variantTitle: selectedVariant?.title || null,
          imageUrl: currentImgUrl,
          unitPrice: activePricing.currentPrice,
          originalPrice: activePricing.originalPrice,
          discountPercent: activePricing.discountPercent,
          quantity,
          availableStock: effectiveMaxQuantity,
          isAvailable: true,
          selected: true,
        },
      }),
    );

    if (addToCartAsync.rejected.match(res)) {
      dispatch(showToast({ variant: 'error', message: String(res.payload || 'Unable to add item') }));
      return;
    }

    if (buyNow) {
      if (!user) {
        dispatch(
          openAuthModal({
            tab: 'login',
            returnUrl: '/checkout',
            notice: 'Sign in or register to complete your purchase.',
          }),
        );
        return;
      }
      navigate('/checkout');
    } else {
      dispatch(showToast({ variant: 'success', message: `Added ${quantity} × ${product.name} to cart.` }));
      dispatch(openCartDrawer());
    }
  };

  const handleWishlist = async () => {
    if (!product) return;
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
          message: res.payload.wishlisted ? 'Saved to wishlist.' : 'Removed from wishlist.',
        }),
      );
    } else {
      dispatch(showToast({ variant: 'error', message: String(res.payload || 'Wishlist update failed') }));
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.shortDescription || product.name, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      dispatch(showToast({ variant: 'success', message: 'Product link copied to clipboard.' }));
    } catch {
      dispatch(showToast({ variant: 'info', message: 'Share link ready in browser address bar.' }));
    }
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await apiRequest<{ ok: true; message: string }>(`/api/products/${product.slug}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: revRating, title: revTitle, comment: revComment }),
      });
      dispatch(showToast({ variant: 'success', message: res.message }));
      setRevTitle('');
      setRevComment('');
      setCanReview(false);
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Could not submit review' }));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleQuestionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      dispatch(
        openAuthModal({
          tab: 'login',
          notice: 'Sign in to ask a question about this product.',
        }),
      );
      return;
    }
    if (questionInput.trim().length < 5) {
      dispatch(showToast({ variant: 'warning', message: 'Please write a question of at least 5 characters.' }));
      return;
    }
    setSubmittingQuestion(true);
    try {
      const res = await apiRequest<{ ok: true; question: ProductQuestionItem; message: string }>(
        `/api/products/${product.slug}/questions`,
        {
          method: 'POST',
          body: JSON.stringify({ question: questionInput.trim() }),
        },
      );
      setLocalQuestions((prev) => [res.question, ...prev]);
      setQuestionInput('');
      dispatch(showToast({ variant: 'success', message: res.message }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Could not submit question' }));
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const jumpToTab = (tab: PdpTab) => {
    setActiveTab(tab);
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mx-auto max-w-[1380px] px-4 py-5 sm:py-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <Link to="/" className="hover:text-[#1155EE]">
          Home
        </Link>
        {catObj ? (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <Link to={`/category/${catObj.slug}`} className="hover:text-[#1155EE]">
              {catObj.name}
            </Link>
          </>
        ) : (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <Link to="/shop" className="hover:text-[#1155EE]">
              Shop
            </Link>
          </>
        )}
        {subCatObj && subCatObj.slug && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <Link
              to={catObj ? `/category/${catObj.slug}?subCategory=${subCatObj.slug}` : `/shop?subCategory=${subCatObj.slug}`}
              className="hover:text-[#1155EE]"
            >
              {subCatObj.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-semibold text-[#0B1730]">{product.name}</span>
      </nav>

      {/* Main Product Showcase Card */}
      <div className="grid grid-cols-1 gap-7 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-7 lg:grid-cols-12">
        {/* A. Left Vertical Gallery + Main Stage */}
        <div className="min-w-0 lg:col-span-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-3.5">
            {/* Thumbnail Rail */}
            {galleryImages.length > 0 && (
              <div className="grid w-full grid-cols-5 gap-2 sm:flex sm:w-[76px] sm:shrink-0 sm:flex-col sm:gap-2.5">
                {visibleThumbnails.map((img, idx) => {
                  const isActive = safeImageIdx === idx;
                  return (
                    <button
                      key={`${img.url}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      aria-label={`View product image ${idx + 1}`}
                      className={`aspect-square min-w-0 w-full overflow-hidden rounded-xl bg-[#F3F7FF] p-1 transition-all sm:h-[76px] sm:w-[76px] sm:p-1.5 ${
                        isActive
                          ? 'border-2 border-[#1155EE] shadow-xs'
                          : 'border border-slate-200/80 hover:border-[#1155EE]/60'
                      }`}
                    >
                      <ResilientImage src={img.url} alt={img.alt || product.name} className="h-full w-full object-contain" />
                    </button>
                  );
                })}
                {extraImagesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setGalleryModalOpen(true)}
                    aria-label={`View ${extraImagesCount} more gallery images`}
                    className="flex aspect-square min-w-0 w-full items-center justify-center rounded-xl border border-slate-200/80 bg-[#F3F7FF] text-xs font-extrabold text-[#0B1730] transition-colors hover:border-[#1155EE] hover:text-[#1155EE] sm:h-[76px] sm:w-[76px] sm:text-base"
                  >
                    +{extraImagesCount}
                  </button>
                )}
              </div>
            )}

            {/* Main Image Stage */}
            <div
              onMouseEnter={() => setIsHoveringStage(true)}
              onMouseLeave={() => {
                setIsHoveringStage(false);
                setZoomOrigin({ x: 50, y: 50 });
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                setZoomOrigin({ x, y });
              }}
              onClick={() => setZoomActive((prev) => !prev)}
              className="group relative flex aspect-[4/3] flex-1 cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-[#F3F7FF] p-5 sm:aspect-square sm:p-7"
            >
              {/* Top-left discount badge */}
              <div className="pointer-events-none absolute left-3.5 top-3.5 z-10 flex flex-wrap items-center gap-2">
                {activePricing.discountPercent > 0 && (
                  <span className="rounded-full bg-[#1155EE] px-3 py-1 text-xs font-bold text-white shadow-xs">
                    -{activePricing.discountPercent}%
                  </span>
                )}
                {activePricing.isFlashSaleActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                    <Zap className="h-3 w-3" /> Flash Sale
                  </span>
                )}
              </div>

              {/* Top-right action icons */}
              <div
                className="absolute right-3.5 top-3.5 z-10 flex flex-col gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handleWishlist}
                  aria-pressed={isWishlisted}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-xs transition-colors ${
                    isWishlisted
                      ? 'border-rose-200 bg-rose-50 text-rose-500'
                      : 'border-slate-200/80 bg-white/95 text-slate-600 hover:border-rose-200 hover:text-rose-600'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share product"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-xs transition-colors hover:border-[#1155EE]/40 hover:text-[#1155EE]"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              {/* Prev/Next subtle arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIdx((i) => (i - 1 + galleryImages.length) % galleryImages.length);
                    }}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIdx((i) => (i + 1) % galleryImages.length);
                    }}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              <ResilientImage
                src={currentImgUrl}
                alt={galleryImages[safeImageIdx]?.alt || product.name}
                loading="eager"
                style={{
                  transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                  transform: zoomActive || isHoveringStage ? 'scale(1.42)' : 'scale(1)',
                }}
                className="h-full w-full object-contain transition-transform duration-200 ease-out"
              />

              {/* Bottom frosted Hover to zoom pill */}
              <div className="pointer-events-none absolute bottom-3.5 left-1/2 z-10 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/95 px-3.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                  <ZoomIn className="h-3.5 w-3.5 text-slate-500" />
                  {zoomActive ? 'Click to reset zoom' : 'Hover to zoom'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* B. Right Identity, Highlights, Variants & Purchase Panel */}
        <div className="lg:col-span-6 space-y-4">
          {/* Merchandising Flag Badge (only if active) */}
          {(product.isBestSeller || product.isNewArrival || product.isFeatured) && (
            <div>
              {product.isBestSeller ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1155EE] px-3 py-1 text-[11px] font-bold text-white">
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300" /> Best Seller
                </span>
              ) : product.isNewArrival ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1155EE] px-3 py-1 text-[11px] font-bold text-white">
                  New Arrival
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF4FF] px-3 py-1 text-[11px] font-bold text-[#1155EE]">
                  Featured
                </span>
              )}
            </div>
          )}

          {/* Title & Tagline */}
          <div>
            <h1 className="font-display text-2xl font-extrabold leading-tight text-[#0B1730] sm:text-[30px]">
              {product.name}
            </h1>
            {product.shortDescription && (
              <p className="mt-1 text-sm text-slate-500">{product.shortDescription}</p>
            )}
          </div>

          {/* Rating + Sold Count Row */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            {ratingCountDisplay > 0 ? (
              <button
                type="button"
                onClick={() => jumpToTab('reviews')}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= Math.round(ratingScoreDisplay)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-200'
                      }`}
                    />
                  ))}
                </span>
                <span className="font-bold text-[#0B1730]">{ratingScoreDisplay.toFixed(1)}</span>
                <span className="text-slate-500">({ratingCountDisplay.toLocaleString()} Reviews)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => jumpToTab('reviews')}
                className="text-xs font-medium text-slate-500 hover:text-[#1155EE]"
              >
                No verified reviews yet
              </button>
            )}

            {Number(product.soldCount ?? 0) > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  |
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-[#0B1730]">
                  <ShoppingBag className="h-3.5 w-3.5 text-[#1155EE]" />
                  {Number(product.soldCount ?? 0).toLocaleString()} Sold
                </span>
              </>
            )}

            {product.brandName && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  |
                </span>
                <span className="font-semibold text-[#1155EE]">{product.brandName}</span>
              </>
            )}
          </div>

          {/* Pricing Row */}
          <div className="flex flex-wrap items-center gap-3 pt-0.5">
            <span className="font-mono-tabular text-3xl font-extrabold text-[#1155EE]">
              {formatStoreCurrency(activePricing.currentPrice, currencyCfg)}
            </span>
            {activePricing.originalPrice && (
              <span className="font-mono-tabular text-lg font-medium text-slate-400 line-through">
                {formatStoreCurrency(activePricing.originalPrice, currencyCfg)}
              </span>
            )}
            {activePricing.discountPercent > 0 && (
              <span className="rounded-md bg-[#1155EE] px-2.5 py-1 text-xs font-bold text-white">
                {activePricing.discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Stock Status Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {!manageInventory ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                In Stock
              </span>
            ) : rawActiveStock > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                In Stock
              </span>
            ) : allowBackorder ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Available on Backorder
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-rose-600">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Out of Stock
              </span>
            )}
            <span className="text-slate-500">
              {canPurchase
                ? allowBackorder && rawActiveStock <= 0
                  ? 'Ships as soon as restocked'
                  : 'Available for immediate delivery'
                : 'Currently unavailable'}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="font-mono-tabular text-slate-400">SKU: {activeSku}</span>
          </div>

          {/* 4-Column Quick Highlights Grid (dynamic from product.highlights) */}
          {sortedHighlights.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {sortedHighlights.map((item, idx) => (
                <div
                  key={`${item.title}-${idx}`}
                  className="flex flex-col items-center justify-center rounded-xl bg-[#F4F7FE] px-2.5 py-3 text-center"
                >
                  <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#1155EE] shadow-2xs">
                    {renderHighlightIcon(item.icon, 'h-4 w-4 text-[#1155EE]')}
                  </div>
                  <div className="text-[11px] font-bold leading-tight text-[#0B1730]">{item.title}</div>
                  {item.subtitle && (
                    <div className="mt-0.5 text-[10px] leading-tight text-slate-500">{item.subtitle}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Multi-Dimension Variant Selectors */}
          {variantDimensions.length > 0 && (
            <div className="space-y-3.5 pt-1">
              {variantDimensions.map((dim) => {
                const states = dimensionOptionStates[dim.name] || [];
                const currentSelectedLabel = variantSelection[dim.name] || '';

                return (
                  <div key={dim.name}>
                    <div className="mb-2 flex items-center gap-2 text-xs">
                      <span className="font-bold text-[#0B1730]">{dim.name}:</span>
                      {dim.isColorDimension && currentSelectedLabel && (
                        <span className="font-medium text-slate-500">{currentSelectedLabel}</span>
                      )}
                    </div>

                    {dim.isColorDimension ? (
                      <div className="flex flex-wrap items-center gap-3">
                        {states.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            disabled={!opt.selectable}
                            onClick={() => handleSelectDimensionOption(dim.name, opt.label)}
                            aria-label={`${dim.name}: ${opt.label}${opt.selectable ? '' : ' (Out of stock)'}`}
                            title={opt.label}
                            style={{ backgroundColor: opt.colorHex || '#64748B' }}
                            className={`relative h-8 w-8 rounded-full border border-slate-300/80 transition-all ${
                              opt.isSelected
                                ? 'ring-2 ring-[#1155EE] ring-offset-2'
                                : opt.selectable
                                  ? 'hover:scale-105'
                                  : 'cursor-not-allowed opacity-35'
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {states.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            disabled={!opt.selectable}
                            onClick={() => handleSelectDimensionOption(dim.name, opt.label)}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                              opt.isSelected
                                ? 'border-2 border-[#1155EE] bg-white text-[#0B1730] shadow-xs'
                                : opt.selectable
                                  ? 'border border-slate-300 bg-white text-[#0B1730] hover:border-[#1155EE]/60'
                                  : 'cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400 line-through'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quantity Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="text-xs font-bold text-[#0B1730]">Quantity:</span>
            <div className="flex h-10 items-center rounded-xl border border-slate-300 bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-l-xl"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono-tabular w-10 text-center text-sm font-bold text-[#0B1730]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(Math.max(1, effectiveMaxQuantity), q + 1))}
                aria-label="Increase quantity"
                className="px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-r-xl"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {manageInventory && !allowBackorder && rawActiveStock > 0 && rawActiveStock <= 10 && (
              <span className="text-[11px] font-medium text-amber-700">{rawActiveStock} available</span>
            )}
          </div>

          {/* Primary Action Buttons (Add to Cart + Add to Wishlist side-by-side, matching reference) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!canPurchase}
              onClick={() => handleAddOrBuy(false)}
              className="flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#1155EE] px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#0B44CC] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <ShoppingCart className="h-4 w-4" />
              {canPurchase ? 'Add to Cart' : 'Out of Stock'}
            </button>

            <button
              type="button"
              onClick={handleWishlist}
              aria-pressed={isWishlisted}
              className={`flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-5 text-sm font-semibold transition-colors ${
                isWishlisted
                  ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100/70'
                  : 'border-[#0B1730]/80 bg-white text-[#0B1730] hover:border-[#1155EE] hover:text-[#1155EE]'
              }`}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
              {isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
            </button>
          </div>

          {/* Express Buy Now + Collapsible BD Delivery Estimator */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-[#F8FAFF] px-3.5 py-2.5 text-xs">
            <button
              type="button"
              onClick={() => setEstimatorOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 font-semibold text-[#0B1730] hover:text-[#1155EE]"
            >
              <Truck className="h-4 w-4 text-[#1155EE]" />
              <span>
                Delivery to <strong>{estDistrict}</strong>:{' '}
                <span className="text-[#1155EE]">
                  {shippingEstimate.freeShippingApplied
                    ? 'FREE'
                    : formatStoreCurrency(shippingEstimate.charge, currencyCfg)}
                </span>{' '}
                ({shippingEstimate.estimatedDays})
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${estimatorOpen ? 'rotate-180' : ''}`} />
            </button>

            {canPurchase && (
              <button
                type="button"
                onClick={() => handleAddOrBuy(true)}
                className="font-bold text-[#1155EE] hover:underline"
              >
                Express Buy Now →
              </button>
            )}
          </div>

          {estimatorOpen && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-2.5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  aria-label="Select division"
                  value={estDivision}
                  onChange={(e) => {
                    const nextDiv = e.target.value;
                    setEstDivision(nextDiv);
                    const dists = getDistrictsForDivision(nextDiv);
                    const firstDist = dists[0]?.name || '';
                    setEstDistrict(firstDist);
                    const upas = getUpazilasForDistrict(nextDiv, firstDist);
                    setEstUpazila(upas[0]?.name || '');
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                >
                  {getDivisionNames().map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Select district"
                  value={estDistrict}
                  onChange={(e) => {
                    const nextDist = e.target.value;
                    setEstDistrict(nextDist);
                    const upas = getUpazilasForDistrict(estDivision, nextDist);
                    setEstUpazila(upas[0]?.name || '');
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                >
                  {getDistrictsForDivision(estDivision).map((dist) => (
                    <option key={dist.name} value={dist.name}>
                      {dist.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Select upazila"
                  value={estUpazila}
                  onChange={(e) => setEstUpazila(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                >
                  {getUpazilasForDistrict(estDivision, estDistrict).map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-2 text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {settings?.paymentMethods?.codEnabled === false ? 'Prepaid Online Checkout' : 'Cash on Delivery Available'}
                </span>
                {product.warrantyInfo && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#1155EE]" /> {product.warrantyInfo}
                  </span>
                )}
              </div>
            </div>
          )}

          {productDetailAd && (
            <a
              href={productDetailAd.destinationUrl}
              onClick={() => {
                fetch(`/api/storefront/ads/${productDetailAd.id}/track`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ event: 'click' }),
                }).catch(() => undefined);
              }}
              className="block overflow-hidden rounded-xl border border-slate-200 bg-white transition-opacity hover:opacity-95"
            >
              <ResilientImage
                src={productDetailAd.imageUrl}
                alt={productDetailAd.altText || productDetailAd.title}
                className="max-h-24 w-full object-cover"
              />
            </a>
          )}
        </div>
      </div>

      {/* C. 5-Item Trust & Service Strip Card */}
      <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-xs">
        <div className="grid grid-cols-1 divide-y divide-slate-200/70 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
          {trustHighlights.map((item, idx) => (
            <div key={`${item.title}-${idx}`} className="flex items-center justify-center gap-3 px-4 py-2.5 lg:py-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF]">
                {renderHighlightIcon(item.icon, 'h-5 w-5 text-[#1155EE]')}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#0B1730]">{item.title}</div>
                <div className="text-[11px] text-slate-500">{item.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* D. 5-Tab Product Information, Specs, Reviews, Q&A & Shipping Card */}
      <div ref={tabsRef} className="mt-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center gap-6 overflow-x-auto border-b border-slate-200 px-5 sm:px-7">
          {(
            [
              { id: 'description', label: 'Description' },
              { id: 'specs', label: 'Specifications' },
              {
                id: 'reviews',
                label: `Customer Reviews (${ratingCountDisplay.toLocaleString()})`,
              },
              {
                id: 'qa',
                label: `Q&A${(product.faqs?.length || 0) + localQuestions.length > 0 ? ` (${(product.faqs?.length || 0) + localQuestions.length})` : ''}`,
              },
              { id: 'shipping', label: 'Shipping & Return' },
            ] as const
          ).map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`whitespace-nowrap border-b-2 py-4 text-xs sm:text-sm transition-colors ${
                  isActive
                    ? 'border-[#1155EE] font-semibold text-[#1155EE]'
                    : 'border-transparent font-medium text-slate-600 hover:text-[#0B1730]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-7">
          {/* Tab 1: Description + Key Features + Custom Sections + Right Embedded Reviews Card */}
          {activeTab === 'description' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-8">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B1730]">Product Description</h2>
                  <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {product.description}
                  </p>
                </div>

                {product.features && product.features.length > 0 && (
                  <ul className="space-y-2.5">
                    {product.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-[#0B1730]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1155EE] text-white">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Custom Content Sections */}
                {enabledContentSections.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {enabledContentSections.map((sec, idx) => (
                      <section
                        key={sec.sectionId || idx}
                        className="rounded-xl border border-slate-200/80 bg-[#F8FAFF] p-4 sm:p-5"
                      >
                        <h3 className="font-display text-sm font-bold text-[#0B1730]">{sec.title}</h3>
                        {sec.mediaUrl && (
                          <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <ResilientImage src={sec.mediaUrl} alt={sec.title} className="max-h-60 w-full object-cover" />
                          </div>
                        )}
                        {sec.sectionType === 'bullet_list' && (!sec.fields || sec.fields.length === 0) && sec.body ? (
                          <ul className="mt-2.5 space-y-2">
                            {sec.body
                              .split('\n')
                              .map((line) => line.trim())
                              .filter(Boolean)
                              .map((line, bIdx) => (
                                <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#0B1730]">
                                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#1155EE] text-white">
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </span>
                                  <span>{line}</span>
                                </li>
                              ))}
                          </ul>
                        ) : (
                          sec.body && (
                            <p className="mt-1.5 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-600">
                              {sec.body}
                            </p>
                          )
                        )}
                        {sec.fields && sec.fields.length > 0 && sec.sectionType === 'bullet_list' && (
                          <ul className="mt-3 space-y-2">
                            {sec.fields.map((field, fIdx) => (
                              <li key={`${field.label}-${fIdx}`} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#0B1730]">
                                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#1155EE] text-white">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </span>
                                <span>
                                  {field.label && <strong className="font-semibold">{field.label}</strong>}
                                  {field.label && field.value ? ' — ' : ''}
                                  <span className="text-slate-600">
                                    {field.value}
                                    {field.unit ? ` ${field.unit}` : ''}
                                  </span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {sec.fields && sec.fields.length > 0 && sec.sectionType !== 'bullet_list' && (
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {sec.fields.map((field, fIdx) => (
                              <div
                                key={`${field.label}-${fIdx}`}
                                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs border border-slate-100"
                              >
                                <span className="font-medium text-slate-500">{field.label}</span>
                                <span className="font-semibold text-[#0B1730]">
                                  {field.value}
                                  {field.unit ? ` ${field.unit}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    ))}
                  </div>
                )}

                {/* Product Videos */}
                {product.videos && product.videos.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="font-display text-sm font-bold text-[#0B1730]">Product Videos</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {product.videos.map((vid, idx) => (
                        <a
                          key={`${vid.url}-${idx}`}
                          href={vid.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[#F8FAFF] p-3 hover:border-[#1155EE]/50"
                        >
                          <PlayCircle className="h-8 w-8 shrink-0 text-[#1155EE]" />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-[#0B1730]">{vid.title || 'Watch Video'}</div>
                            <div className="truncate text-[11px] text-slate-500">{vid.url}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Embedded Customer Reviews Summary Card */}
              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-[#0B1730]">Customer Reviews</h3>
                    <button
                      type="button"
                      onClick={() => jumpToTab('reviews')}
                      className="text-xs font-semibold text-[#1155EE] hover:underline"
                    >
                      See All Reviews →
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <span className="font-mono-tabular text-4xl font-extrabold text-[#0B1730]">
                      {ratingCountDisplay > 0 ? ratingScoreDisplay.toFixed(1) : '0.0'}
                    </span>
                    <div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${
                              s <= Math.round(ratingScoreDisplay)
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-slate-200 text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        Based on {ratingCountDisplay.toLocaleString()} review{ratingCountDisplay === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>

                  {/* 5 -> 1 Blue Histogram */}
                  <div className="mt-4 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviewSummary.histogram[star] || 0;
                      const pct = reviewSummary.total > 0 ? Math.round((count / reviewSummary.total) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-2.5 text-xs">
                          <span className="w-10 font-medium text-slate-600">{star} Star</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#1155EE]" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono-tabular w-9 text-right text-slate-600">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Top Featured Review Card */}
                  {featuredTopReview ? (
                    <div className="mt-4 rounded-xl border border-slate-200/80 bg-[#F8FAFF] p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#0B1730]">{featuredTopReview.userName}</span>
                        {featuredTopReview.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-0.5">
                        {Array.from({ length: featuredTopReview.rating }).map((_, idx) => (
                          <Star key={idx} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600">
                        {featuredTopReview.comment}
                      </p>
                      <div className="mt-1.5 text-right text-[10px] text-slate-400">
                        {new Date(featuredTopReview.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-[#F8FAFF] p-4 text-center text-xs text-slate-500">
                      No approved reviews yet. Verified buyers can share the first review!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Grouped Dynamic Specifications */}
          {activeTab === 'specs' && (
            <div className="space-y-5">
              {groupedSpecifications.length === 0 ? (
                <p className="text-sm text-slate-500">No structured technical specifications added for this product yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {groupedSpecifications.map((grp) => (
                    <div key={grp.groupName} className="rounded-xl border border-slate-200/80 overflow-hidden">
                      <div className="bg-[#F4F7FE] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#0B1730]">
                        {grp.groupName}
                      </div>
                      <dl className="divide-y divide-slate-100 bg-white">
                        {grp.items.map((row, idx) => (
                          <div key={`${row.label}-${idx}`} className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs sm:text-sm">
                            <dt className="font-medium text-slate-500">{row.label}</dt>
                            <dd className="flex items-center gap-2 text-right font-semibold text-[#0B1730]">
                              {row.colorHex && (
                                <span
                                  className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300"
                                  style={{ backgroundColor: row.colorHex }}
                                />
                              )}
                              <span>{row.value}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Full Customer Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B1730]">Customer Reviews</h2>
                  <p className="text-xs text-slate-500">Verified buyer feedback for {product.name}</p>
                </div>
                <select
                  aria-label="Sort reviews"
                  value={reviewSort}
                  onChange={(e) => setReviewSort(e.target.value as 'newest' | 'highest' | 'lowest')}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#0B1730]"
                >
                  <option value="newest">Newest First</option>
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="lg:col-span-4 space-y-5">
                  <div className="rounded-xl bg-[#F4F7FE] p-5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono-tabular text-4xl font-extrabold text-[#0B1730]">
                        {reviewSummary.total > 0 ? reviewSummary.average.toFixed(1) : '0.0'}
                      </span>
                      <span className="text-sm text-slate-500">/ 5.0</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Based on {reviewSummary.total} approved review{reviewSummary.total === 1 ? '' : 's'}
                    </p>
                    <div className="mt-4 space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviewSummary.histogram[star] || 0;
                        const pct = reviewSummary.total > 0 ? Math.round((count / reviewSummary.total) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="w-10 font-semibold text-slate-600">{star}★</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                              <div className="h-full rounded-full bg-[#1155EE]" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-mono-tabular w-9 text-right text-slate-500">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {canReview ? (
                    <form onSubmit={handleReviewSubmit} className="space-y-3 rounded-xl border border-slate-200 p-4">
                      <h3 className="font-display text-sm font-bold text-[#0B1730]">Write a Verified Review</h3>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Rating</label>
                        <select
                          value={revRating}
                          onChange={(e) => setRevRating(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                        >
                          {[5, 4, 3, 2, 1].map((r) => (
                            <option key={r} value={r}>
                              {r} Stars
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        required
                        minLength={3}
                        value={revTitle}
                        onChange={(e) => setRevTitle(e.target.value)}
                        placeholder="Review headline"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                      <textarea
                        required
                        minLength={10}
                        rows={3}
                        value={revComment}
                        onChange={(e) => setRevComment(e.target.value)}
                        placeholder="Share your honest experience with this product..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="w-full rounded-lg bg-[#1155EE] py-2 text-xs font-semibold text-white hover:bg-[#0B44CC]"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Only customers with a delivered order for this item can submit a verified review.
                    </p>
                  )}
                </div>

                <div className="lg:col-span-8">
                  {reviews.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      No approved reviews for this product yet.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {reviews.map((rev) => (
                        <article key={rev._id} className="rounded-xl border border-slate-200/80 bg-[#F8FAFF] p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[#0B1730]">{rev.userName}</span>
                              {rev.isVerifiedPurchase && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: rev.rating }).map((_, idx) => (
                              <Star key={idx} className="h-3.5 w-3.5 fill-amber-400" />
                            ))}
                          </div>
                          <h4 className="mt-2 text-sm font-semibold text-[#0B1730]">{rev.title}</h4>
                          <p className="mt-1 text-sm text-slate-600">{rev.comment}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: FAQs + Customer Questions & Answers */}
          {activeTab === 'qa' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-8">
                <h2 className="font-display text-lg font-bold text-[#0B1730]">Questions & Answers</h2>
                {(!product.faqs || product.faqs.length === 0) && localQuestions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    No questions asked yet. Use the form to ask our product team!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {localQuestions.map((q, idx) => (
                      <div key={q.id || q._id || idx} className="rounded-xl border border-slate-200/80 bg-[#F8FAFF] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#1155EE]" />
                            <p className="text-sm font-semibold text-[#0B1730]">{q.question}</p>
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {q.askedBy}
                          </span>
                        </div>
                        {q.answer ? (
                          <div className="mt-2 pl-6 text-xs sm:text-sm text-slate-600">
                            <span className="font-semibold text-emerald-700">Answer: </span>
                            {q.answer}
                          </div>
                        ) : (
                          <p className="mt-1.5 pl-6 text-xs italic text-slate-400">Awaiting response from store team</p>
                        )}
                      </div>
                    ))}
                    {(product.faqs || []).map((faq, idx) => (
                      <div key={`faq-${idx}`} className="rounded-xl border border-slate-200/80 bg-white p-4">
                        <p className="text-sm font-semibold text-[#0B1730]">Q: {faq.question}</p>
                        <p className="mt-1 text-sm text-slate-600">A: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-4">
                <form onSubmit={handleQuestionSubmit} className="rounded-2xl border border-slate-200 bg-[#F8FAFF] p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquarePlus className="h-4 w-4 text-[#1155EE]" />
                    <h3 className="font-display text-sm font-bold text-[#0B1730]">Ask a Question</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Have a question about compatibility, warranty, or delivery? Ask directly below.
                  </p>
                  <textarea
                    rows={3}
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Type your question (min 5 characters)..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#1155EE] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingQuestion}
                    className="w-full rounded-xl bg-[#1155EE] py-2.5 text-xs font-semibold text-white hover:bg-[#0B44CC] disabled:opacity-60"
                  >
                    {submittingQuestion ? 'Submitting...' : user ? 'Submit Question' : 'Sign In to Ask'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 5: Shipping & Return */}
          {activeTab === 'shipping' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-3 text-sm text-slate-600 lg:col-span-7">
                <h2 className="font-display text-lg font-bold text-[#0B1730]">Delivery & Return Policy</h2>
                <p>
                  <strong className="text-[#0B1730]">Dhaka Metro:</strong>{' '}
                  {formatStoreCurrency(settings?.shippingSettings?.dhakaMetroCharge ?? 60, currencyCfg)} (1–2 business days).
                  {freeThreshold > 0 && ` Free on orders of ${formatStoreCurrency(freeThreshold, currencyCfg)}+.`}
                </p>
                <p>
                  <strong className="text-[#0B1730]">Dhaka Suburbs:</strong>{' '}
                  {formatStoreCurrency(settings?.shippingSettings?.dhakaSuburbCharge ?? 90, currencyCfg)} (2–3 business days).
                </p>
                <p>
                  <strong className="text-[#0B1730]">Nationwide (64 Districts):</strong>{' '}
                  {formatStoreCurrency(settings?.shippingSettings?.nationwideCharge ?? 120, currencyCfg)} (3–5 business days).
                </p>
                <p>
                  <strong className="text-[#0B1730]">Warranty:</strong>{' '}
                  {product.warrantyInfo || 'Official brand warranty applies as stated on invoice.'}
                </p>
                <p>
                  <strong className="text-[#0B1730]">Return Policy:</strong>{' '}
                  {product.returnPolicyNote || '7-day easy replacement for eligible unopened or defective items.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[#F8FAFF] p-4 text-xs space-y-3 lg:col-span-5">
                <div className="flex items-center gap-2 font-bold text-[#0B1730]">
                  <Truck className="h-4 w-4 text-[#1155EE]" />
                  Calculate Delivery Charge
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <select
                    value={estDivision}
                    onChange={(e) => {
                      const nextDiv = e.target.value;
                      setEstDivision(nextDiv);
                      const dists = getDistrictsForDivision(nextDiv);
                      const firstDist = dists[0]?.name || '';
                      setEstDistrict(firstDist);
                      setEstUpazila(getUpazilasForDistrict(nextDiv, firstDist)[0]?.name || '');
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                  >
                    {getDivisionNames().map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={estDistrict}
                    onChange={(e) => {
                      const nextDist = e.target.value;
                      setEstDistrict(nextDist);
                      setEstUpazila(getUpazilasForDistrict(estDivision, nextDist)[0]?.name || '');
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                  >
                    {getDistrictsForDivision(estDivision).map((dist) => (
                      <option key={dist.name} value={dist.name}>{dist.name}</option>
                    ))}
                  </select>
                  <select
                    value={estUpazila}
                    onChange={(e) => setEstUpazila(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                  >
                    {getUpazilasForDistrict(estDivision, estDistrict).map((u) => (
                      <option key={u.name} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                  <span>ETA: <strong className="text-[#0B1730]">{shippingEstimate.estimatedDays}</strong></span>
                  <span className="font-mono-tabular font-bold text-[#1155EE]">
                    {shippingEstimate.freeShippingApplied
                      ? 'FREE SHIPPING'
                      : formatStoreCurrency(shippingEstimate.charge, currencyCfg)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* E. Related Products 6-Column Strip */}
      {related.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="h-5 w-1 rounded-full bg-[#1155EE]" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-[#0B1730]">Related Products</h2>
            </div>
            <Link
              to={catObj ? `/category/${catObj.slug}` : '/shop'}
              className="text-xs font-semibold text-[#1155EE] hover:underline"
            >
              View More Products →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
            {related.slice(0, 6).map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Interactive Gallery Lightbox Modal (+N click) */}
      <Modal
        open={galleryModalOpen}
        onClose={() => setGalleryModalOpen(false)}
        title={product.name}
        description={`Image ${safeImageIdx + 1} of ${galleryImages.length}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="relative flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-[#F3F7FF] p-6">
            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveImageIdx((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                aria-label="Previous gallery photo"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#0B1730] shadow-md hover:bg-slate-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <ResilientImage
              src={currentImgUrl}
              alt={galleryImages[safeImageIdx]?.alt || product.name}
              className="max-h-[420px] w-full object-contain"
            />
            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveImageIdx((i) => (i + 1) % galleryImages.length)}
                aria-label="Next gallery photo"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#0B1730] shadow-md hover:bg-slate-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            {galleryImages.map((img, idx) => (
              <button
                key={`modal-${img.url}-${idx}`}
                type="button"
                onClick={() => setActiveImageIdx(idx)}
                className={`h-16 w-16 overflow-hidden rounded-xl bg-[#F3F7FF] p-1 ${
                  safeImageIdx === idx ? 'border-2 border-[#1155EE]' : 'border border-slate-200'
                }`}
              >
                <ResilientImage src={img.url} alt={img.alt} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
