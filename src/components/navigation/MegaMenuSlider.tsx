import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  computeNextSlideIndex,
  sanitizeNavigationUrl,
  type NavigationFocalPoint,
  type NavigationSlideConfig,
  type NavigationSliderSettings,
} from '../../lib/navigationEngine';
import { ResilientImage } from '../ui/ResilientImage';

interface MegaMenuSliderProps {
  slides: NavigationSlideConfig[];
  settings: NavigationSliderSettings;
  onNavigate?: () => void;
  compact?: boolean;
}

const FOCAL_POINT_CLASS: Record<NavigationFocalPoint, string> = {
  center: 'object-center',
  top: 'object-top',
  bottom: 'object-bottom',
  left: 'object-left',
  right: 'object-right',
};

const ASPECT_RATIO_CLASS: Record<NavigationSliderSettings['aspectRatio'], string> = {
  '4/3': 'aspect-[4/3]',
  '16/10': 'aspect-[16/10]',
  '16/9': 'aspect-[16/9]',
  square: 'aspect-square',
};

export function MegaMenuSlider({ slides, settings, onNavigate, compact = false }: MegaMenuSliderProps) {
  const activeSlides = slides.filter((s) => s.isActive && Boolean(s.imageUrl));
  const totalSlides = activeSlides.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [exitingIdx, setExitingIdx] = useState<number | null>(null);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [transitionKey, setTransitionKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const exitTimerRef = useRef<number | null>(null);
  const transitionMs = Math.min(1000, Math.max(150, Number(settings?.transitionDurationMs || 420)));

  // Clamp index if admin removes/toggles slides dynamically
  const safeCurrentIdx = totalSlides > 0 ? currentIdx % totalSlides : 0;

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearExitTimer();
  }, [clearExitTimer]);

  const goToIndex = useCallback(
    (nextIdx: number, dir: 'next' | 'prev') => {
      if (totalSlides <= 1) return;
      const clampedNext = ((nextIdx % totalSlides) + totalSlides) % totalSlides;
      if (clampedNext === safeCurrentIdx) return;

      clearExitTimer();
      setExitingIdx(safeCurrentIdx);
      setDirection(dir);
      setCurrentIdx(clampedNext);
      setTransitionKey((k) => k + 1);

      exitTimerRef.current = window.setTimeout(() => {
        setExitingIdx(null);
        exitTimerRef.current = null;
      }, transitionMs);
    },
    [clearExitTimer, safeCurrentIdx, totalSlides, transitionMs],
  );

  const handleNext = useCallback(() => {
    goToIndex(computeNextSlideIndex(safeCurrentIdx, totalSlides, 'next'), 'next');
  }, [goToIndex, safeCurrentIdx, totalSlides]);

  const handlePrev = useCallback(() => {
    goToIndex(computeNextSlideIndex(safeCurrentIdx, totalSlides, 'prev'), 'prev');
  }, [goToIndex, safeCurrentIdx, totalSlides]);

  useEffect(() => {
    if (!settings?.autoplay || totalSlides <= 1) return;
    if (settings?.pauseOnHover && isPaused) return;
    const interval = Math.max(1500, Number(settings?.intervalMs || 4500));
    const timer = window.setInterval(() => {
      handleNext();
    }, interval);
    return () => window.clearInterval(timer);
  }, [handleNext, isPaused, settings?.autoplay, settings?.intervalMs, settings?.pauseOnHover, totalSlides]);

  if (totalSlides === 0) {
    return null;
  }

  const currentSlide = activeSlides[safeCurrentIdx];
  const exitingSlide = exitingIdx !== null && exitingIdx !== safeCurrentIdx ? activeSlides[exitingIdx] : null;
  const aspectClass = ASPECT_RATIO_CLASS[settings?.aspectRatio || '4/3'] || 'aspect-[4/3]';
  const showArrows = settings?.showArrows !== false && totalSlides > 1;
  const showIndicators = settings?.showIndicators !== false && totalSlides > 1;

  const renderSlideFrame = (
    slide: NavigationSlideConfig,
    roleClass: string,
    keySuffix: string,
    isHiddenForMotionExit = false,
  ) => {
    const hasTextOverlay = Boolean(slide.title || slide.subtitle || slide.description || slide.buttonText);
    const fitClass = slide.objectFit === 'contain' ? 'object-contain p-2 bg-[#0B1730]' : 'object-cover';
    const focalClass = FOCAL_POINT_CLASS[slide.focalPoint || 'center'] || 'object-center';
    const buttonHref = slide.buttonUrl ? sanitizeNavigationUrl(slide.buttonUrl, '') : '';

    return (
      <div
        key={keySuffix}
        aria-hidden={isHiddenForMotionExit || undefined}
        style={{ animationDuration: `${transitionMs}ms` }}
        className={`absolute inset-0 h-full w-full overflow-hidden ${roleClass}`}
      >
        <ResilientImage
          src={slide.imageUrl}
          alt={slide.altText || slide.title || 'Featured promotion'}
          loading="eager"
          className={`h-full w-full ${fitClass} ${focalClass}`}
        />

        {hasTextOverlay && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[66%] bg-gradient-to-t from-[#071B3A]/95 via-[#071B3A]/65 to-transparent" />
        )}

        {hasTextOverlay && (
          <div
            className={`pointer-events-auto absolute inset-x-0 bottom-0 z-10 text-white ${
              compact ? 'px-3.5 pb-3 pt-6' : 'px-4 pb-3.5 pt-8'
            }`}
          >
            {slide.subtitle && (
              <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-100 backdrop-blur-xs">
                {slide.subtitle}
              </span>
            )}
            {slide.title && (
              <h4
                className={`font-display mt-1 font-bold leading-tight text-white ${
                  compact ? 'text-sm' : 'text-[15px]'
                }`}
              >
                {slide.title}
              </h4>
            )}
            {slide.description && !compact && (
              <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-slate-200">{slide.description}</p>
            )}
            {slide.buttonText && buttonHref && (
              <div className="mt-2">
                {slide.target === '_blank' ? (
                  <a
                    href={buttonHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={onNavigate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#145CFF] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0E47D9]"
                  >
                    <span>{slide.buttonText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <Link
                    to={buttonHref}
                    onClick={onNavigate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#145CFF] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0E47D9]"
                  >
                    <span>{slide.buttonText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="mega-menu-slider"
      data-active-index={safeCurrentIdx}
      data-slide-count={totalSlides}
      data-direction={direction}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNext();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrev();
        }
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotional highlights"
      className="group relative overflow-hidden rounded-2xl border border-[#DCE5F5] bg-[#0B1730] shadow-xs"
    >
      {/* Strictly Single-Image Viewport Frame */}
      <div className={`relative w-full overflow-hidden ${aspectClass}`}>
        {exitingSlide &&
          renderSlideFrame(
            exitingSlide,
            direction === 'next' ? 'novara-slide-exit-next z-0' : 'novara-slide-exit-prev z-0',
            `exit-${exitingIdx}-${transitionKey}`,
            true,
          )}
        {renderSlideFrame(
          currentSlide,
          exitingSlide
            ? direction === 'next'
              ? 'novara-slide-enter-next z-10'
              : 'novara-slide-enter-prev z-10'
            : 'z-10',
          `active-${currentSlide.id || safeCurrentIdx}-${transitionKey}`,
        )}

        {/* Navigation Arrows (placed cleanly in upper frame so they never collide with bottom captions) */}
        {showArrows && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous slide"
              className="absolute left-2.5 top-[30%] z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-[#071B3A]/75 text-white shadow-sm backdrop-blur-xs transition-all hover:bg-[#145CFF] focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next slide"
              className="absolute right-2.5 top-[30%] z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-[#071B3A]/75 text-white shadow-sm backdrop-blur-xs transition-all hover:bg-[#145CFF] focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Slide Index Badge (top-right, minimal when multiple slides) */}
        {totalSlides > 1 && (
          <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 rounded-full bg-[#071B3A]/70 px-2 py-0.5 font-mono-tabular text-[10px] font-semibold text-white/95 backdrop-blur-xs">
            {safeCurrentIdx + 1} / {totalSlides}
          </div>
        )}
      </div>

      {/* Pagination Dots */}
      {showIndicators && (
        <div className="flex items-center justify-center gap-1.5 bg-[#09152E] px-3 py-2">
          {activeSlides.map((sl, idx) => {
            const active = idx === safeCurrentIdx;
            return (
              <button
                key={sl.id || idx}
                type="button"
                aria-label={`Go to slide ${idx + 1}`}
                aria-current={active ? 'true' : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  goToIndex(idx, idx >= safeCurrentIdx ? 'next' : 'prev');
                }}
                className={`h-1.5 rounded-full transition-all ${
                  active ? 'w-5 bg-[#4B84FF]' : 'w-1.5 bg-white/35 hover:bg-white/65'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
