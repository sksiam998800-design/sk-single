import type { CartHeroSliderSettings, HeroSlidePlacement, HeroSlideRecord } from '../types/commerce';
import { isWithinScheduleWindow } from './dateTime';

export const DEFAULT_CART_HERO_SETTINGS: CartHeroSliderSettings = {
  enabled: true,
  autoplay: true,
  autoplayIntervalMs: 5000,
  showDots: true,
  showArrows: true,
  transitionEffect: 'fade',
  confidenceBanner: {
    enabled: true,
    title: 'Shop with Confidence',
    subtitle: 'Safe Payment  |  Secure Checkout  |  7-Day Return Policy',
  },
};

export const DEFAULT_CHECKOUT_HERO_SETTINGS: CartHeroSliderSettings = {
  enabled: true,
  autoplay: true,
  autoplayIntervalMs: 5500,
  showDots: true,
  showArrows: false,
  transitionEffect: 'fade',
  confidenceBanner: {
    enabled: true,
    title: 'Shop with Confidence',
    subtitle: '7-Day Return Policy • Secure Payment • 100% Genuine Products',
  },
};

export const DEFAULT_WISHLIST_HERO_SETTINGS: CartHeroSliderSettings = {
  enabled: true,
  autoplay: true,
  autoplayIntervalMs: 5000,
  showDots: true,
  showArrows: false,
  transitionEffect: 'fade',
};

export const FALLBACK_CART_HERO_SLIDES: HeroSlideRecord[] = [
  {
    id: 'default-cart-hero-1',
    placement: 'cart',
    badgeText: 'Your Cart',
    heading: 'Shopping Made Easy!',
    headlineLine2: '',
    subtitle: 'Review your items and proceed to checkout for a seamless shopping experience.',
    desktopImageUrl: '/src/assets/images/cart_hero_showcase_1794903452699.jpg',
    mobileImageUrl: '/src/assets/images/cart_hero_showcase_1794903452699.jpg',
    ctaText: 'Continue Shopping',
    ctaUrl: '/shop',
    textAlignment: 'left',
    overlayOpacity: 0,
    sortOrder: 0,
    isActive: true,
  },
];

export const FALLBACK_CHECKOUT_HERO_SLIDES: HeroSlideRecord[] = [
  {
    id: 'default-checkout-hero-1',
    placement: 'checkout',
    badgeText: 'Secure & Easy Checkout',
    heading: 'Complete Your Order',
    headlineLine2: 'Quickly & Securely!',
    subtitle: 'Shop with Confidence – Your Satisfaction is Our Priority.',
    desktopImageUrl: '/src/assets/images/checkout_hero_showcase_1794905450149.jpg',
    mobileImageUrl: '/src/assets/images/checkout_hero_showcase_1794905450149.jpg',
    ctaText: '',
    ctaUrl: '/shop',
    textAlignment: 'left',
    overlayOpacity: 0,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: 'default-checkout-hero-2',
    placement: 'checkout',
    badgeText: 'Nationwide Express Delivery',
    heading: 'Verified Dispatch &',
    headlineLine2: '7-Day Easy Returns!',
    subtitle: '100% Genuine Products with Cash on Delivery & Digital Payment Options.',
    desktopImageUrl: '/src/assets/images/checkout_hero_showcase_1794905450149.jpg',
    mobileImageUrl: '/src/assets/images/checkout_hero_showcase_1794905450149.jpg',
    ctaText: '',
    ctaUrl: '/shop',
    textAlignment: 'left',
    overlayOpacity: 0,
    sortOrder: 1,
    isActive: true,
  },
];

export const FALLBACK_WISHLIST_HERO_SLIDES: HeroSlideRecord[] = [
  {
    id: 'default-wishlist-hero-1',
    placement: 'wishlist',
    badgeText: '',
    heading: 'My Wishlist',
    headlineLine2: '',
    subtitle: 'Save your favorite products for later. Shop smarter, not harder!',
    desktopImageUrl: '/src/assets/images/wishlist_hero_showcase_1794919699999.jpg',
    mobileImageUrl: '/src/assets/images/wishlist_hero_showcase_1794919699999.jpg',
    ctaText: 'Continue Shopping',
    ctaUrl: '/shop',
    textAlignment: 'left',
    overlayOpacity: 0,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: 'default-wishlist-hero-2',
    placement: 'wishlist',
    badgeText: '',
    heading: 'Saved Favorites',
    headlineLine2: 'Ready Anytime!',
    subtitle: 'Track instant price drops and stock alerts across your curated collection.',
    desktopImageUrl: '/src/assets/images/wishlist_hero_showcase_1794919699999.jpg',
    mobileImageUrl: '/src/assets/images/wishlist_hero_showcase_1794919699999.jpg',
    ctaText: 'Explore Deals',
    ctaUrl: '/offers',
    textAlignment: 'left',
    overlayOpacity: 0,
    sortOrder: 1,
    isActive: true,
  },
];

export function filterAndSortHeroSlides(
  slides: HeroSlideRecord[],
  options: { placement?: HeroSlidePlacement; now?: Date; activeOnly?: boolean } = {},
): HeroSlideRecord[] {
  const { placement, now = new Date(), activeOnly = true } = options;
  return (Array.isArray(slides) ? slides : [])
    .filter((slide) => {
      if (placement) {
        const slidePlacement = slide.placement || 'home';
        if (slidePlacement !== placement) return false;
      }
      if (activeOnly) {
        if (slide.isActive === false) return false;
        if (!isWithinScheduleWindow(slide.startsAt, slide.endsAt, now)) return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
}

export function normalizeCartHeroSettings(
  raw?: Partial<CartHeroSliderSettings> | null,
  defaults: CartHeroSliderSettings = DEFAULT_CART_HERO_SETTINGS,
): CartHeroSliderSettings {
  const intervalRaw = Number(raw?.autoplayIntervalMs ?? defaults.autoplayIntervalMs);
  const autoplayIntervalMs = Number.isFinite(intervalRaw)
    ? Math.min(30000, Math.max(1500, Math.round(intervalRaw)))
    : defaults.autoplayIntervalMs;

  return {
    enabled: raw?.enabled !== undefined ? raw.enabled !== false : defaults.enabled,
    autoplay: raw?.autoplay !== undefined ? raw.autoplay !== false : defaults.autoplay,
    autoplayIntervalMs,
    showDots: raw?.showDots !== undefined ? raw.showDots !== false : defaults.showDots,
    showArrows: raw?.showArrows !== undefined ? raw.showArrows !== false : defaults.showArrows,
    transitionEffect: raw?.transitionEffect === 'slide' ? 'slide' : 'fade',
    confidenceBanner: defaults.confidenceBanner
      ? {
          enabled:
            raw?.confidenceBanner?.enabled !== undefined
              ? raw.confidenceBanner.enabled !== false
              : defaults.confidenceBanner.enabled,
          title: raw?.confidenceBanner?.title?.trim() || defaults.confidenceBanner.title,
          subtitle: raw?.confidenceBanner?.subtitle?.trim() || defaults.confidenceBanner.subtitle,
        }
      : undefined,
  };
}

export function normalizeCheckoutHeroSettings(
  raw?: Partial<CartHeroSliderSettings> | null,
): CartHeroSliderSettings {
  return normalizeCartHeroSettings(raw, DEFAULT_CHECKOUT_HERO_SETTINGS);
}

export function normalizeWishlistHeroSettings(
  raw?: Partial<CartHeroSliderSettings> | null,
): CartHeroSliderSettings {
  return normalizeCartHeroSettings(raw, DEFAULT_WISHLIST_HERO_SETTINGS);
}
