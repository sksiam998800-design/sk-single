import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CartHeroSliderSettings, HeroSlideRecord } from '../../types/commerce';
import { ResilientImage } from '../ui/ResilientImage';
import cartHeroFallbackImg from '../../assets/images/cart_hero_showcase_1794903452699.jpg';
import checkoutHeroFallbackImg from '../../assets/images/checkout_hero_showcase_1794905450149.jpg';

interface CartHeroSliderProps {
  slides: HeroSlideRecord[];
  settings: CartHeroSliderSettings;
  loading?: boolean;
  variant?: 'cart' | 'checkout';
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function resolveHeroImageUrl(url: string | undefined, variant: 'cart' | 'checkout'): string {
  if (!url) {
    return variant === 'checkout' ? checkoutHeroFallbackImg : cartHeroFallbackImg;
  }
  if (url === '/src/assets/images/checkout_hero_showcase_1794905450149.jpg') {
    return checkoutHeroFallbackImg;
  }
  if (url === '/src/assets/images/cart_hero_showcase_1794903452699.jpg') {
    return cartHeroFallbackImg;
  }
  return url;
}

export function CartHeroSlider({
  slides,
  settings,
  loading = false,
  variant = 'cart',
}: CartHeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const safeIndex = slides.length > 0 ? activeIndex % slides.length : 0;
  const hasMultiSlides = slides.length > 1;
  const showArrows = Boolean(settings.showArrows && hasMultiSlides);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (!settings.enabled || !settings.autoplay || isPaused || !hasMultiSlides) {
      return;
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const interval = Math.min(30000, Math.max(1500, settings.autoplayIntervalMs || 5000));
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, interval);
    return () => window.clearInterval(timer);
  }, [settings.enabled, settings.autoplay, settings.autoplayIntervalMs, isPaused, hasMultiSlides, slides.length]);

  if (loading) {
    return (
      <section
        aria-label={variant === 'checkout' ? 'Checkout Hero Banner' : 'Cart Hero Banner'}
        className="w-full border-b border-[#DCE7F9] bg-gradient-to-r from-[#DCE9FA] via-[#EDF4FD] to-[#F5F9FF]"
      >
        <div className="mx-auto max-w-[1380px] px-4 py-10 sm:py-12">
          <div className="h-36 sm:h-44 w-full animate-pulse rounded-2xl bg-white/50" />
        </div>
      </section>
    );
  }

  if (!settings.enabled || slides.length === 0) {
    return null;
  }

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };
  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };
  const goTo = (idx: number) => {
    setActiveIndex(idx);
  };

  return (
    <section
      aria-label={variant === 'checkout' ? 'Checkout Hero Slider' : 'Cart Hero Slider'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative w-full overflow-hidden border-b border-[#D7E4F8] bg-gradient-to-r from-[#DCE9FA] via-[#EAF2FD] to-[#F4F8FF]"
    >
      {/* Decorative Ambient Radial Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 h-full w-96 rounded-full bg-white/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#D4E4FC]/50 to-transparent"
      />

      {/* Slides Viewport */}
      <div className="relative mx-auto max-w-[1380px]">
        {settings.transitionEffect === 'slide' && hasMultiSlides ? (
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${safeIndex * 100}%)` }}
            >
              {slides.map((slide) => (
                <div key={slide.id} className="w-full shrink-0">
                  <CartHeroSlideContent
                    slide={slide}
                    reserveArrowSpace={showArrows}
                    variant={variant}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid">
            {slides.map((slide, idx) => {
              const active = idx === safeIndex;
              return (
                <div
                  key={slide.id}
                  aria-hidden={!active}
                  className={`col-start-1 row-start-1 transition-opacity duration-300 ease-out ${
                    active ? 'relative z-10 opacity-100' : 'pointer-events-none select-none opacity-0'
                  }`}
                >
                  <CartHeroSlideContent
                    slide={slide}
                    reserveArrowSpace={showArrows}
                    variant={variant}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation Arrows */}
        {showArrows && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/90 bg-white/90 text-[#0F1D3A] shadow-sm backdrop-blur-xs transition hover:bg-white hover:text-[#1155EE] focus-visible:outline-2 focus-visible:outline-[#1155EE]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/90 bg-white/90 text-[#0F1D3A] shadow-sm backdrop-blur-xs transition hover:bg-white hover:text-[#1155EE] focus-visible:outline-2 focus-visible:outline-[#1155EE]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {settings.showDots && hasMultiSlides && (
          <div
            role="tablist"
            aria-label="Hero slide pagination"
            className="relative z-20 flex items-center justify-center gap-2 pb-3.5 pt-1"
          >
            {slides.map((slide, idx) => {
              const active = idx === safeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Go to slide ${idx + 1}: ${slide.heading}`}
                  onClick={() => goTo(idx)}
                  className={`h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-[#1155EE] ${
                    active
                      ? 'w-5 bg-[#1155EE] shadow-xs'
                      : 'w-2 border border-[#BBD0F5] bg-white/90 hover:bg-white'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function CartHeroSlideContent({
  slide,
  reserveArrowSpace,
  variant,
}: {
  slide: HeroSlideRecord;
  reserveArrowSpace: boolean;
  variant: 'cart' | 'checkout';
}) {
  const alignment = slide.textAlignment || 'left';
  const overlayOpacity = Math.min(85, Math.max(0, Number(slide.overlayOpacity ?? 0)));
  const ctaUrl = slide.ctaUrl || '/shop';
  const defaultCta = variant === 'checkout' ? '' : 'Continue Shopping';
  const ctaText = (slide.ctaText ?? defaultCta).trim();
  const isCentered = alignment === 'center';
  const isRightAligned = alignment === 'right';
  const desktopImg = resolveHeroImageUrl(slide.desktopImageUrl, variant);
  const mobileImg = resolveHeroImageUrl(slide.mobileImageUrl || slide.desktopImageUrl, variant);

  const ctaElement = ctaText ? (
    isExternalUrl(ctaUrl) ? (
      <a
        href={ctaUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-[#0B44CC]"
      >
        <span>{ctaText}</span>
        <ArrowRight className="h-4 w-4" />
      </a>
    ) : (
      <Link
        to={ctaUrl}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-[#0B44CC]"
      >
        <span>{ctaText}</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    )
  ) : null;

  const badgeMarkup = slide.badgeText ? (
    variant === 'checkout' ? (
      <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[#BBD0F5] bg-white/95 px-3.5 py-1 shadow-xs">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1155EE] text-white">
          <Check className="h-2.5 w-2.5 stroke-[3]" />
        </span>
        <span className="text-xs sm:text-[13px] font-bold tracking-tight text-[#0B1730]">
          {slide.badgeText}
        </span>
      </div>
    ) : (
      <p
        className={`font-display text-lg sm:text-[22px] font-bold tracking-tight ${
          overlayOpacity >= 35 ? 'text-blue-200' : 'text-[#0B1730]'
        }`}
      >
        {slide.badgeText}
      </p>
    )
  ) : null;

  if (isCentered) {
    return (
      <div
        className={`relative flex min-h-[210px] sm:min-h-[240px] items-center justify-center overflow-hidden py-8 text-center ${
          reserveArrowSpace ? 'px-12 sm:px-16' : 'px-4'
        }`}
      >
        <div className="pointer-events-none absolute inset-0">
          <picture className="block h-full w-full">
            <source media="(max-width: 639px)" srcSet={mobileImg} />
            <ResilientImage
              src={desktopImg}
              alt={slide.heading}
              className="h-full w-full object-cover opacity-35"
            />
          </picture>
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#DCE9FA]/75 via-[#EDF4FD]/70 to-[#F4F8FF]/85"
            style={
              overlayOpacity > 0
                ? { backgroundColor: `rgba(11, 23, 48, ${overlayOpacity / 100})` }
                : undefined
            }
          />
        </div>
        <div className={`relative z-10 max-w-2xl ${overlayOpacity >= 35 ? 'text-white' : 'text-[#0B1730]'}`}>
          {badgeMarkup}
          <h1 className="font-display mt-1 text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-[1.1]">
            {slide.heading}
            {slide.headlineLine2 && (
              <span className={`block ${overlayOpacity >= 35 ? 'text-blue-300' : 'text-[#1155EE]'}`}>
                {slide.headlineLine2}
              </span>
            )}
          </h1>
          {slide.subtitle && (
            <p className={`mt-2.5 text-sm sm:text-[15px] leading-relaxed ${overlayOpacity >= 35 ? 'text-slate-100' : 'text-[#3B4C6B]'}`}>
              {slide.subtitle}
            </p>
          )}
          {ctaElement}
        </div>
      </div>
    );
  }

  const sideInset = reserveArrowSpace
    ? 'px-12 sm:px-14 lg:px-14'
    : 'px-4 sm:px-6 lg:px-8';

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-12 items-center min-h-[205px] sm:min-h-[235px]">
      {overlayOpacity > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{ backgroundColor: `rgba(11, 23, 48, ${overlayOpacity / 100})` }}
        />
      )}

      {/* Copy Column */}
      <div
        className={`relative z-20 py-6 md:py-7 ${sideInset} ${
          isRightAligned
            ? 'md:order-2 md:col-span-6 lg:col-span-5 text-left md:text-right'
            : 'md:order-1 md:col-span-6 lg:col-span-5 text-left'
        }`}
      >
        {badgeMarkup}
        <h1
          className={`font-display mt-0.5 text-2xl sm:text-3xl lg:text-[40px] font-extrabold tracking-tight leading-[1.12] ${
            overlayOpacity >= 35 ? 'text-white' : 'text-[#0B1730]'
          }`}
        >
          {slide.heading}
          {slide.headlineLine2 && (
            <span className={`block ${overlayOpacity >= 35 ? 'text-blue-300' : 'text-[#1155EE]'}`}>
              {slide.headlineLine2}
            </span>
          )}
        </h1>
        {slide.subtitle && (
          <p
            className={`mt-2.5 max-w-md text-sm sm:text-[15px] leading-relaxed ${
              isRightAligned ? 'md:ml-auto' : ''
            } ${overlayOpacity >= 35 ? 'text-slate-100' : 'text-[#334463]'}`}
          >
            {slide.subtitle}
          </p>
        )}
        {ctaElement}
      </div>

      {/* Product / Promotional Visual Column with Feathered Alpha Mask */}
      <div
        className={`relative h-44 sm:h-52 md:h-[240px] lg:h-[255px] w-full overflow-hidden ${
          isRightAligned
            ? 'md:order-1 md:col-span-6 lg:col-span-7 hero-media-feather-left'
            : 'md:order-2 md:col-span-6 lg:col-span-7 hero-media-feather-right'
        }`}
      >
        <picture className="block h-full w-full">
          <source media="(max-width: 639px)" srcSet={mobileImg} />
          <ResilientImage
            src={desktopImg}
            alt={slide.heading}
            className="h-full w-full object-cover object-center"
          />
        </picture>
      </div>
    </div>
  );
}
