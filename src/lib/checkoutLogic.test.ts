import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BD_DIVISIONS,
  DEFAULT_DELIVERY_OPTIONS,
  buildAvailableDeliveryOptions,
  calculateShippingCharge,
  getAreasForUpazila,
  getDistrictsForDivision,
  getDivisionNames,
  getUpazilasForDistrict,
  validateBangladeshAddressHierarchy,
} from './bdLocations';
import {
  DEFAULT_CHECKOUT_HERO_SETTINGS,
  FALLBACK_CHECKOUT_HERO_SLIDES,
  filterAndSortHeroSlides,
  normalizeCheckoutHeroSettings,
} from './cartHero';
import {
  canRefundPaymentTransaction,
  canRetryOrderPayment,
  canTransitionOrderStatus,
  computeRefundableBalance,
} from './orderStateMachine';
import { calculateOrderTotals } from './pricingEngine';

test('BD_DIVISIONS covers all 8 administrative divisions and all 64 unique districts', () => {
  const divisions = getDivisionNames();
  assert.equal(divisions.length, 8);
  assert.deepEqual(divisions, [
    'Dhaka',
    'Chattogram',
    'Rajshahi',
    'Khulna',
    'Sylhet',
    'Barishal',
    'Rangpur',
    'Mymensingh',
  ]);

  const expectedDistrictCounts: Record<string, number> = {
    Dhaka: 13,
    Chattogram: 11,
    Rajshahi: 8,
    Khulna: 10,
    Sylhet: 4,
    Barishal: 6,
    Rangpur: 8,
    Mymensingh: 4,
  };

  const allDistrictNames = new Set<string>();
  let totalDistricts = 0;

  for (const division of BD_DIVISIONS) {
    const districts = getDistrictsForDivision(division.name);
    assert.equal(districts.length, expectedDistrictCounts[division.name]);
    totalDistricts += districts.length;
    for (const district of districts) {
      allDistrictNames.add(district.name);
      assert.ok(district.upazilas.length > 0, `District ${district.name} must have upazilas`);
      for (const upazila of district.upazilas) {
        assert.ok(upazila.areas.length > 0, `Upazila ${upazila.name} in ${district.name} must have areas`);
      }
    }
  }

  assert.equal(totalDistricts, 64);
  assert.equal(allDistrictNames.size, 64);
});

test('Cascading Bangladesh address selectors & validation support rural unions and urban areas', () => {
  const dhakaDistricts = getDistrictsForDivision('Dhaka');
  assert.ok(dhakaDistricts.some((d) => d.name === 'Dhaka'));
  const dhanmondiAreas = getAreasForUpazila('Dhaka', 'Dhaka', 'Dhanmondi');
  assert.ok(dhanmondiAreas.some((a) => a.name === 'Kalabagan'));
  assert.ok(dhanmondiAreas.some((a) => a.name === 'Pourashava / Urban Area (Union N/A)'));

  assert.equal(
    validateBangladeshAddressHierarchy({
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhanmondi',
      area: 'Pourashava / Urban Area (Union N/A)',
    }).valid,
    true,
  );

  // District belonging to wrong division must fail
  assert.equal(
    validateBangladeshAddressHierarchy({
      division: 'Rajshahi',
      district: 'Bogura',
      upazila: 'Bogura Sadar',
      area: 'Satmatha',
    }).valid,
    true,
  );
  assert.equal(
    validateBangladeshAddressHierarchy({
      division: 'Dhaka',
      district: 'Bogura',
      upazila: 'Bogura Sadar',
      area: 'Satmatha',
    }).valid,
    false,
  );

  assert.ok(getUpazilasForDistrict('Unknown', 'Dhaka').length === 0);
  assert.ok(getAreasForUpazila('Dhaka', 'Dhaka', 'Unknown').length === 0);
});

test('Delivery option builder & shipping calculator handle standard, express, custom options, and division filtering', () => {
  const options = buildAvailableDeliveryOptions({
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhanmondi',
    subtotal: 500,
    deliveryOptions: DEFAULT_DELIVERY_OPTIONS,
  });

  assert.equal(options.length, 2);
  assert.equal(options[0].code, 'standard');
  assert.equal(options[0].charge, 60);
  assert.equal(options[0].freeShippingApplied, false);

  assert.equal(options[1].code, 'express');
  assert.equal(options[1].charge, 140); // 60 base + 80 express surcharge under 999 free-shipping threshold
  assert.equal(options[1].freeShippingApplied, false);

  const freeThresholdStandard = calculateShippingCharge({
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Gulshan',
    subtotal: 1200,
    deliveryOptionCode: 'standard',
    deliveryOptions: DEFAULT_DELIVERY_OPTIONS,
  });
  assert.equal(freeThresholdStandard.charge, 0);
  assert.equal(freeThresholdStandard.freeShippingApplied, true);
  assert.equal(freeThresholdStandard.deliveryMethodName, 'Standard Delivery');

  // Custom division-restricted delivery option
  const customOptions = [
    ...DEFAULT_DELIVERY_OPTIONS,
    {
      code: 'dhaka_same_day',
      name: 'Dhaka 6-Hour Dispatch',
      description: 'Same-day courier inside Dhaka Metro',
      estimatedTime: 'Same Day (6 Hours)',
      methodType: 'express' as const,
      surcharge: 120,
      freeShippingEligible: false,
      isActive: true,
      sortOrder: 2,
      divisions: ['Dhaka'],
    },
  ];

  const dhakaList = buildAvailableDeliveryOptions({
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Mirpur',
    subtotal: 2000,
    deliveryOptions: customOptions,
  });
  assert.equal(dhakaList.length, 3);
  assert.equal(dhakaList[2].code, 'dhaka_same_day');
  assert.equal(dhakaList[2].charge, 120);

  const sylhetList = buildAvailableDeliveryOptions({
    division: 'Sylhet',
    district: 'Sylhet',
    upazila: 'Sylhet Sadar',
    subtotal: 2000,
    deliveryOptions: customOptions,
  });
  assert.equal(sylhetList.length, 2);
  assert.equal(sylhetList.some((opt) => opt.code === 'dhaka_same_day'), false);
});

test('Checkout hero slider settings normalization and placement filtering isolate checkout slides cleanly', () => {
  const normalizedDefault = normalizeCheckoutHeroSettings(undefined);
  assert.equal(normalizedDefault.enabled, DEFAULT_CHECKOUT_HERO_SETTINGS.enabled);
  assert.equal(normalizedDefault.showArrows, false);
  assert.equal(normalizedDefault.confidenceBanner?.title, 'Shop with Confidence');

  const clamped = normalizeCheckoutHeroSettings({ autoplayIntervalMs: 60000, showArrows: true, transitionEffect: 'slide' });
  assert.equal(clamped.autoplayIntervalMs, 30000);
  assert.equal(clamped.showArrows, true);
  assert.equal(clamped.transitionEffect, 'slide');

  const mixedSlides = [
    {
      id: 'home-1',
      placement: 'home' as const,
      badgeText: 'Home',
      heading: 'Home Hero',
      desktopImageUrl: '/home.jpg',
      ctaText: 'Shop',
      ctaUrl: '/shop',
      sortOrder: 0,
      isActive: true,
    },
    ...FALLBACK_CHECKOUT_HERO_SLIDES,
  ];

  const checkoutSlides = filterAndSortHeroSlides(mixedSlides, { placement: 'checkout', activeOnly: true });
  assert.equal(checkoutSlides.length, 2);
  assert.equal(checkoutSlides[0].badgeText, 'Secure & Easy Checkout');
});

test('Order state machine enforces prepaid payment verification for Nagad orders and totals clamp safely', () => {
  const blockedUnpaidNagad = canTransitionOrderStatus({
    currentStatus: 'confirmed',
    nextStatus: 'processing',
    paymentMethod: 'nagad',
    paymentStatus: 'pending',
  });
  assert.equal(blockedUnpaidNagad.allowed, false);

  const allowedPaidNagad = canTransitionOrderStatus({
    currentStatus: 'confirmed',
    nextStatus: 'processing',
    paymentMethod: 'nagad',
    paymentStatus: 'paid',
  });
  assert.equal(allowedPaidNagad.allowed, true);

  const totals = calculateOrderTotals({
    items: [{ productId: 'macbook-m4', quantity: 1, unitPrice: 119999 }],
    couponDiscount: 12000,
    shippingCharge: 60,
  });
  assert.equal(totals.subtotal, 119999);
  assert.equal(totals.discount, 12000);
  assert.equal(totals.shippingCharge, 60);
  assert.equal(totals.total, 108059);
});


test('Payment retry eligibility and refundable balance helpers enforce strict financial guards', () => {
  // Retry allowed for failed/cancelled/initiated online orders not delivered/paid/COD
  assert.equal(canRetryOrderPayment({ orderStatus: 'pending', paymentMethod: 'bkash', paymentStatus: 'initiated' }), true);
  assert.equal(canRetryOrderPayment({ orderStatus: 'cancelled', paymentMethod: 'nagad', paymentStatus: 'failed' }), true);
  assert.equal(canRetryOrderPayment({ orderStatus: 'pending', paymentMethod: 'cod', paymentStatus: 'unpaid' }), false);
  assert.equal(canRetryOrderPayment({ orderStatus: 'confirmed', paymentMethod: 'bkash', paymentStatus: 'paid' }), false);
  assert.equal(canRetryOrderPayment({ orderStatus: 'delivered', paymentMethod: 'card', paymentStatus: 'failed' }), false);

  // Refundable balance & refund eligibility
  assert.equal(computeRefundableBalance(5000, 1500), 3500);
  assert.equal(computeRefundableBalance(5000, 5000), 0);
  assert.equal(canRefundPaymentTransaction({ status: 'paid', amount: 2500, refundedAmount: 0 }), true);
  assert.equal(canRefundPaymentTransaction({ status: 'partially_refunded', amount: 2500, refundedAmount: 1000 }), true);
  assert.equal(canRefundPaymentTransaction({ status: 'refunded', amount: 2500, refundedAmount: 2500 }), false);
  assert.equal(canRefundPaymentTransaction({ status: 'failed', amount: 2500, refundedAmount: 0 }), false);
});

