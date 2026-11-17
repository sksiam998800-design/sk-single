import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  buildBackgroundLayerStyle,
  buildOverlayCss,
  getBannerGridColSpanClass,
  getCustomColSpanValue,
  normalizeBannerFromApi,
  resolveBannerHeights,
  sortBannersByOrder,
  type BannerButtonConfig,
  type DynamicBannerConfig,
} from '../../lib/bannerBuilder';

const SHADOW_CLASS_MAP: Record<string, string> = {
  none: 'shadow-none',
  sm: 'shadow-xs',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

const HOVER_CONTAINER_CLASS: Record<string, string> = {
  none: '',
  lift: 'transition-transform duration-300 hover:-translate-y-0.5',
  zoom_image: 'group',
  glow: 'transition-shadow duration-300 hover:shadow-blue-500/20 hover:shadow-xl',
};

const BUTTON_HOVER_ANIM: Record<string, string> = {
  none: '',
  lift: 'hover:-translate-y-0.5',
  scale: 'hover:scale-[1.03]',
  slide: 'group/btn',
};

const ENTRANCE_ANIM_CLASS: Record<string, string> = {
  none: '',
  fade_in: 'banner-anim-fade-in',
  slide_up: 'banner-anim-slide-up',
  zoom_subtle: 'banner-anim-zoom-subtle',
};

const ALIGN_BASE: Record<'left' | 'center' | 'right', string> = {
  left: 'items-start text-left mr-auto',
  center: 'items-center text-center mx-auto',
  right: 'items-end text-right ml-auto',
};
const ALIGN_MD: Record<'left' | 'center' | 'right', string> = {
  left: 'md:items-start md:text-left md:ml-0 md:mr-auto',
  center: 'md:items-center md:text-center md:mx-auto',
  right: 'md:items-end md:text-right md:mr-0 md:ml-auto',
};
const ALIGN_LG: Record<'left' | 'center' | 'right', string> = {
  left: 'lg:items-start lg:text-left lg:ml-0 lg:mr-auto',
  center: 'lg:items-center lg:text-center lg:mx-auto',
  right: 'lg:items-end lg:text-right lg:mr-0 lg:ml-auto',
};
const BTN_BASE: Record<'left' | 'center' | 'right', string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};
const BTN_MD: Record<'left' | 'center' | 'right', string> = {
  left: 'md:justify-start',
  center: 'md:justify-center',
  right: 'md:justify-end',
};
const BTN_LG: Record<'left' | 'center' | 'right', string> = {
  left: 'lg:justify-start',
  center: 'lg:justify-center',
  right: 'lg:justify-end',
};

interface DynamicBannerButtonProps {
  config: BannerButtonConfig;
  previewMode?: boolean;
}

const DynamicBannerButton: React.FC<DynamicBannerButtonProps> = ({ config, previewMode }) => {
  const [hovered, setHovered] = useState(false);

  if (!config.text?.trim()) return null;

  const isOutline = config.style === 'outline';
  const isGhost = config.style === 'ghost';

  const baseBg = isOutline || isGhost ? 'transparent' : config.bgColor || '#145CFF';
  const activeBg = hovered
    ? config.hoverBgColor || (isOutline || isGhost ? 'rgba(20, 92, 255, 0.08)' : '#0E47D9')
    : baseBg;
  const activeText = hovered ? config.hoverTextColor || config.textColor : config.textColor;

  const style: React.CSSProperties = {
    backgroundColor: activeBg,
    color: activeText || '#FFFFFF',
    borderColor: isGhost ? 'transparent' : config.borderColor || config.bgColor || '#145CFF',
    borderWidth: isGhost ? 0 : 1,
    borderStyle: 'solid',
    borderRadius: `${config.borderRadius ?? 999}px`,
    paddingLeft: `${config.paddingX ?? 22}px`,
    paddingRight: `${config.paddingX ?? 22}px`,
    paddingTop: `${config.paddingY ?? 10}px`,
    paddingBottom: `${config.paddingY ?? 10}px`,
    fontSize: `${config.fontSize ?? 13}px`,
    fontWeight: config.fontWeight ?? 600,
  };

  const animClass = BUTTON_HOVER_ANIM[config.hoverAnimation || 'none'] || '';
  const content = (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span>{config.text}</span>
      <ArrowRight
        className={`h-3.5 w-3.5 transition-transform duration-200 ${
          config.hoverAnimation === 'slide' && hovered ? 'translate-x-0.5' : ''
        }`}
      />
    </span>
  );

  if (previewMode) {
    return (
      <span
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={style}
        className={`inline-flex cursor-pointer items-center justify-center transition-all duration-200 ${animClass}`}
      >
        {content}
      </span>
    );
  }

  const url = config.url || '/shop';
  const isExternal = url.startsWith('http://') || url.startsWith('https://');
  if (isExternal) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={style}
        className={`inline-flex items-center justify-center transition-all duration-200 ${animClass}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      to={url}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
      className={`inline-flex items-center justify-center transition-all duration-200 ${animClass}`}
    >
      {content}
    </Link>
  );
};

export interface DynamicBannerRendererProps {
  banner: DynamicBannerConfig | Partial<DynamicBannerConfig> | Record<string, unknown>;
  viewportOverride?: 'desktop' | 'tablet' | 'mobile';
  previewMode?: boolean;
  className?: string;
}

export const DynamicBannerRenderer: React.FC<DynamicBannerRendererProps> = ({
  banner: rawBanner,
  viewportOverride,
  previewMode = false,
  className = '',
}) => {
  const banner = useMemo<DynamicBannerConfig>(() => {
    const raw = rawBanner as DynamicBannerConfig;
    if (raw.gradientConfig && raw.typographySettings && raw.buttonSettings?.primary && raw.contentSettings) {
      return raw;
    }
    return normalizeBannerFromApi(rawBanner as Record<string, unknown>);
  }, [rawBanner]);

  const isMobilePreview = viewportOverride === 'mobile';
  const isTabletPreview = viewportOverride === 'tablet';

  const bgLayer = buildBackgroundLayerStyle(banner);
  const overlayCss = buildOverlayCss(banner.overlaySettings);
  const showImage =
    banner.backgroundType === 'image' ||
    banner.backgroundType === 'gradient_image' ||
    banner.backgroundType === 'image_overlay';

  const activeImageUrl = isMobilePreview
    ? banner.mobileImageUrl || banner.desktopImageUrl
    : banner.desktopImageUrl || banner.mobileImageUrl;

  const horizontalAlign = isMobilePreview
    ? banner.contentSettings.mobileHorizontalAlign
    : isTabletPreview
      ? banner.contentSettings.tabletHorizontalAlign
      : banner.contentSettings.horizontalAlign;

  const justifyContentClass = viewportOverride
    ? ALIGN_BASE[horizontalAlign || 'left']
    : `${ALIGN_BASE[banner.contentSettings.mobileHorizontalAlign || 'left']} ${ALIGN_MD[banner.contentSettings.tabletHorizontalAlign || banner.contentSettings.horizontalAlign || 'left']} ${ALIGN_LG[banner.contentSettings.horizontalAlign || 'left']}`;

  const verticalAlignClass =
    banner.contentSettings.verticalAlign === 'top'
      ? 'justify-start'
      : banner.contentSettings.verticalAlign === 'bottom'
        ? 'justify-end'
        : 'justify-center';

  const resolvedHeights = resolveBannerHeights(banner.contentSettings);
  const explicitOverrideMinHeight = isMobilePreview
    ? resolvedHeights.mobile
    : isTabletPreview
      ? resolvedHeights.tablet
      : viewportOverride === 'desktop'
        ? resolvedHeights.desktop
        : undefined;

  const focalX = banner.imageSettings?.focalPoint?.x ?? 50;
  const focalY = banner.imageSettings?.focalPoint?.y ?? 50;
  const imgOpacity = Math.max(0, Math.min(1, Number(banner.imageSettings?.opacity ?? 100) / 100));

  const titleScale = isMobilePreview ? 0.72 : isTabletPreview ? 0.86 : 1;
  const computedTitleSize = Math.max(18, Math.round((banner.typographySettings.titleFontSize || 36) * titleScale));
  const computedSubtitleSize = Math.max(12, Math.round((banner.typographySettings.subtitleFontSize || 15) * (isMobilePreview ? 0.9 : 1)));

  const shadowClass = SHADOW_CLASS_MAP[banner.styleSettings?.boxShadow || 'sm'] || 'shadow-xs';
  const hoverClass = HOVER_CONTAINER_CLASS[banner.styleSettings?.hoverEffect || 'none'] || '';
  const entranceClass = ENTRANCE_ANIM_CLASS[banner.styleSettings?.animation || 'none'] || '';

  const buttonGroupJustify = viewportOverride
    ? BTN_BASE[horizontalAlign || 'left']
    : `${BTN_BASE[banner.contentSettings.mobileHorizontalAlign || 'left']} ${BTN_MD[banner.contentSettings.tabletHorizontalAlign || banner.contentSettings.horizontalAlign || 'left']} ${BTN_LG[banner.contentSettings.horizontalAlign || 'left']}`;

  const containerStyle: React.CSSProperties = {
    ...(explicitOverrideMinHeight
      ? { minHeight: explicitOverrideMinHeight }
      : ({
          '--banner-h-mobile': resolvedHeights.mobile,
          '--banner-h-tablet': resolvedHeights.tablet,
          '--banner-h-desktop': resolvedHeights.desktop,
        } as React.CSSProperties)),
    borderRadius: `${banner.styleSettings?.borderRadius ?? 16}px`,
    borderWidth: banner.styleSettings?.borderStyle === 'none' ? 0 : `${banner.styleSettings?.borderWidth ?? 1}px`,
    borderStyle: banner.styleSettings?.borderStyle === 'none' ? 'none' : banner.styleSettings?.borderStyle || 'solid',
    borderColor: banner.styleSettings?.borderColor || '#DCE6F7',
    backgroundColor: bgLayer.backgroundColor,
    backgroundImage: bgLayer.backgroundImage,
  };

  return (
    <div
      style={containerStyle}
      className={`relative flex w-full overflow-hidden ${!explicitOverrideMinHeight ? 'banner-responsive-height' : ''} ${shadowClass} ${hoverClass} ${entranceClass} ${className}`}
    >
      {/* Background image layer */}
      {showImage && activeImageUrl && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 overflow-hidden ${
            banner.styleSettings?.hoverEffect === 'zoom_image'
              ? 'transition-transform duration-500 group-hover:scale-105'
              : ''
          }`}
          style={{ opacity: imgOpacity }}
        >
          {banner.imageSettings?.repeat && banner.imageSettings.repeat !== 'no-repeat' ? (
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `url(${activeImageUrl})`,
                backgroundRepeat: banner.imageSettings.repeat,
                backgroundPosition: `${focalX}% ${focalY}%`,
                backgroundSize: banner.imageSettings.objectFit === 'contain' ? 'contain' : 'auto',
              }}
            />
          ) : (
            <img
              src={activeImageUrl}
              alt={banner.title}
              className="h-full w-full"
              style={{
                objectFit: banner.imageSettings?.objectFit === 'auto' ? 'cover' : banner.imageSettings?.objectFit || 'cover',
                objectPosition: `${focalX}% ${focalY}%`,
              }}
            />
          )}
        </div>
      )}

      {/* Overlay layer */}
      {overlayCss !== 'none' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: overlayCss }}
        />
      )}

      {/* Subtle decorative glow */}
      {banner.styleSettings?.decorativeGlow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/20 blur-2xl"
        />
      )}

      {/* Content Layer */}
      <div
        className={`relative z-10 flex w-full flex-col ${verticalAlignClass}`}
        style={{
          paddingLeft: `${isMobilePreview ? Math.min(20, banner.contentSettings.paddingX) : banner.contentSettings.paddingX}px`,
          paddingRight: `${isMobilePreview ? Math.min(20, banner.contentSettings.paddingX) : banner.contentSettings.paddingX}px`,
          paddingTop: `${banner.contentSettings.paddingY}px`,
          paddingBottom: `${banner.contentSettings.paddingY}px`,
        }}
      >
        <div
          className={`flex flex-col ${justifyContentClass} ${viewportOverride ? '' : 'w-full md:w-[var(--banner-content-w)]'}`}
          style={{
            ...(viewportOverride
              ? { width: isMobilePreview ? '100%' : banner.contentSettings.contentWidth || '58%' }
              : ({ '--banner-content-w': banner.contentSettings.contentWidth || '58%' } as React.CSSProperties)),
            maxWidth: `${banner.contentSettings.maxWidthPx || 540}px`,
            gap: `${banner.contentSettings.elementSpacing ?? 12}px`,
          }}
        >
          {/* Eyebrow / Promo Badges */}
          {banner.styleSettings?.decorativeBadge !== false && (banner.eyebrow || banner.promoLabel) && (
            <div className={`flex flex-wrap items-center gap-2 ${buttonGroupJustify}`}>
              {banner.eyebrow && (
                <span className="inline-flex items-center rounded-full bg-[#145CFF] px-3 py-1 text-[11px] font-bold tracking-wide text-white shadow-xs">
                  {banner.eyebrow}
                </span>
              )}
              {banner.promoLabel && (
                <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-[#0A1F44] shadow-xs ring-1 ring-slate-200/70">
                  {banner.promoLabel}
                </span>
              )}
            </div>
          )}

          {/* Headline + Highlighted Text */}
          <h3
            style={{
              fontFamily: banner.typographySettings.titleFontFamily || 'Outfit, sans-serif',
              fontSize: `${computedTitleSize}px`,
              fontWeight: banner.typographySettings.titleFontWeight || 800,
              lineHeight: banner.typographySettings.lineHeight || 1.15,
              letterSpacing: `${banner.typographySettings.letterSpacing ?? -0.02}em`,
              textTransform: banner.typographySettings.textTransform || 'none',
              color: banner.typographySettings.titleColor || '#0A1F44',
              textShadow:
                banner.typographySettings.textShadow && banner.typographySettings.textShadow !== 'none'
                  ? banner.typographySettings.textShadow
                  : undefined,
            }}
            className="text-balance"
          >
            <span>{banner.title}</span>
            {banner.highlightedTitle && (
              <span
                className="block"
                style={{ color: banner.typographySettings.highlightColor || '#145CFF' }}
              >
                {banner.highlightedTitle}
              </span>
            )}
          </h3>

          {/* Subtitle */}
          {banner.subtitle && (
            <p
              style={{
                fontFamily: banner.typographySettings.subtitleFontFamily || 'Plus Jakarta Sans, sans-serif',
                fontSize: `${computedSubtitleSize}px`,
                fontWeight: banner.typographySettings.subtitleFontWeight || 500,
                color: banner.typographySettings.subtitleColor || '#475569',
              }}
              className="leading-relaxed"
            >
              {banner.subtitle}
            </p>
          )}

          {/* Optional extended description */}
          {banner.description && (
            <p
              style={{
                fontSize: `${banner.typographySettings.descriptionFontSize || 13}px`,
                color: banner.typographySettings.descriptionColor || '#64748B',
              }}
              className="leading-relaxed"
            >
              {banner.description}
            </p>
          )}

          {/* CTA Buttons */}
          {(banner.buttonSettings.primary.text || banner.buttonSettings.secondary.text) && (
            <div className={`mt-1 flex flex-wrap items-center gap-2.5 ${buttonGroupJustify}`}>
              <DynamicBannerButton config={banner.buttonSettings.primary} previewMode={previewMode} />
              <DynamicBannerButton config={banner.buttonSettings.secondary} previewMode={previewMode} />
            </div>
          )}

          {/* Optional caption */}
          {banner.caption && (
            <p
              style={{ color: banner.typographySettings.descriptionColor || '#64748B' }}
              className="text-[11px] font-medium opacity-85"
            >
              {banner.caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

interface DynamicBannerGroupProps {
  banners: Array<DynamicBannerConfig | Partial<DynamicBannerConfig> | Record<string, unknown>>;
  className?: string;
}

export const DynamicBannerGroup: React.FC<DynamicBannerGroupProps> = ({ banners, className = '' }) => {
  const sorted = useMemo(() => sortBannersByOrder(banners as DynamicBannerConfig[]), [banners]);
  if (sorted.length === 0) return null;

  const firstNormalized = normalizeBannerFromApi(sorted[0] as unknown as Record<string, unknown>);
  const colGap = firstNormalized.layoutSettings?.columnGap ?? 16;
  const rowGap = firstNormalized.layoutSettings?.rowGap ?? 16;

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-12 ${className}`}
      style={{ columnGap: `${colGap}px`, rowGap: `${rowGap}px` }}
    >
      {sorted.map((raw, idx) => {
        const item = normalizeBannerFromApi(raw as unknown as Record<string, unknown>);
        const spanClass = getBannerGridColSpanClass(item.widthMode);
        const visDesktop = item.layoutSettings?.visibleOnDesktop !== false;
        const visTablet = item.layoutSettings?.visibleOnTablet !== false;
        const visMobile = item.layoutSettings?.visibleOnMobile !== false;

        const visibilityClasses = [
          visMobile ? 'block' : 'hidden',
          visTablet ? 'md:block' : 'md:hidden',
          visDesktop ? 'lg:block' : 'lg:hidden',
        ].join(' ');

        const customWidthStyle =
          item.widthMode === 'custom'
            ? ({ '--banner-span': getCustomColSpanValue(item.customWidthPercent) } as React.CSSProperties)
            : undefined;

        return (
          <div
            key={item.id || `${item.title}-${idx}`}
            className={`${item.widthMode === 'custom' ? 'banner-custom-col' : spanClass} ${visibilityClasses}`}
            style={customWidthStyle}
          >
            <DynamicBannerRenderer banner={item} />
          </div>
        );
      })}
    </div>
  );
};
