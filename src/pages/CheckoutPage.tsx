import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Gift,
  Headphones,
  Home,
  Lock,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tag,
  Truck,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { openAuthModal } from '../features/auth/authSlice';
import { applyCouponAsync, clearCartAfterOrder } from '../features/cart/cartSlice';
import { showToast } from '../features/notifications/toastSlice';
import { apiRequest, isAbortError } from '../services/api';
import { CartHeroSlider } from '../components/cart/CartHeroSlider';
import { ResilientImage } from '../components/ui/ResilientImage';
import {
  DEFAULT_CHECKOUT_HERO_SETTINGS,
  FALLBACK_CHECKOUT_HERO_SLIDES,
  filterAndSortHeroSlides,
  normalizeCheckoutHeroSettings,
} from '../lib/cartHero';
import {
  BD_DIVISIONS,
  buildAvailableDeliveryOptions,
  calculateShippingCharge,
  validateBangladeshAddressHierarchy,
  type BdDivision,
} from '../lib/bdLocations';
import { calculateOrderTotals } from '../lib/pricingEngine';
import { formatStoreCurrency } from '../lib/dateTime';
import { useSeoMeta } from '../lib/useSeoMeta';
import type {
  CartHeroSliderSettings,
  HeroSlideRecord,
  HomepageConfigData,
  SavedAddress,
} from '../types/commerce';

type CheckoutPaymentMethod = 'cod' | 'bkash' | 'nagad' | 'sslcommerz' | 'card';

interface GatewayCapabilityItem {
  configured: boolean;
  mode: string;
}

interface GatewayCapabilities {
  cod: GatewayCapabilityItem;
  bkash: GatewayCapabilityItem;
  nagad: GatewayCapabilityItem;
  sslcommerz: GatewayCapabilityItem;
  card: GatewayCapabilityItem;
  anyOnline: boolean;
}

interface QuoteDeliveryOption {
  code: string;
  name: string;
  description: string;
  methodType: 'standard' | 'express';
  estimatedTime: string;
  charge: number;
  freeShippingApplied: boolean;
  zone: 'dhaka_metro' | 'dhaka_suburb' | 'nationwide';
  zoneName?: string;
}

interface QuotePayload {
  subtotal: number;
  discount: number;
  tax: number;
  shippingCharge: number;
  total: number;
  couponCode?: string | null;
  shippingZone: string;
  deliveryOptionCode: string;
  deliveryMethodName: string;
  deliveryEta: string;
  freeShippingApplied: boolean;
  availableDeliveryOptions: QuoteDeliveryOption[];
  gatewayConfigured: boolean;
  gatewayCapabilities?: GatewayCapabilities;
  paymentMethods?: HomepageConfigData['paymentMethods'] | null;
}

function CodCashIcon({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="10" width="32" height="20" rx="3" fill="#DCFCE7" stroke="#0F1D3A" strokeWidth="2.2" />
      <rect x="10" y="14" width="24" height="12" rx="1.5" stroke="#16A34A" strokeWidth="1.6" />
      <circle cx="22" cy="20" r="4" fill="#22C55E" fillOpacity="0.25" stroke="#15803D" strokeWidth="1.8" />
      <path
        d="M12 34h18c3 0 5-1.5 7-3.5l4-4c1.2-1.2 1.2-3 0-4.2-1.1-1.1-2.9-1-4 .2l-3.5 3.5H23"
        stroke="#0F1D3A"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 31h7v9H8a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" fill="#E0ECFF" stroke="#0F1D3A" strokeWidth="2.2" />
    </svg>
  );
}

function BkashBirdSvg({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M12 10L25 22L18 28L12 10Z" fill="#E2136E" />
      <path d="M25 22L38 15L31 28L25 22Z" fill="#D11062" />
      <path d="M18 28L25 22L31 28L24 38L18 28Z" fill="#F03B8A" />
      <path d="M31 28L38 15L41 19L34 31L31 28Z" fill="#B50D54" />
      <path d="M12 10L8 14L15 21L12 10Z" fill="#C40F5C" />
    </svg>
  );
}

function NagadEmblemSvg({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="17" fill="#FFF2E8" stroke="#F15A24" strokeWidth="2.4" />
      <path
        d="M24 11c7.2 0 13 5.8 13 13 0 5.4-3.3 10.1-8 12.1 2.9-2.8 4.2-7.1 2.7-11.2-1.8-4.9-7-7.7-12.1-6.5C15.5 19.4 13 23.1 13 27.3c0-9 4.9-16.3 11-16.3Z"
        fill="#F15A24"
      />
      <path
        d="M24 37c-6.1 0-11-4.9-11-11 0-4.2 2.3-7.8 5.8-9.7-2.2 2.7-2.8 6.5-1.1 9.8 2.2 4.3 7.5 6.1 11.9 4.1 2.2-1 3.9-2.7 4.9-4.7C33.1 32 29 37 24 37Z"
        fill="#F7941D"
      />
      <circle cx="25.5" cy="24.5" r="3" fill="#ED1C24" />
    </svg>
  );
}

function isValidBdPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s()-]/g, '');
  return /^(\+?880|0)1[3-9]\d{8}$/.test(cleaned);
}

export function CheckoutPage() {
  useSeoMeta({ title: 'Secure Checkout | NOVARA COMMERCE', noIndex: true });

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, initialized } = useAppSelector((s) => s.auth);
  const { items, subtotal, discount, couponCode, appliedRuleName } = useAppSelector((s) => s.cart);
  const { settings: storefrontSettings } = useAppSelector((s) => s.storefront);
  const selectedItems = useMemo(() => items.filter((i) => i.selected !== false), [items]);

  // Checkout Hero State
  const [heroSlides, setHeroSlides] = useState<HeroSlideRecord[]>(FALLBACK_CHECKOUT_HERO_SLIDES);
  const [heroSettings, setHeroSettings] = useState<CartHeroSliderSettings>(DEFAULT_CHECKOUT_HERO_SETTINGS);
  const [heroLoading, setHeroLoading] = useState(true);

  // Location Directory State (sourced from /api/storefront/locations/bd?full=true with static fallback)
  const [bdDivisions, setBdDivisions] = useState<BdDivision[]>(BD_DIVISIONS);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  // Store & Gateway Configuration
  const [storeConfig, setStoreConfig] = useState<Partial<HomepageConfigData> | null>(storefrontSettings || null);
  const [gatewayConfigured, setGatewayConfigured] = useState(false);
  const [gatewayCapabilities, setGatewayCapabilities] = useState<GatewayCapabilities | null>(null);
  const [quote, setQuote] = useState<QuotePayload | null>(null);

  // Saved Addresses & Form Fields
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const [recipientName, setRecipientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [area, setArea] = useState('');
  const [house, setHouse] = useState('');
  const [road, setRoad] = useState('');
  const [landmark, setLandmark] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Delivery & Payment State
  const [deliveryOptionCode, setDeliveryOptionCode] = useState<string>('standard');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('cod');
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  // Inline Coupon State
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const idempotencyKey = useMemo(
    () => `chk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  useEffect(() => {
    setCouponInput(couponCode || '');
  }, [couponCode]);

  useEffect(() => {
    if (storefrontSettings) {
      setStoreConfig(storefrontSettings);
    }
  }, [storefrontSettings]);

  // Fetch Checkout Hero Slider + Bangladesh 8-division/64-district directory + Health + Storefront config
  useEffect(() => {
    const controller = new AbortController();

    setHeroLoading(true);
    apiRequest<{
      ok: true;
      totalManagedSlides?: number;
      slides: HeroSlideRecord[];
      settings?: Partial<CartHeroSliderSettings> | null;
    }>('/api/storefront/checkout-hero', { signal: controller.signal })
      .then((res) => {
        setHeroSettings(normalizeCheckoutHeroSettings(res.settings));
        if (typeof res.totalManagedSlides === 'number' && res.totalManagedSlides > 0) {
          setHeroSlides(filterAndSortHeroSlides(res.slides || [], { placement: 'checkout', activeOnly: true }));
        } else if ((res.slides || []).length > 0) {
          setHeroSlides(filterAndSortHeroSlides(res.slides || [], { placement: 'checkout', activeOnly: true }));
        } else {
          setHeroSlides(FALLBACK_CHECKOUT_HERO_SLIDES);
        }
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setHeroSettings(normalizeCheckoutHeroSettings(storefrontSettings?.checkoutHeroSettings));
        setHeroSlides(FALLBACK_CHECKOUT_HERO_SLIDES);
      })
      .finally(() => setHeroLoading(false));

    setLocationsLoading(true);
    setLocationsError(null);
    apiRequest<{ ok: true; divisions: BdDivision[] }>('/api/storefront/locations/bd?full=true', {
      signal: controller.signal,
    })
      .then((res) => {
        if (Array.isArray(res.divisions) && res.divisions.length >= 8) {
          setBdDivisions(res.divisions);
        }
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setLocationsError('Using offline Bangladesh division directory; live sync unavailable.');
      })
      .finally(() => setLocationsLoading(false));

    fetch('/api/payments/capabilities', { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json')) return;
        const d = (await r.json()) as { ok?: boolean; capabilities?: GatewayCapabilities };
        if (d.capabilities) {
          setGatewayCapabilities(d.capabilities);
          setGatewayConfigured(Boolean(d.capabilities.anyOnline));
        }
      })
      .catch(() => undefined);

    fetch('/api/health', { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json')) return;
        const d = (await r.json()) as { integrations?: { paymentGateway?: boolean } };
        if (typeof d.integrations?.paymentGateway === 'boolean') {
          setGatewayConfigured((prev) => prev || Boolean(d.integrations?.paymentGateway));
        }
      })
      .catch(() => undefined);

    apiRequest<{ ok: true; settings: Partial<HomepageConfigData> | null }>('/api/storefront/navigation', {
      signal: controller.signal,
    })
      .then((res) => {
        if (res.settings) setStoreConfig(res.settings);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [storefrontSettings?.checkoutHeroSettings]);

  // Pre-fill authenticated customer profile & saved addresses
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setRecipientName((prev) => prev || user.name || '');
    setEmail((prev) => prev || user.email || '');
    setPhone((prev) => prev || user.phone || '');

    apiRequest<{ ok: true; addresses: SavedAddress[] }>('/api/account/addresses', { signal: controller.signal })
      .then((res) => {
        setAddresses(res.addresses || []);
        if (res.addresses && res.addresses.length > 0) {
          const def = res.addresses.find((a) => a.isDefault) || res.addresses[0];
          setSelectedAddressId(def.id);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [user]);

  // Cascading options from bdDivisions state
  const availableDistricts = useMemo(() => {
    if (!division) return [];
    return bdDivisions.find((d) => d.name === division)?.districts || [];
  }, [bdDivisions, division]);

  const availableUpazilas = useMemo(() => {
    if (!division || !district) return [];
    return availableDistricts.find((dist) => dist.name === district)?.upazilas || [];
  }, [division, district, availableDistricts]);

  const availableAreas = useMemo(() => {
    if (!division || !district || !upazila) return [];
    return availableUpazilas.find((u) => u.name === upazila)?.areas || [];
  }, [division, district, upazila, availableUpazilas]);

  const activeAddress = useMemo(() => {
    if (selectedAddressId !== 'new') {
      const found = addresses.find((a) => a.id === selectedAddressId);
      if (found) {
        return {
          ...found,
          email: email || user?.email || '',
        };
      }
    }
    return {
      recipientName,
      email,
      phone,
      division,
      district,
      upazila,
      area,
      house,
      road,
      landmark,
      postalCode,
      deliveryInstructions,
    };
  }, [
    selectedAddressId,
    addresses,
    recipientName,
    email,
    user?.email,
    phone,
    division,
    district,
    upazila,
    area,
    house,
    road,
    landmark,
    postalCode,
    deliveryInstructions,
  ]);

  const localDeliveryOptions = useMemo(
    () =>
      buildAvailableDeliveryOptions({
        division: activeAddress.division || '',
        district: activeAddress.district || '',
        upazila: activeAddress.upazila || '',
        subtotal,
        deliveryOptions: storeConfig?.deliveryOptions,
        config: storeConfig?.shippingSettings,
        deliveryZones: storeConfig?.deliveryZones,
      }),
    [
      activeAddress.division,
      activeAddress.district,
      activeAddress.upazila,
      subtotal,
      storeConfig?.deliveryOptions,
      storeConfig?.shippingSettings,
      storeConfig?.deliveryZones,
    ],
  );

  // Sync authoritative backend quote when authenticated & cart/location/deliveryOption changes
  useEffect(() => {
    if (!user || selectedItems.length === 0) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const deliveryMethod = deliveryOptionCode === 'express' ? 'express' : 'standard';

    apiRequest<{ ok: true; quote: QuotePayload }>('/api/orders/checkout/quote', {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({
        deliveryMethod,
        deliveryOptionCode,
        couponCode,
        division: activeAddress.division || '',
        district: activeAddress.district || '',
        upazila: activeAddress.upazila || '',
        items: selectedItems.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || null,
          quantity: i.quantity,
        })),
      }),
    })
      .then((res) => {
        setQuote(res.quote);
        if (typeof res.quote.gatewayConfigured === 'boolean') {
          setGatewayConfigured(res.quote.gatewayConfigured);
        }
        if (res.quote.gatewayCapabilities) {
          setGatewayCapabilities(res.quote.gatewayCapabilities);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [
    user,
    selectedItems,
    deliveryOptionCode,
    couponCode,
    activeAddress.division,
    activeAddress.district,
    activeAddress.upazila,
  ]);

  const deliveryOptionsToRender: QuoteDeliveryOption[] =
    quote?.availableDeliveryOptions?.length ? quote.availableDeliveryOptions : localDeliveryOptions;

  const selectedDeliveryOption = useMemo(
    () =>
      deliveryOptionsToRender.find((o) => o.code === deliveryOptionCode) ||
      deliveryOptionsToRender[0] || {
        code: 'standard',
        name: 'Standard Delivery',
        description: 'Reliable nationwide doorstep courier delivery across Bangladesh',
        methodType: 'standard' as const,
        estimatedTime: 'Within 2–5 Business Days',
        charge: storeConfig?.shippingSettings?.dhakaMetroCharge ?? 60,
        freeShippingApplied: false,
        zone: 'dhaka_metro' as const,
      },
    [deliveryOptionsToRender, deliveryOptionCode, storeConfig?.shippingSettings?.dhakaMetroCharge],
  );

  const localShippingInfo = calculateShippingCharge({
    division: activeAddress.division || '',
    district: activeAddress.district || '',
    upazila: activeAddress.upazila || '',
    subtotal,
    deliveryMethod: selectedDeliveryOption.methodType,
    deliveryOptionCode: selectedDeliveryOption.code,
    deliveryOptions: storeConfig?.deliveryOptions,
    config: storeConfig?.shippingSettings,
    deliveryZones: storeConfig?.deliveryZones,
  });

  const taxSettings = storeConfig?.taxSettings;
  const currencyCfg = storeConfig?.currencySettings;
  const paymentCfg = quote?.paymentMethods || storeConfig?.paymentMethods;
  const freeThreshold = storeConfig?.shippingSettings?.freeShippingThreshold ?? 999;
  const taxRate = taxSettings?.enabled && taxSettings?.ratePercent ? Number(taxSettings.ratePercent) / 100 : 0;
  const taxInclusive = Boolean(taxSettings?.inclusive);

  const localTotals = calculateOrderTotals({
    items: selectedItems.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
    couponDiscount: discount,
    shippingCharge: localShippingInfo.charge,
    taxRate,
    taxInclusive,
  });

  const displaySubtotal = quote ? quote.subtotal : localTotals.subtotal;
  const displayDiscount = quote ? quote.discount : localTotals.discount;
  const displayShipping = quote ? quote.shippingCharge : localTotals.shippingCharge;
  const displayTax = quote ? quote.tax : localTotals.tax;
  const displayTotal = quote ? quote.total : localTotals.total;

  const codMaxAmount = Number(paymentCfg?.codMaxAmount || 0);
  const codExceedsLimit = paymentMethod === 'cod' && codMaxAmount > 0 && displayTotal > codMaxAmount;

  const primaryPaymentCards = useMemo(() => {
    const cards: Array<{ id: CheckoutPaymentMethod; title: string; subtitle: string }> = [];
    if (!paymentCfg || paymentCfg.codEnabled !== false) {
      cards.push({
        id: 'cod',
        title: 'Cash on Delivery',
        subtitle: 'Pay when you receive',
      });
    }
    if (!paymentCfg || paymentCfg.bkashEnabled !== false) {
      cards.push({
        id: 'bkash',
        title: 'bKash',
        subtitle: 'Fast & Secure Payment',
      });
    }
    if (!paymentCfg || paymentCfg.nagadEnabled !== false) {
      cards.push({
        id: 'nagad',
        title: 'নগদ',
        subtitle: 'Secure Digital Payment',
      });
    }
    return cards;
  }, [paymentCfg]);

  const secondaryPaymentOptions = useMemo(() => {
    const list: Array<{ id: CheckoutPaymentMethod; title: string; subtitle: string }> = [];
    if (!paymentCfg || paymentCfg.cardEnabled !== false) {
      list.push({ id: 'card', title: 'Debit / Credit Card', subtitle: 'VISA · Mastercard' });
    }
    if (!paymentCfg || paymentCfg.sslcommerzEnabled !== false) {
      list.push({ id: 'sslcommerz', title: 'SSLCommerz', subtitle: 'Cards / Mobile Banking' });
    }
    return list;
  }, [paymentCfg]);

  useEffect(() => {
    const requested = searchParams.get('payment') as CheckoutPaymentMethod | null;
    const allIds = [...primaryPaymentCards, ...secondaryPaymentOptions].map((c) => c.id);
    if (requested && allIds.includes(requested)) {
      setPaymentMethod(requested);
      return;
    }
    if (allIds.length > 0 && !allIds.includes(paymentMethod)) {
      setPaymentMethod(allIds[0]);
    }
  }, [primaryPaymentCards, secondaryPaymentOptions, paymentMethod, searchParams]);

  const handleDivisionChange = (nextDiv: string) => {
    setDivision(nextDiv);
    setDistrict('');
    setUpazila('');
    setArea('');
    setFieldErrors((prev) => ({ ...prev, division: '', district: '', upazila: '', area: '' }));
  };

  const handleDistrictChange = (nextDist: string) => {
    setDistrict(nextDist);
    setUpazila('');
    setArea('');
    setFieldErrors((prev) => ({ ...prev, district: '', upazila: '', area: '' }));
  };

  const handleUpazilaChange = (nextUpa: string) => {
    setUpazila(nextUpa);
    setArea('');
    setFieldErrors((prev) => ({ ...prev, upazila: '', area: '' }));
  };

  const handleAreaChange = (nextArea: string) => {
    setArea(nextArea);
    const match = availableAreas.find((a) => a.name === nextArea);
    if (match?.postalCode) {
      setPostalCode(match.postalCode);
    }
    setFieldErrors((prev) => ({ ...prev, area: '' }));
  };

  const handleApplyCoupon = async () => {
    const trimmed = couponInput.trim().toUpperCase();
    if (!trimmed) {
      setCouponFeedback({ tone: 'err', text: 'Please enter a coupon code first.' });
      return;
    }
    if (!user) {
      setCouponFeedback({ tone: 'err', text: 'Please sign in to verify and apply coupon codes.' });
      dispatch(
        openAuthModal({
          tab: 'login',
          returnUrl: '/checkout',
          notice: 'Sign in to validate and apply your coupon code.',
        }),
      );
      return;
    }
    setCouponBusy(true);
    setCouponFeedback(null);
    const res = await dispatch(applyCouponAsync(trimmed));
    setCouponBusy(false);
    if (applyCouponAsync.fulfilled.match(res)) {
      setCouponFeedback({ tone: 'ok', text: `Coupon ${trimmed} applied!` });
      dispatch(showToast({ variant: 'success', message: `Coupon ${trimmed} applied!` }));
    } else {
      const msg = String(res.payload || 'Coupon code is invalid or ineligible.');
      setCouponFeedback({ tone: 'err', text: msg });
      dispatch(showToast({ variant: 'error', message: msg }));
    }
  };

  const handleRemoveCoupon = async () => {
    if (!user) return;
    setCouponBusy(true);
    await dispatch(applyCouponAsync(''));
    setCouponBusy(false);
    setCouponInput('');
    setCouponFeedback(null);
    dispatch(showToast({ variant: 'info', message: 'Coupon removed.' }));
  };

  const validateBeforeSubmit = (): boolean => {
    const errors: Record<string, string> = {};
    if (selectedAddressId === 'new') {
      if (!division.trim()) errors.division = 'Please select a division.';
      if (!district.trim()) errors.district = 'Please select a district.';
      if (!upazila.trim()) errors.upazila = 'Please select a thana / upazila.';
      if (!area.trim()) errors.area = 'Please select a union / area.';
      if (division && district && upazila && area) {
        const hierarchy = validateBangladeshAddressHierarchy({ division, district, upazila, area });
        if (!hierarchy.valid) {
          errors.area = hierarchy.reason || 'Invalid Bangladesh location combination.';
        }
      }
      if (!recipientName.trim() || recipientName.trim().length < 2) {
        errors.recipientName = 'Enter your full name.';
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Enter a valid email address.';
      }
      if (!isValidBdPhone(phone)) {
        errors.phone = 'Enter a valid Bangladesh mobile number (e.g. 017XXXXXXXX).';
      }
      if (!house.trim() || house.trim().length < 3) {
        errors.house = 'Enter your house, road, or street address.';
      }
    } else if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || submitting) return;

    if (!user) {
      dispatch(
        openAuthModal({
          tab: 'login',
          returnUrl: '/checkout',
          notice: 'Please sign in or register to place your order.',
        }),
      );
      return;
    }

    if (!validateBeforeSubmit()) {
      dispatch(showToast({ variant: 'error', message: 'Please complete all required shipping fields.' }));
      return;
    }

    if (codExceedsLimit) {
      dispatch(
        showToast({
          variant: 'error',
          message: `Cash on Delivery is capped at ${formatStoreCurrency(codMaxAmount, currencyCfg)}.`,
        }),
      );
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      if (selectedAddressId === 'new' && saveNewAddress) {
        await apiRequest('/api/account/addresses', {
          method: 'POST',
          body: JSON.stringify({
            label: 'Home',
            recipientName: recipientName.trim(),
            phone: phone.trim(),
            division,
            district,
            upazila,
            area,
            house: house.trim(),
            road: road.trim() || undefined,
            landmark: landmark.trim() || undefined,
            postalCode: postalCode.trim() || undefined,
            deliveryInstructions: deliveryInstructions.trim() || undefined,
            isDefault: addresses.length === 0,
          }),
        }).catch(() => undefined);
      }

      const res = await apiRequest<{
        ok: true;
        order: { id: string; orderNumber: string };
        gatewayUrl?: string | null;
      }>('/api/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey,
          deliveryMethod: selectedDeliveryOption.methodType,
          deliveryOptionCode: selectedDeliveryOption.code,
          paymentMethod,
          couponCode,
          shippingAddress: {
            recipientName: activeAddress.recipientName.trim(),
            email: (activeAddress.email || user.email || '').trim() || undefined,
            phone: activeAddress.phone.trim(),
            division: activeAddress.division,
            district: activeAddress.district,
            upazila: activeAddress.upazila,
            area: activeAddress.area,
            house: activeAddress.house.trim(),
            road: activeAddress.road?.trim() || undefined,
            landmark: activeAddress.landmark?.trim() || undefined,
            postalCode: activeAddress.postalCode?.trim() || undefined,
            deliveryInstructions: activeAddress.deliveryInstructions?.trim() || undefined,
          },
          items: selectedItems.map((i) => ({
            productId: i.productId,
            variantId: i.variantId || null,
            quantity: i.quantity,
          })),
        }),
      });

      if (res.gatewayUrl) {
        // Keep cart intact until gateway verifies payment completion
        window.location.href = res.gatewayUrl;
        return;
      }

      dispatch(clearCartAfterOrder());
      dispatch(showToast({ variant: 'success', message: `Order ${res.order.orderNumber} placed successfully!` }));
      navigate(`/order-success/${res.order.id}`, { state: { fromCheckout: true } });
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Checkout failed. Please review your details.',
        }),
      );
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const selectedMethodConfigured =
    paymentMethod === 'cod' ||
    (gatewayCapabilities
      ? Boolean(gatewayCapabilities[paymentMethod]?.configured)
      : gatewayConfigured);
  const onlineMethodSelectedWithoutGateway = paymentMethod !== 'cod' && !selectedMethodConfigured;
  const returnedPaymentState = searchParams.get('payment');
  const returnedOrderNumber = searchParams.get('order');
  const returnedOrderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-[#F4F7FF]">
      {/* Dynamic Checkout Hero Slider */}
      <CartHeroSlider
        variant="checkout"
        slides={heroSlides}
        settings={heroSettings}
        loading={heroLoading}
      />

      <div className="mx-auto max-w-[1380px] px-4 py-7 sm:py-8">
        {selectedItems.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-[#E1E9F8] bg-white px-6 py-14 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E9F0FD] text-[#1155EE]">
              <ShoppingCart className="h-7 w-7" />
            </div>
            <h2 className="font-display mt-4 text-2xl font-bold text-[#0F1D3A]">
              {items.length > 0 ? 'No Cart Items Selected' : 'Your Checkout Cart is Empty'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {items.length > 0
                ? 'Select at least one item in your shopping cart before completing checkout.'
                : 'Add products to your cart first to continue to secure checkout.'}
            </p>
            <Link
              to={items.length > 0 ? '/cart' : '/shop'}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1155EE] px-7 py-3 text-sm font-semibold text-white hover:bg-[#0B44CC]"
            >
              <span>{items.length > 0 ? 'Return to Cart' : 'Explore Catalog'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} noValidate className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* LEFT COLUMN: 3-Step Checkout Card */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 sm:p-7 shadow-[0_8px_28px_-12px_rgba(15,29,58,0.08)]">
                  {/* Guest Sign-In Notice (Non-blocking so guest can preview/fill address) */}
                  {initialized && !user && (
                    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#C7DAFD] bg-[#EEF4FF] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#0F1D3A]">
                        <Lock className="h-4 w-4 shrink-0 text-[#1155EE]" />
                        <span>
                          <strong>Sign in required to submit:</strong> Sign in or register to confirm your order.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          dispatch(
                            openAuthModal({
                              tab: 'login',
                              returnUrl: '/checkout',
                              notice: 'Sign in to confirm and track your NOVARA order.',
                            }),
                          )
                        }
                        className="shrink-0 self-start rounded-lg bg-[#1155EE] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B44CC] sm:self-auto"
                      >
                        Sign In / Register
                      </button>
                    </div>
                  )}

                  {(returnedPaymentState === 'cancelled' || returnedPaymentState === 'failed') && (
                    <div className="mb-5 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          {returnedPaymentState === 'cancelled'
                            ? `Your previous payment attempt${returnedOrderNumber ? ` (#${returnedOrderNumber})` : ''} was cancelled. Your cart items are still saved—please choose a payment method to try again.`
                            : `Your previous payment attempt${returnedOrderNumber ? ` (#${returnedOrderNumber})` : ''} could not be verified. No funds were captured.`}
                        </span>
                      </div>
                      {returnedOrderId && (
                        <Link
                          to={`/order-success/${returnedOrderId}`}
                          className="shrink-0 font-bold text-[#1155EE] hover:underline"
                        >
                          Retry Existing Order →
                        </Link>
                      )}
                    </div>
                  )}

                  {locationsError && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{locationsError}</span>
                    </div>
                  )}

                  {/* STEP 1: Shipping Address */}
                  <section aria-labelledby="checkout-step-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1155EE] text-sm font-bold text-white shadow-xs">
                          1
                        </span>
                        <div>
                          <h2 id="checkout-step-1" className="font-display text-lg font-bold text-[#0F1D3A]">
                            Shipping Address
                          </h2>
                          <p className="text-xs text-[#64748B]">Please fill in your delivery details</p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
                        <Lock className="h-3.5 w-3.5 text-[#1155EE]" />
                        <span>Secure &amp; Encrypted</span>
                      </div>
                    </div>

                    {/* Saved Addresses Switcher (if logged in & has saved addresses) */}
                    {user && addresses.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {addresses.map((addr) => {
                          const active = selectedAddressId === addr.id;
                          return (
                            <label
                              key={addr.id}
                              className={`cursor-pointer rounded-xl border p-3 transition ${
                                active
                                  ? 'border-[#1155EE] bg-[#EEF4FF]/70 ring-1 ring-[#1155EE]/25'
                                  : 'border-[#E2E8F0] hover:border-[#BFD3FA]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-[#1155EE]">
                                  {addr.label} {addr.isDefault ? '· Default' : ''}
                                </span>
                                <input
                                  type="radio"
                                  name="savedAddress"
                                  checked={active}
                                  onChange={() => {
                                    setSelectedAddressId(addr.id);
                                    setFieldErrors({});
                                  }}
                                  className="accent-[#1155EE]"
                                />
                              </div>
                              <p className="mt-1 text-xs font-bold text-[#0F1D3A]">{addr.recipientName}</p>
                              <p className="text-[11px] text-slate-600">{addr.phone}</p>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                {addr.house}, {addr.area}, {addr.upazila}, {addr.district}
                              </p>
                            </label>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => setSelectedAddressId('new')}
                          className={`flex items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-xs font-semibold transition ${
                            selectedAddressId === 'new'
                              ? 'border-[#1155EE] bg-[#EEF4FF]/60 text-[#1155EE]'
                              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>+ Use a New Delivery Address</span>
                        </button>
                      </div>
                    )}

                    {/* Cascading BD Address + Contact Form */}
                    {selectedAddressId === 'new' ? (
                      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Division */}
                        <div>
                          <label htmlFor="chk-division" className="mb-1.5 block text-xs font-bold text-[#0F1D3A]">
                            Division *
                          </label>
                          <div className="relative">
                            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                            <select
                              id="chk-division"
                              required
                              disabled={locationsLoading && bdDivisions.length === 0}
                              value={division}
                              onChange={(e) => handleDivisionChange(e.target.value)}
                              className={`h-11 w-full appearance-none rounded-xl border bg-white pl-9 pr-8 text-sm text-[#0F1D3A] focus:outline-none focus:ring-2 focus:ring-[#1155EE]/20 ${
                                fieldErrors.division ? 'border-rose-400' : 'border-[#DCE6F7] focus:border-[#1155EE]'
                              }`}
                            >
                              <option value="">Select Division</option>
                              {bdDivisions.map((d) => (
                                <option key={d.name} value={d.name}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {fieldErrors.division && (
                            <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.division}</p>
                          )}
                        </div>

                        {/* District */}
                        <div>
                          <label htmlFor="chk-district" className="mb-1.5 block text-xs font-bold text-[#0F1D3A]">
                            District *
                          </label>
                          <div className="relative">
                            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                            <select
                              id="chk-district"
                              required
                              disabled={!division}
                              value={district}
                              onChange={(e) => handleDistrictChange(e.target.value)}
                              className={`h-11 w-full appearance-none rounded-xl border bg-white pl-9 pr-8 text-sm text-[#0F1D3A] disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1155EE]/20 ${
                                fieldErrors.district ? 'border-rose-400' : 'border-[#DCE6F7] focus:border-[#1155EE]'
                              }`}
                            >
                              <option value="">{division ? 'Select District' : 'Select District'}</option>
                              {availableDistricts.map((d) => (
                                <option key={d.name} value={d.name}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {fieldErrors.district && (
                            <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.district}</p>
                          )}
                        </div>

                        {/* Thana / Upazila */}
                        <div>
                          <label htmlFor="chk-thana" className="mb-1.5 block text-xs font-bold text-[#0F1D3A]">
                            Thana *
                          </label>
                          <div className="relative">
                            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                            <select
                              id="chk-thana"
                              required
                              disabled={!district}
                              value={upazila}
                              onChange={(e) => handleUpazilaChange(e.target.value)}
                              className={`h-11 w-full appearance-none rounded-xl border bg-white pl-9 pr-8 text-sm text-[#0F1D3A] disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1155EE]/20 ${
                                fieldErrors.upazila ? 'border-rose-400' : 'border-[#DCE6F7] focus:border-[#1155EE]'
                              }`}
                            >
                              <option value="">Select Thana</option>
                              {availableUpazilas.map((u) => (
                                <option key={u.name} value={u.name}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {fieldErrors.upazila && (
                            <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.upazila}</p>
                          )}
                        </div>

                        {/* Union / Area */}
                        <div>
                          <label htmlFor="chk-union" className="mb-1.5 block text-xs font-bold text-[#0F1D3A]">
                            Union *
                          </label>
                          <div className="relative">
                            <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                            <select
                              id="chk-union"
                              required
                              disabled={!upazila}
                              value={area}
                              onChange={(e) => handleAreaChange(e.target.value)}
                              className={`h-11 w-full appearance-none rounded-xl border bg-white pl-9 pr-8 text-sm text-[#0F1D3A] disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1155EE]/20 ${
                                fieldErrors.area ? 'border-rose-400' : 'border-[#DCE6F7] focus:border-[#1155EE]'
                              }`}
                            >
                              <option value="">Select Union</option>
                              {availableAreas.map((a) => (
                                <option key={a.name} value={a.name}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {fieldErrors.area && (
                            <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.area}</p>
                          )}
                        </div>

                        {/* Full Name */}
                        <div>
                          <label htmlFor="chk-name" className="mb-1.5 block text-xs font-bold text-[#0F1D3A]">
                            Full Name *
                          </label>
                          <div className="relative">
                            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                            <input
                              id="chk-name"
                              type="text"
                              required
                              value={recipientName}
                              onChange={(e) => {
                                setRecipientName(e.target.value);
                                if (fieldErrors.recipientName) setFieldErrors((p) => ({ ...p, recipientName: '' }));
                              }}
                              placeholder="Enter your full name"
                              className={`h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm text-[#0F1D3A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1155EE]/20 ${
                                fieldErrors.recipientName ? 'border-rose-400' : 'border-[#DCE6F7] focus:border-[#1155EE]'
                              }`}
                            />
                          </div>
                          {fieldErrors.recipientName && (
                            <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.recipientName}</p>
                          )}
                        </div>

                        {/* Email Address */}
                        <div>
                          <label htmlFor="chk-email" className="mb-1.5 block text-xs font-bold text-[#0F1D3A]">
                            Email Address *
                          </label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                            <input
                              id="chk-email"
                              type="email"
                              required
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                              }}
                              placeholder="Enter your email address"
                              className={`h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm text-[#0F1D3A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1155EE]/20 ${
                                fieldErrors.email ? 'border-rose-400' : 'border-[#DCE6F7] focus:border-[#1155EE]'
                              }`}
                            />
                          </div>
                          {fieldErrors.email && (
                            <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.email}</p>
                          )}
                        </div>

                        {/* Mobile Number */}
                        <div>
                          <label htmlFor="chk-phone" className="mb-1.5 block text-xs font-bold text-[#0F1D3A]">
                            Mobile Number *
                          </label>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                            <input
                              id="chk-phone"
                              type="tel"
                              required
                              value={phone}
                              onChange={(e) => {
                                setPhone(e.target.value);
                                if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' }));
                              }}
                              placeholder="01XXXXXXXXX"
                              className={`h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm text-[#0F1D3A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1155EE]/20 ${
                                fieldErrors.phone ? 'border-rose-400' : 'border-[#DCE6F7] focus:border-[#1155EE]'
                              }`}
                            />
                          </div>
                          {fieldErrors.phone && (
                            <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.phone}</p>
                          )}
                        </div>

                        {/* Address Details */}
                        <div>
                          <label htmlFor="chk-house" className="mb-1.5 block text-xs font-bold text-[#0F1D3A]">
                            Address Details *
                          </label>
                          <div className="relative">
                            <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                            <input
                              id="chk-house"
                              type="text"
                              required
                              value={house}
                              onChange={(e) => {
                                setHouse(e.target.value);
                                if (fieldErrors.house) setFieldErrors((p) => ({ ...p, house: '' }));
                              }}
                              placeholder="House, Road, Area, Post Office"
                              className={`h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm text-[#0F1D3A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1155EE]/20 ${
                                fieldErrors.house ? 'border-rose-400' : 'border-[#DCE6F7] focus:border-[#1155EE]'
                              }`}
                            />
                          </div>
                          {fieldErrors.house && (
                            <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.house}</p>
                          )}
                        </div>

                        {/* Expandable Optional Details */}
                        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowOptionalFields((prev) => !prev)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1155EE] hover:underline"
                          >
                            {showOptionalFields ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            <span>
                              {showOptionalFields
                                ? 'Hide extra delivery fields'
                                : 'Add Road, Landmark, Postal Code or Delivery Note (Optional)'}
                            </span>
                          </button>

                          {user && (
                            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={saveNewAddress}
                                onChange={(e) => setSaveNewAddress(e.target.checked)}
                                className="rounded accent-[#1155EE]"
                              />
                              <span>Save address to account</span>
                            </label>
                          )}
                        </div>

                        {showOptionalFields && (
                          <div className="sm:col-span-2 grid grid-cols-1 gap-3 rounded-xl border border-[#E5ECF9] bg-[#F8FAFF] p-3.5 sm:grid-cols-2">
                            <div>
                              <label htmlFor="chk-road" className="mb-1 block text-xs font-semibold text-slate-700">
                                Road / Block
                              </label>
                              <input
                                id="chk-road"
                                type="text"
                                value={road}
                                onChange={(e) => setRoad(e.target.value)}
                                placeholder="Road 7, Block C"
                                className="h-10 w-full rounded-xl border border-[#DCE6F7] bg-white px-3 text-xs"
                              />
                            </div>
                            <div>
                              <label htmlFor="chk-landmark" className="mb-1 block text-xs font-semibold text-slate-700">
                                Nearby Landmark
                              </label>
                              <input
                                id="chk-landmark"
                                type="text"
                                value={landmark}
                                onChange={(e) => setLandmark(e.target.value)}
                                placeholder="Near Central Mosque"
                                className="h-10 w-full rounded-xl border border-[#DCE6F7] bg-white px-3 text-xs"
                              />
                            </div>
                            <div>
                              <label htmlFor="chk-postal" className="mb-1 block text-xs font-semibold text-slate-700">
                                Postal Code
                              </label>
                              <input
                                id="chk-postal"
                                type="text"
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                placeholder="1205"
                                className="h-10 w-full rounded-xl border border-[#DCE6F7] bg-white px-3 text-xs font-mono-tabular"
                              />
                            </div>
                            <div>
                              <label htmlFor="chk-instructions" className="mb-1 block text-xs font-semibold text-slate-700">
                                Delivery Instructions
                              </label>
                              <input
                                id="chk-instructions"
                                type="text"
                                value={deliveryInstructions}
                                onChange={(e) => setDeliveryInstructions(e.target.value)}
                                placeholder="Call upon arrival"
                                className="h-10 w-full rounded-xl border border-[#DCE6F7] bg-white px-3 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-[#DCE6F7] bg-[#F8FAFF] p-3.5 text-xs text-[#0F1D3A]">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                              Selected Delivery Location
                            </p>
                            <p className="mt-1 font-semibold">
                              {activeAddress.house}
                              {activeAddress.road ? `, ${activeAddress.road}` : ''}, {activeAddress.area},{' '}
                              {activeAddress.upazila}, {activeAddress.district}, {activeAddress.division}
                            </p>
                            <p className="mt-0.5 text-slate-600">
                              {activeAddress.recipientName} · {activeAddress.phone}
                            </p>
                          </div>
                          <div>
                            <label htmlFor="chk-saved-email" className="mb-1 block text-[11px] font-bold text-[#0F1D3A]">
                              Order Confirmation Email *
                            </label>
                            <input
                              id="chk-saved-email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Enter email for order confirmation"
                              className="h-9 w-full rounded-lg border border-[#DCE6F7] bg-white px-3 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* STEP 2: Delivery Options */}
                  <section aria-labelledby="checkout-step-2" className="mt-7 border-t border-[#EBF0FA] pt-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1155EE] text-sm font-bold text-white shadow-xs">
                        2
                      </span>
                      <h2 id="checkout-step-2" className="font-display text-lg font-bold text-[#0F1D3A]">
                        Delivery Options
                      </h2>
                    </div>

                    <div className="mt-4 space-y-3">
                      {deliveryOptionsToRender.map((opt) => {
                        const active = selectedDeliveryOption.code === opt.code;
                        return (
                          <label
                            key={opt.code}
                            className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition ${
                              active
                                ? 'border-[#6BA2FF] bg-[#EDF4FF]/80 ring-1 ring-[#1155EE]/20'
                                : 'border-[#DCE6F7] bg-white hover:border-[#BFD3FA]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="deliveryOptionCode"
                              value={opt.code}
                              checked={active}
                              onChange={() => setDeliveryOptionCode(opt.code)}
                              className="sr-only"
                            />
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                  active ? 'bg-[#1155EE]/10 text-[#1155EE]' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <Truck className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#0F1D3A]">{opt.name}</p>
                                <p className="text-xs text-[#64748B]">{opt.estimatedTime}</p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-4 py-1 text-xs font-bold font-mono-tabular ${
                                opt.charge === 0
                                  ? 'bg-emerald-600 text-white'
                                  : active
                                    ? 'bg-[#1155EE] text-white'
                                    : 'bg-[#EEF4FF] text-[#1155EE]'
                              }`}
                            >
                              {opt.charge === 0 ? 'FREE' : formatStoreCurrency(opt.charge, currencyCfg)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>

                  {/* STEP 3: Payment Method */}
                  <section aria-labelledby="checkout-step-3" className="mt-7 border-t border-[#EBF0FA] pt-6">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1155EE] text-sm font-bold text-white shadow-xs">
                        3
                      </span>
                      <div>
                        <h2 id="checkout-step-3" className="font-display text-lg font-bold text-[#0F1D3A]">
                          Payment Method
                        </h2>
                        <p className="text-xs text-[#64748B]">Choose your preferred payment method</p>
                      </div>
                    </div>

                    {primaryPaymentCards.length === 0 && secondaryPaymentOptions.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                        No payment methods are currently enabled in store settings.
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                          {primaryPaymentCards.map((card) => {
                            const active = paymentMethod === card.id;
                            return (
                              <label
                                key={card.id}
                                className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border px-3 py-5 text-center transition ${
                                  active
                                    ? 'border-[#1155EE] bg-[#F3F8FF] ring-2 ring-[#1155EE]/15'
                                    : 'border-[#DCE6F7] bg-white hover:border-[#BFD3FA]'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="paymentMethod"
                                  value={card.id}
                                  checked={active}
                                  onChange={() => setPaymentMethod(card.id)}
                                  className="sr-only"
                                />
                                {active && (
                                  <span
                                    aria-hidden="true"
                                    className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1155EE] text-white"
                                  >
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  </span>
                                )}
                                <div className="mb-2 flex h-11 items-center justify-center">
                                  {card.id === 'cod' ? (
                                    <CodCashIcon className="h-10 w-10" />
                                  ) : card.id === 'bkash' ? (
                                    <BkashBirdSvg className="h-10 w-10" />
                                  ) : (
                                    <NagadEmblemSvg className="h-10 w-10" />
                                  )}
                                </div>
                                <p className="text-sm font-bold text-[#0F1D3A]">{card.title}</p>
                                <p className="mt-0.5 text-[11px] text-[#64748B]">{card.subtitle}</p>
                              </label>
                            );
                          })}
                        </div>

                        {secondaryPaymentOptions.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {secondaryPaymentOptions.map((opt) => {
                              const active = paymentMethod === opt.id;
                              return (
                                <label
                                  key={opt.id}
                                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                                    active
                                      ? 'border-[#1155EE] bg-[#EEF4FF] text-[#1155EE]'
                                      : 'border-[#DCE6F7] bg-white text-[#0F1D3A] hover:border-[#BFD3FA]'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="paymentMethod"
                                    value={opt.id}
                                    checked={active}
                                    onChange={() => setPaymentMethod(opt.id)}
                                    className="accent-[#1155EE]"
                                  />
                                  <span>{opt.title}</span>
                                  <span className="text-[11px] font-normal text-slate-500">({opt.subtitle})</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {onlineMethodSelectedWithoutGateway ? (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          Merchant gateway credentials for <strong>{paymentMethod.toUpperCase()}</strong> are not yet configured on this server. Please select{' '}
                          <strong>Cash on Delivery</strong> or configure the gateway credentials in your environment configuration.
                        </span>
                      </div>
                    ) : paymentMethod !== 'cod' ? (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#C7DAFD] bg-[#F2F7FF] px-3.5 py-2.5 text-xs text-[#0F1D3A]">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#1155EE]" />
                        <span>
                          <strong>Official Hosted Gateway Redirect:</strong> Clicking Place Order redirects you to{' '}
                          {paymentMethod === 'bkash'
                            ? 'bKash official checkout'
                            : paymentMethod === 'nagad'
                              ? 'Nagad official checkout'
                              : 'SSLCommerz 3D-Secure hosted checkout'}
                          . NOVARA never collects or stores card numbers, CVV, PIN, or OTPs.
                        </span>
                      </div>
                    ) : null}

                    {codExceedsLimit && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          Cash on Delivery is limited to orders up to {formatStoreCurrency(codMaxAmount, currencyCfg)}. Please choose a digital payment method.
                        </span>
                      </div>
                    )}

                    {/* Primary CTA */}
                    <button
                      type="submit"
                      disabled={submitting || codExceedsLimit}
                      className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1155EE] py-3.5 px-6 text-base font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-[#0B44CC] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Lock className="h-4 w-4" />
                      <span>
                        {submitting
                          ? paymentMethod === 'cod'
                            ? 'Placing Your Order...'
                            : 'Connecting to Payment Gateway...'
                          : paymentMethod === 'cod'
                            ? 'Place Order Now'
                            : 'Proceed to Secure Payment'}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#475569]">
                      <ShieldCheck className="h-4 w-4 text-[#1155EE]" />
                      <span>Your information is safe and secure with us</span>
                    </p>
                  </section>
                </div>
              </div>

              {/* RIGHT COLUMN: Order Summary, Confidence Banner & Why Choose NOVARA */}
              <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-6 lg:self-start">
                {/* Order Summary Card */}
                <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 sm:p-6 shadow-[0_8px_28px_-12px_rgba(15,29,58,0.08)]">
                  <div className="flex items-center justify-between gap-3 border-b border-[#EEF2FA] pb-4">
                    <div className="flex items-center gap-2.5">
                      <ShoppingCart className="h-5 w-5 text-[#1155EE]" />
                      <h2 className="font-display text-lg font-bold text-[#0F1D3A]">Order Summary</h2>
                    </div>
                    <Link
                      to="/cart"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1155EE] hover:underline"
                    >
                      <span>Edit Cart</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {/* Line Items */}
                  <ul className="divide-y divide-[#EEF2FA]">
                    {selectedItems.map((item) => {
                      const lineTotal = item.unitPrice * item.quantity;
                      return (
                        <li
                          key={`${item.productId}-${item.variantId || 'default'}`}
                          className="flex items-center gap-3.5 py-4"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E5ECF9] bg-[#F8FAFF]">
                            <ResilientImage
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[#0F1D3A]">{item.name}</p>
                            {item.variantTitle && (
                              <p className="mt-0.5 truncate text-xs text-[#64748B]">{item.variantTitle}</p>
                            )}
                            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                              <span className="font-mono-tabular font-semibold text-[#0F1D3A]">
                                {formatStoreCurrency(item.unitPrice, currencyCfg)}
                              </span>
                              <span className="font-mono-tabular text-[#64748B]">× {item.quantity}</span>
                              <span className="font-mono-tabular text-sm font-bold text-[#0F1D3A]">
                                {formatStoreCurrency(lineTotal, currencyCfg)}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Breakdown Rows */}
                  <div className="space-y-2.5 border-t border-[#EEF2FA] pt-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Subtotal</span>
                      <span className="font-mono-tabular font-semibold text-[#0F1D3A]">
                        {formatStoreCurrency(displaySubtotal, currencyCfg)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Delivery Charge</span>
                      <span className="font-mono-tabular font-semibold text-[#0F1D3A]">
                        {displayShipping === 0 ? 'FREE' : formatStoreCurrency(displayShipping, currencyCfg)}
                      </span>
                    </div>

                    {displayDiscount > 0 && (
                      <div className="flex items-center justify-between text-emerald-700">
                        <span className="inline-flex items-center gap-1.5">
                          <span>Discount</span>
                          {couponCode ? (
                            <span className="font-semibold text-emerald-700">({couponCode})</span>
                          ) : appliedRuleName ? (
                            <span className="font-semibold text-emerald-700">({appliedRuleName})</span>
                          ) : null}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold">
                          <Tag className="h-3.5 w-3.5" />
                          -{formatStoreCurrency(displayDiscount, currencyCfg)}
                        </span>
                      </div>
                    )}

                    {displayTax > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#475569]">
                          {taxSettings?.label || 'VAT / Tax'} {taxInclusive ? '(Included)' : ''}
                        </span>
                        <span className="font-mono-tabular font-semibold text-[#0F1D3A]">
                          {formatStoreCurrency(displayTax, currencyCfg)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-[#EEF2FA] pt-3.5">
                      <span className="text-base font-bold text-[#0F1D3A]">Total Amount</span>
                      <span className="font-mono-tabular text-2xl font-extrabold text-[#1155EE]">
                        {formatStoreCurrency(displayTotal, currencyCfg)}
                      </span>
                    </div>
                  </div>

                  {/* Coupon Code Input Row */}
                  <div className="mt-4 pt-2">
                    <div className="flex items-center gap-2 rounded-xl border border-[#DCE6F7] bg-[#F8FAFF] p-1.5">
                      <Tag className="ml-2 h-4 w-4 shrink-0 text-[#1155EE]" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        aria-label="Enter coupon code"
                        placeholder="Enter coupon code"
                        className="h-9 min-w-0 flex-1 bg-transparent px-1 text-xs font-medium text-[#0F1D3A] placeholder:text-slate-400 focus:outline-none"
                      />
                      {couponCode && (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          disabled={couponBusy}
                          aria-label="Remove coupon"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponBusy}
                        className="rounded-lg bg-[#1155EE] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0B44CC] disabled:opacity-60"
                      >
                        {couponBusy ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponFeedback && (
                      <p
                        className={`mt-1.5 text-[11px] font-medium ${
                          couponFeedback.tone === 'ok' ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {couponFeedback.text}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shop with Confidence Banner Card */}
                <div className="rounded-2xl border border-[#C7DCFF] bg-gradient-to-r from-[#DCEBFF] via-[#EAF3FF] to-[#DFECFF] p-5 shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1155EE] text-white shadow-sm shadow-blue-600/25">
                      <ShieldCheck className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-[#0F1D3A]">
                        {heroSettings.confidenceBanner?.title || 'Shop with Confidence'}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#334155]">
                        {heroSettings.confidenceBanner?.subtitle ||
                          '7-Day Return Policy • Secure Payment • 100% Genuine Products'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Why Choose NOVARA? Card */}
                <div className="rounded-2xl border border-[#DCE6F7] bg-white p-5 sm:p-6 shadow-xs">
                  <h3 className="font-display text-base font-bold text-[#0F1D3A]">Why Choose NOVARA?</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      {
                        icon: Truck,
                        title: 'Free Shipping',
                        subtitle:
                          freeThreshold > 0
                            ? `Over ${formatStoreCurrency(freeThreshold, currencyCfg)}`
                            : 'Fast Nationwide',
                      },
                      {
                        icon: Headphones,
                        title: '24/7 Support',
                        subtitle: 'Always Here',
                      },
                      {
                        icon: ShieldCheck,
                        title: 'Secure Payment',
                        subtitle: 'SSL Encrypted',
                      },
                      {
                        icon: RotateCcw,
                        title: 'Easy Returns',
                        subtitle: 'Within 7 Days',
                      },
                    ].map((badge) => {
                      const Icon = badge.icon;
                      return (
                        <div
                          key={badge.title}
                          className="rounded-xl border border-[#E6EEFC] bg-[#F8FAFF] p-3.5 text-center"
                        >
                          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#1155EE]">
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <p className="mt-2 text-xs font-bold text-[#0F1D3A]">{badge.title}</p>
                          <p className="mt-0.5 text-[11px] text-[#64748B]">{badge.subtitle}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </div>

            {/* Bottom 4-Column Storefront Service Strip */}
            <div className="rounded-2xl border border-[#DCE6F7] bg-white px-6 py-5 shadow-xs">
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:divide-x lg:divide-[#E9EFFA]">
                {[
                  { icon: Gift, title: 'Best Deals', sub: 'Save More' },
                  { icon: Truck, title: 'Fast Delivery', sub: 'Across Bangladesh' },
                  { icon: Headphones, title: '24/7 Support', sub: 'Always Here' },
                  { icon: Star, title: 'Trusted Store', sub: '100% Genuine Products' },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className={`flex items-center justify-center gap-3.5 ${idx > 0 ? 'lg:pl-5' : ''}`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1155EE]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[#0F1D3A]">{item.title}</p>
                        <p className="text-xs text-[#64748B]">{item.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
