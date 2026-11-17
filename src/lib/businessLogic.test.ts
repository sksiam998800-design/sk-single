import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateBangladeshAddressHierarchy,
  calculateShippingCharge,
  getDistrictsForDivision,
  getUpazilasForDistrict,
} from './bdLocations';
import {
  resolveEffectiveUnitPrice,
  evaluateCouponDiscount,
  evaluateDiscountRules,
  mergeCartLines,
  calculateOrderTotals,
  summarizeCartMetrics,
} from './pricingEngine';
import {
  DEFAULT_CART_HERO_SETTINGS,
  DEFAULT_WISHLIST_HERO_SETTINGS,
  filterAndSortHeroSlides,
  normalizeCartHeroSettings,
  normalizeWishlistHeroSettings,
} from './cartHero';
import {
  canTransitionOrderStatus,
  canCustomerCancelOrder,
  canCustomerRequestCancellation,
  canCustomerRequestReturn,
  computeAvailableStock,
  getOrderCancellationEligibility,
  shouldRestoreStockOnCancel,
} from './orderStateMachine';
import {
  addWishlistId,
  extractProductSpecBadges,
  mergeWishlistIds,
  removeWishlistId,
  toggleWishlistId,
} from './wishlist';
import { expandCrossLingualTerms, buildHighlightSegments } from './crossLingualSearch';
import { hasPermission } from './rbac';
import { ApiError, parseApiResponsePayload } from '../services/api';
import { formatStoreCurrency, isWithinScheduleWindow, toLocalDateTimeInputValue } from './dateTime';

test('Bangladesh address hierarchy validates Division -> District -> Upazila -> Area', () => {
  assert.equal(
    validateBangladeshAddressHierarchy({
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhanmondi',
      area: 'Kalabagan',
    }).valid,
    true,
  );
  assert.equal(
    validateBangladeshAddressHierarchy({
      division: 'Dhaka',
      district: 'Sylhet',
      upazila: 'Sylhet Sadar',
      area: 'Zindabazar',
    }).valid,
    false,
  );
  assert.ok(getDistrictsForDivision('Chattogram').length >= 2);
  assert.ok(getUpazilasForDistrict('Dhaka', 'Dhaka').length >= 5);
});

test('Shipping calculator applies Dhaka Metro, Suburb, Nationwide, Express and ৳999 Free Shipping rules', () => {
  const metroUnder = calculateShippingCharge({
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Gulshan',
    subtotal: 500,
  });
  assert.equal(metroUnder.zone, 'dhaka_metro');
  assert.equal(metroUnder.charge, 60);
  assert.equal(metroUnder.freeShippingApplied, false);

  const metroFree = calculateShippingCharge({
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Gulshan',
    subtotal: 999,
  });
  assert.equal(metroFree.charge, 0);
  assert.equal(metroFree.freeShippingApplied, true);

  const nationwideExpress = calculateShippingCharge({
    division: 'Sylhet',
    district: 'Sylhet',
    upazila: 'Sylhet Sadar',
    subtotal: 2000,
    deliveryMethod: 'express',
  });
  assert.equal(nationwideExpress.zone, 'nationwide');
  assert.equal(nationwideExpress.charge, 80);
});

test('Flash-sale expiration falls back to salePrice or basePrice', () => {
  const now = new Date('2026-11-16T12:00:00Z');
  const active = resolveEffectiveUnitPrice(
    {
      basePrice: 10000,
      salePrice: 8500,
      flashSalePrice: 7000,
      flashSaleStartsAt: '2026-11-16T00:00:00Z',
      flashSaleEndsAt: '2026-11-17T00:00:00Z',
    },
    now,
  );
  assert.equal(active.currentPrice, 7000);
  assert.equal(active.isFlashSaleActive, true);
  assert.equal(active.discountPercent, 30);

  const expired = resolveEffectiveUnitPrice(
    {
      basePrice: 10000,
      salePrice: 8500,
      flashSalePrice: 7000,
      flashSaleStartsAt: '2026-11-14T00:00:00Z',
      flashSaleEndsAt: '2026-11-15T23:59:59Z',
    },
    now,
  );
  assert.equal(expired.currentPrice, 8500);
  assert.equal(expired.isFlashSaleActive, false);
});

test('Coupon evaluation enforces minOrder, maxDiscountAmount, expiry, and category eligibility', () => {
  const now = new Date('2026-11-16T12:00:00Z');
  const items = [
    { productId: 'p1', categoryId: 'cat-elec', quantity: 2, unitPrice: 1500 },
    { productId: 'p2', categoryId: 'cat-books', quantity: 1, unitPrice: 500 },
  ];

  const validPct = evaluateCouponDiscount(
    {
      code: 'NOVARA10',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscountAmount: 250,
      minOrderAmount: 1000,
      isActive: true,
      usedCount: 0,
      endsAt: '2026-12-31T00:00:00Z',
    },
    items,
    now,
  );
  assert.equal(validPct.valid, true);
  assert.equal(validPct.discountAmount, 250);

  const expired = evaluateCouponDiscount(
    {
      code: 'OLD',
      discountType: 'fixed',
      discountValue: 500,
      minOrderAmount: 0,
      isActive: true,
      usedCount: 0,
      endsAt: '2026-11-01T00:00:00Z',
    },
    items,
    now,
  );
  assert.equal(expired.valid, false);
});

test('Cart merge deduplicates matching product/variant lines and clamps to stock', () => {
  const merged = mergeCartLines(
    [
      { productId: 'p1', variantId: 'v1', quantity: 2, maxStock: 5 },
      { productId: 'p2', variantId: null, quantity: 1, maxStock: 3 },
    ],
    [
      { productId: 'p1', variantId: 'v1', quantity: 4, maxStock: 5 },
      { productId: 'p1', variantId: 'v2', quantity: 1, maxStock: 4 },
    ],
  );
  assert.equal(merged.length, 3);
  assert.equal(merged.find((x) => x.variantId === 'v1')?.quantity, 5);
  assert.equal(merged.find((x) => x.variantId === 'v2')?.quantity, 1);
});

test('Order totals prevent negative amounts', () => {
  const totals = calculateOrderTotals({
    items: [{ productId: 'p1', quantity: 1, unitPrice: 500 }],
    couponDiscount: 900,
    shippingCharge: 60,
  });
  assert.equal(totals.subtotal, 500);
  assert.equal(totals.discount, 500);
  assert.equal(totals.total, 60);
});

test('summarizeCartMetrics computes selected-item totals, shipping qualification, and coupon clamping accurately', () => {
  const summary = summarizeCartMetrics({
    items: [
      { productId: 'p1', quantity: 1, unitPrice: 119999, originalPrice: 149999, selected: true },
      { productId: 'p2', quantity: 2, unitPrice: 400, originalPrice: 500, selected: false },
    ],
    couponDiscount: 5000,
    freeShippingThreshold: 999,
    defaultShippingCharge: 60,
  });
  assert.equal(summary.totalLineCount, 2);
  assert.equal(summary.selectedLineCount, 1);
  assert.equal(summary.selectedUnitsCount, 1);
  assert.equal(summary.allSelected, false);
  assert.equal(summary.subtotal, 119999);
  assert.equal(summary.productSavings, 30000);
  assert.equal(summary.couponDiscount, 5000);
  assert.equal(summary.shippingFee, 0);
  assert.equal(summary.freeShippingQualified, true);
  assert.equal(summary.total, 114999);

  // Below threshold adds shipping fee and reports amount remaining
  const belowThreshold = summarizeCartMetrics({
    items: [{ productId: 'p2', quantity: 2, unitPrice: 400, selected: true }],
    couponDiscount: 0,
    freeShippingThreshold: 999,
    defaultShippingCharge: 60,
  });
  assert.equal(belowThreshold.subtotal, 800);
  assert.equal(belowThreshold.freeShippingQualified, false);
  assert.equal(belowThreshold.shippingFee, 60);
  assert.equal(belowThreshold.amountToFreeShipping, 199);
  assert.equal(belowThreshold.total, 860);

  // None selected yields 0 subtotal & 0 shipping
  const noneSelected = summarizeCartMetrics({
    items: [{ productId: 'p2', quantity: 1, unitPrice: 500, selected: false }],
    couponDiscount: 100,
    freeShippingThreshold: 999,
    defaultShippingCharge: 60,
  });
  assert.equal(noneSelected.subtotal, 0);
  assert.equal(noneSelected.couponDiscount, 0);
  assert.equal(noneSelected.shippingFee, 0);
  assert.equal(noneSelected.total, 0);
});

test('filterAndSortHeroSlides isolates home vs cart placements, enforces schedule/active flags, and normalizes settings', () => {
  const now = new Date('2026-11-17T12:00:00Z');
  const slides = [
    {
      id: 's1',
      placement: 'home' as const,
      badgeText: 'Home',
      heading: 'Home Banner',
      desktopImageUrl: '/home.jpg',
      ctaText: 'Shop',
      ctaUrl: '/shop',
      sortOrder: 0,
      isActive: true,
    },
    {
      id: 's2',
      placement: 'cart' as const,
      badgeText: 'Your Cart',
      heading: 'Second Cart Slide',
      desktopImageUrl: '/cart2.jpg',
      ctaText: 'Shop',
      ctaUrl: '/shop',
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 's3',
      placement: 'cart' as const,
      badgeText: 'Your Cart',
      heading: 'First Cart Slide',
      desktopImageUrl: '/cart1.jpg',
      ctaText: 'Continue Shopping',
      ctaUrl: '/shop',
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 's4',
      placement: 'cart' as const,
      badgeText: 'Disabled',
      heading: 'Inactive Cart Slide',
      desktopImageUrl: '/cart3.jpg',
      ctaText: 'Shop',
      ctaUrl: '/shop',
      sortOrder: 0,
      isActive: false,
    },
    {
      id: 's5',
      placement: 'cart' as const,
      badgeText: 'Expired',
      heading: 'Expired Cart Slide',
      desktopImageUrl: '/cart4.jpg',
      ctaText: 'Shop',
      ctaUrl: '/shop',
      sortOrder: 0,
      endsAt: '2026-11-10T00:00:00Z',
      isActive: true,
    },
  ];

  const cartSlides = filterAndSortHeroSlides(slides, { placement: 'cart', now, activeOnly: true });
  assert.equal(cartSlides.length, 2);
  assert.equal(cartSlides[0].id, 's3');
  assert.equal(cartSlides[1].id, 's2');

  const homeSlides = filterAndSortHeroSlides(slides, { placement: 'home', now, activeOnly: true });
  assert.equal(homeSlides.length, 1);
  assert.equal(homeSlides[0].id, 's1');

  const norm = normalizeCartHeroSettings({ autoplayIntervalMs: 500, transitionEffect: 'slide' });
  assert.equal(norm.autoplayIntervalMs, 1500);
  assert.equal(norm.transitionEffect, 'slide');
  assert.equal(norm.confidenceBanner?.title, DEFAULT_CART_HERO_SETTINGS.confidenceBanner?.title);
});

test('Order state machine blocks illegal transitions and unpaid online fulfillment', () => {
  assert.equal(
    canTransitionOrderStatus({
      currentStatus: 'pending',
      nextStatus: 'delivered',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
    }).allowed,
    false,
  );
  assert.equal(
    canTransitionOrderStatus({
      currentStatus: 'confirmed',
      nextStatus: 'processing',
      paymentMethod: 'sslcommerz',
      paymentStatus: 'pending',
    }).allowed,
    false,
  );
  assert.equal(
    canTransitionOrderStatus({
      currentStatus: 'confirmed',
      nextStatus: 'processing',
      paymentMethod: 'sslcommerz',
      paymentStatus: 'paid',
    }).allowed,
    true,
  );
  assert.equal(canCustomerCancelOrder('pending'), true);
  assert.equal(canCustomerCancelOrder('confirmed'), false);
  assert.equal(canCustomerCancelOrder('shipped'), false);
  assert.equal(canCustomerRequestCancellation('confirmed', null), true);
  assert.equal(canCustomerRequestCancellation('processing', { status: 'pending' }), false);
  assert.equal(canCustomerRequestCancellation('packed', { status: 'rejected' }), true);
  assert.equal(canCustomerRequestCancellation('shipped', null), false);

  const pendElig = getOrderCancellationEligibility({ orderStatus: 'pending' });
  assert.equal(pendElig.mode, 'direct_cancel');
  assert.equal(pendElig.canDirectCancel, true);
  assert.equal(pendElig.canRequestCancellation, false);

  const confElig = getOrderCancellationEligibility({ orderStatus: 'confirmed' });
  assert.equal(confElig.mode, 'request_cancellation');
  assert.equal(confElig.canDirectCancel, false);
  assert.equal(confElig.canRequestCancellation, true);

  const shipElig = getOrderCancellationEligibility({ orderStatus: 'shipped' });
  assert.equal(shipElig.mode, 'shipped_blocked');
  assert.equal(shipElig.canDirectCancel, false);
  assert.equal(shipElig.canRequestCancellation, false);

  assert.equal(canCustomerRequestReturn('delivered', new Date().toISOString()), true);
  assert.equal(computeAvailableStock(10, 4), 6);
  assert.equal(computeAvailableStock(10, undefined as unknown as number), 10);
  assert.equal(shouldRestoreStockOnCancel('confirmed', 'unpaid'), true);
});

test('Wishlist helpers deduplicate, toggle, merge guest items, and extract spec badges', () => {
  let ids = addWishlistId([], 'p1');
  ids = addWishlistId(ids, 'p1');
  ids = addWishlistId(ids, 'p2');
  assert.deepEqual(ids, ['p1', 'p2']);

  const toggledOff = toggleWishlistId(ids, 'p1');
  assert.equal(toggledOff.wishlisted, false);
  assert.deepEqual(toggledOff.nextIds, ['p2']);

  const toggledOn = toggleWishlistId(toggledOff.nextIds, 'p3');
  assert.equal(toggledOn.wishlisted, true);
  assert.deepEqual(toggledOn.nextIds, ['p2', 'p3']);

  assert.deepEqual(removeWishlistId(['p1', 'p2'], 'p1'), ['p2']);
  assert.deepEqual(mergeWishlistIds(['p1', 'p2'], ['p2', 'p3', 'p4']), ['p1', 'p2', 'p3', 'p4']);

  const badges = extractProductSpecBadges({
    id: 'p1',
    name: 'MacBook Air M4 13-inch',
    slug: 'macbook-air-m4-13',
    sku: 'MBA',
    categoryId: 'c1',
    description: '',
    attributeGroup: 'electronics',
    basePrice: 149999,
    currentPrice: 119999,
    originalPrice: 149999,
    discountPercent: 20,
    isFlashSaleActive: false,
    availableStock: 10,
    stockOnHand: 10,
    reservedStock: 0,
    hasVariants: false,
    variants: [],
    images: [],
    status: 'published',
    soldCount: 10,
    ratingAverage: 4.8,
    reviewCount: 10,
    attributeValues: [
      { code: 'display', name: 'Display', groupName: 'Specs', inputType: 'short_text', value: '13.6" Liquid Retina Display' },
      { code: 'storage', name: 'Storage', groupName: 'Specs', inputType: 'single_select', value: '256GB SSD' },
    ],
  });
  assert.deepEqual(badges, ['13.6" Liquid Retina Display', '256GB SSD']);

  const normWl = normalizeWishlistHeroSettings({ autoplayIntervalMs: 3000, showArrows: true });
  assert.equal(normWl.autoplayIntervalMs, 3000);
  assert.equal(normWl.showArrows, true);
  assert.equal(DEFAULT_WISHLIST_HERO_SETTINGS.enabled, true);
});

test('Cross-lingual search expands Bangla queries into English catalog terms', () => {
  const expanded = expandCrossLingualTerms('মোটিভেশনাল বই');
  assert.ok(expanded.expandedTerms.includes('motivational books'));
  assert.ok(expanded.expandedTerms.includes('motivational'));
  assert.ok(expanded.expandedTerms.includes('books'));

  const segments = buildHighlightSegments('Atomic Habits Motivational Book', 'book');
  assert.ok(segments.some((s) => s.match && s.text.toLowerCase() === 'book'));
});

test('RBAC enforces least privilege per staff role', () => {
  assert.equal(hasPermission('customer', 'orders.view'), false);
  assert.equal(hasPermission('inventory_manager', 'inventory.adjust'), true);
  assert.equal(hasPermission('inventory_manager', 'staff.manage'), false);
  assert.equal(hasPermission('order_manager', 'payments.reconcile'), false);
  assert.equal(hasPermission('finance_accounts', 'refunds.manage'), true);
  assert.equal(hasPermission('super_admin', 'staff.manage'), true);
});

test('parseApiResponsePayload validates JSON, rejects HTML /api/* responses, and parses structured errors safely', () => {
  const valid = parseApiResponsePayload<{ ok: true; products: unknown[] }>({
    path: '/api/products',
    status: 200,
    ok: true,
    contentType: 'application/json; charset=utf-8',
    rawText: JSON.stringify({ ok: true, products: [{ id: '1' }] }),
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.products.length, 1);

  assert.throws(
    () =>
      parseApiResponsePayload({
        path: '/api/products',
        status: 200,
        ok: true,
        contentType: 'text/html; charset=utf-8',
        rawText: '<!doctype html><html><body>SPA</body></html>',
      }),
    (err: unknown) => err instanceof ApiError && err.code === 'INVALID_API_RESPONSE',
  );

  assert.throws(
    () =>
      parseApiResponsePayload({
        path: '/api/products',
        status: 502,
        ok: false,
        contentType: 'text/html',
        rawText: '<html>502 Bad Gateway</html>',
      }),
    (err: unknown) => err instanceof ApiError && err.status === 502 && err.code === 'HTTP_ERROR',
  );

  assert.throws(
    () =>
      parseApiResponsePayload({
        path: '/api/products',
        status: 200,
        ok: true,
        contentType: 'application/json',
        rawText: '{bad json',
      }),
    (err: unknown) => err instanceof ApiError && err.code === 'MALFORMED_JSON_RESPONSE',
  );

  assert.throws(
    () =>
      parseApiResponsePayload({
        path: '/api/products',
        status: 503,
        ok: false,
        contentType: 'application/json',
        rawText: JSON.stringify({ ok: false, code: 'DATABASE_UNAVAILABLE', error: 'Atlas offline' }),
      }),
    (err: unknown) => err instanceof ApiError && err.code === 'DATABASE_UNAVAILABLE' && err.message === 'Atlas offline',
  );
});

test('evaluateDiscountRules selects best eligible rule and respects minQty/minSpend/dates', () => {
  const now = new Date('2026-11-16T12:00:00Z');
  const items = [
    { productId: 'p1', quantity: 3, unitPrice: 1000 },
    { productId: 'p2', quantity: 1, unitPrice: 500 },
  ];
  const res = evaluateDiscountRules(
    [
      { name: 'Bulk 15%', ruleType: 'bulk', value: 15, minQty: 4, minSpend: 2000, isActive: true },
      { name: 'Flat 300', ruleType: 'fixed', value: 300, minQty: 1, minSpend: 1000, isActive: true },
      { name: 'Expired 50%', ruleType: 'percentage', value: 50, isActive: true, endsAt: '2026-11-01T00:00:00Z' },
    ],
    items,
    now,
  );
  assert.equal(res.discountAmount, 525);
  assert.equal(res.appliedRuleName, 'Bulk 15%');
});

test('calculateOrderTotals computes inclusive and exclusive tax accurately', () => {
  const exclusive = calculateOrderTotals({
    items: [{ productId: 'p1', quantity: 1, unitPrice: 1000 }],
    couponDiscount: 0,
    shippingCharge: 60,
    taxRate: 0.05,
    taxInclusive: false,
  });
  assert.equal(exclusive.tax, 50);
  assert.equal(exclusive.total, 1110);

  const inclusive = calculateOrderTotals({
    items: [{ productId: 'p1', quantity: 1, unitPrice: 1050 }],
    couponDiscount: 0,
    shippingCharge: 60,
    taxRate: 0.05,
    taxInclusive: true,
  });
  assert.equal(inclusive.tax, 50);
  assert.equal(inclusive.total, 1110);
});

test('RBAC enforces logs.view, system.view, and customPermissions overrides', () => {
  assert.equal(hasPermission('order_manager', 'logs.view'), false);
  assert.equal(hasPermission('super_admin', 'logs.view'), true);
  assert.equal(hasPermission('super_admin', 'system.view'), true);
  assert.equal(hasPermission('admin', 'system.view'), true);
  assert.equal(hasPermission('order_manager', 'system.view', ['system.view']), true);
});

test('dateTime helpers handle local datetime formatting, schedule windows, and currency positions', () => {
  assert.equal(toLocalDateTimeInputValue(null), '');
  assert.equal(toLocalDateTimeInputValue('invalid-date'), '');
  const formatted = toLocalDateTimeInputValue('2026-11-16T08:30:00');
  assert.match(formatted, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

  const now = new Date('2026-11-16T12:00:00Z');
  assert.equal(isWithinScheduleWindow(null, null, now), true);
  assert.equal(isWithinScheduleWindow('2026-11-15T00:00:00Z', '2026-11-17T00:00:00Z', now), true);
  assert.equal(isWithinScheduleWindow('2026-11-17T00:00:00Z', null, now), false);
  assert.equal(isWithinScheduleWindow(null, '2026-11-15T00:00:00Z', now), false);

  assert.equal(formatStoreCurrency(1250, { symbol: '৳', position: 'prefix' }), '৳1,250');
  assert.equal(formatStoreCurrency(1250, { symbol: 'BDT', position: 'suffix' }), '1,250 BDT');
});

test('calculateShippingCharge matches active deliveryZones and ignores inactive zones', () => {
  const zones = [
    {
      name: 'Disabled Zone',
      divisions: ['Sylhet'],
      charge: 999,
      freeAbove: 5000,
      estimatedDays: '10 days',
      isActive: false,
    },
    {
      name: 'Sylhet Hub',
      divisions: ['Sylhet'],
      charge: 95,
      freeAbove: 1500,
      estimatedDays: '2 days',
      isActive: true,
    },
    {
      name: 'Fallback All',
      divisions: ['All'],
      charge: 110,
      freeAbove: 2000,
      estimatedDays: '4 days',
      isActive: true,
    },
  ];

  const sylhetUnder = calculateShippingCharge({
    division: 'Sylhet',
    district: 'Sylhet',
    upazila: 'Sylhet Sadar',
    subtotal: 1200,
    deliveryZones: zones,
  });
  assert.equal(sylhetUnder.charge, 95);
  assert.equal(sylhetUnder.zoneName, 'Sylhet Hub');
  assert.equal(sylhetUnder.estimatedDays, '2 days');
  assert.equal(sylhetUnder.freeShippingApplied, false);

  const sylhetFree = calculateShippingCharge({
    division: 'Sylhet',
    district: 'Sylhet',
    upazila: 'Sylhet Sadar',
    subtotal: 1500,
    deliveryZones: zones,
  });
  assert.equal(sylhetFree.charge, 0);
  assert.equal(sylhetFree.freeShippingApplied, true);

  const khulnaFallback = calculateShippingCharge({
    division: 'Khulna',
    district: 'Khulna',
    upazila: 'Sonadanga',
    subtotal: 1000,
    deliveryZones: zones,
  });
  assert.equal(khulnaFallback.charge, 110);
  assert.equal(khulnaFallback.zoneName, 'Fallback All');
});


