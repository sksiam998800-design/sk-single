import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CartHeroSliderSettings, HeroSlideRecord } from '../../types/commerce';
import { ResilientImage } from '../ui/ResilientImage';
import wishlistHeroFallbackImg from '../../assets/images/wishlist_hero_showcase_1794919699999.jpg';

interface WishlistHeroSliderProps {
  slides: HeroSlideRecord[];
  settings: CartHeroSliderSettings;
  loading?: boolean;
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function resolveWishlistHeroImage(url?: string): string {
  if (!url || url === '/src/assets/images/wishlist_hero_showcase_1794919699999.jpg') {
    return wishlistHeroFallbackImg;
  }
  return url;
}

export function WishlistHeroSlider({ slides, settings, loading = false }: WishlistHeroSliderProps) {
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
        aria-label="Wishlist Hero Banner"
        className="w-full border-b border-[#DCE7F9] bg-gradient-to-r from-[#EAF2FF] via-[#DCE9FF] to-[#CFE1FF]"
      >
        <div className="mx-auto max-w-[1380px] px-4 py-8 sm:py-10">
          <div className="h-44 sm:h-48 w-full animate-pulse rounded-2xl bg-white/50" />
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
      aria-label="Wishlist Hero Slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative w-full overflow-hidden border-b border-[#D5E3FA] bg-gradient-to-r from-[#EDF4FF] via-[#E1ECFF] to-[#D2E3FF]"
    >
      {/* Decorative Curved Ice-Blue Waves matching Reference Banner */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      >
        <path
          fill="#FFFFFF"
          fillOpacity="0.45"
          d="M0,256C220,210,410,120,700,150C980,178,1210,275,1440,210L1440,0L0,0Z"
        />
        <path
          fill="#BFD7FF"
          fillOpacity="0.35"
          d="M0,320L0,230C280,290,560,260,860,180C1120,110,1300,145,1440,180L1440,320Z"
        />
      </svg>

      <div className="relative mx-auto max-w-[1380px]">
        {settings.transitionEffect === 'slide' && hasMultiSlides ? (
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${safeIndex * 100}%)` }}
            >
              {slides.map((slide) => (
                <div key={slide.id} className="w-full shrink-0">
                  <WishlistHeroSlideContent slide={slide} reserveArrowSpace={showArrows} />
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
                  <WishlistHeroSlideContent slide={slide} reserveArrowSpace={showArrows} />
                </div>
              );
            })}
          </div>
        )}

        {showArrows && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous wishlist slide"
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/90 bg-white/90 text-[#0F1D3A] shadow-sm backdrop-blur-xs transition hover:bg-white hover:text-[#1155EE]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next wishlist slide"
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/90 bg-white/90 text-[#0F1D3A] shadow-sm backdrop-blur-xs transition hover:bg-white hover:text-[#1155EE]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {settings.showDots && slides.length > 0 && (
          <div
            role="tablist"
            aria-label="Wishlist hero slide pagination"
            className="relative z-20 flex items-center justify-center gap-2 pb-4 pt-1"
          >
            {slides.map((slide, idx) => {
              const active = idx === safeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Slide ${idx + 1}: ${slide.heading}`}
                  onClick={() => goTo(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    active
                      ? 'w-2.5 bg-[#1155EE] ring-2 ring-[#1155EE]/20'
                      : 'w-2.5 bg-white/90 border border-[#C6DAFC] hover:bg-white'
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

function WishlistHeroSlideContent({
  slide,
  reserveArrowSpace,
}: {
  slide: HeroSlideRecord;
  reserveArrowSpace: boolean;
}) {
  const alignment = slide.textAlignment || 'left';
  const overlayOpacity = Math.min(85, Math.max(0, Number(slide.overlayOpacity ?? 0)));
  const ctaUrl = slide.ctaUrl || '/shop';
  const ctaText = (slide.ctaText ?? 'Continue Shopping').trim();
  const isCentered = alignment === 'center';
  const isRightAligned = alignment === 'right';
  const desktopImg = resolveWishlistHeroImage(slide.desktopImageUrl);
  const mobileImg = resolveWishlistHeroImage(slide.mobileImageUrl || slide.desktopImageUrl);

  const ctaElement = ctaText ? (
    isExternalUrl(ctaUrl) ? (
      <a
        href={ctaUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-[#0B44CC]"
      >
        <span>{ctaText}</span>
        <ArrowRight className="h-4 w-4" />
      </a>
    ) : (
      <Link
        to={ctaUrl}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-[#0B44CC]"
      >
        <span>{ctaText}</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
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
            <ResilientImage src={desktopImg} alt={slide.heading} className="h-full w-full object-cover opacity-35" />
          </picture>
          {overlayOpacity > 0 && (
            <div className="absolute inset-0" style={{ backgroundColor: `rgba(11, 23, 48, ${overlayOpacity / 100})` }} />
          )}
        </div>
        <div className={`relative z-10 max-w-2xl ${overlayOpacity >= 35 ? 'text-white' : 'text-[#0B1730]'}`}>
          {slide.badgeText && (
            <span className="inline-block rounded-full bg-white/90 px-3 py-0.5 text-xs font-bold text-[#1155EE] shadow-2xs">
              {slide.badgeText}
            </span>
          )}
          <h1 className="font-display mt-1 text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight leading-[1.08]">
            {slide.heading}
            {slide.headlineLine2 && (
              <span className={`block ${overlayOpacity >= 35 ? 'text-blue-300' : 'text-[#1155EE]'}`}>
                {slide.headlineLine2}
              </span>
            )}
          </h1>
          {slide.subtitle && (
            <p className={`mt-2.5 text-sm sm:text-[15px] leading-relaxed ${overlayOpacity >= 35 ? 'text-slate-100' : 'text-[#283B5E]'}`}>
              {slide.subtitle}
            </p>
          )}
          {ctaElement}
        </div>
      </div>
    );
  }

  const sideInset = reserveArrowSpace ? 'px-12 sm:px-14' : 'px-4 sm:px-6 lg:px-8';

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-12 items-center min-h-[210px] sm:min-h-[245px]">
      {overlayOpacity > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{ backgroundColor: `rgba(11, 23, 48, ${overlayOpacity / 100})` }}
        />
      )}

      <div
        className={`relative z-20 py-7 ${sideInset} ${
          isRightAligned
            ? 'md:order-2 md:col-span-6 lg:col-span-5 text-left md:text-right'
            : 'md:order-1 md:col-span-6 lg:col-span-5 text-left'
        }`}
      >
        {slide.badgeText && (
          <span className="mb-2 inline-block rounded-full bg-white/85 px-3 py-0.5 text-xs font-bold text-[#1155EE] shadow-2xs">
            {slide.badgeText}
          </span>
        )}
        <h1
          className={`font-display text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-[1.1] ${
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
            } ${overlayOpacity >= 35 ? 'text-slate-100' : 'text-[#283B5E]'}`}
          >
            {slide.subtitle}
          </p>
        )}
        {ctaElement}
      </div>

      <div
        className={`relative h-44 sm:h-52 md:h-[245px] lg:h-[260px] w-full overflow-hidden ${
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
