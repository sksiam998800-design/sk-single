import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, X } from 'lucide-react';
import {
  computeMegaMenuGeometry,
  sanitizeNavigationUrl,
  type MegaMenuGeometryResult,
  type NavigationMenuConfig,
  type NavigationPromotionConfig,
} from '../../lib/navigationEngine';
import { NavIcon } from './NavIcon';
import { MegaMenuSlider } from './MegaMenuSlider';
import { ResilientImage } from '../ui/ResilientImage';

interface MegaMenuPortalProps {
  menu: NavigationMenuConfig;
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onMouseEnterPanel: () => void;
  onMouseLeavePanel: () => void;
}

const PROMO_THEME_CLASSES: Record<NavigationPromotionConfig['theme'], string> = {
  'royal-blue': 'bg-gradient-to-br from-[#1155EE] to-[#0B39A8] text-white border-[#1155EE]',
  'ice-blue': 'bg-gradient-to-br from-[#EEF4FF] to-[#DCE8FF] text-[#0F1D3A] border-[#C7DAFF]',
  'midnight-navy': 'bg-gradient-to-br from-[#0B1730] to-[#172B56] text-white border-[#1D3566]',
};

export function MegaMenuPortal({
  menu,
  triggerRef,
  onClose,
  onMouseEnterPanel,
  onMouseLeavePanel,
}: MegaMenuPortalProps) {
  const activeGroups = menu.groups.filter((g) => g.isActive && (g.items.length > 0 || Boolean(g.url)));
  const activeSlides = menu.settings.showSlider
    ? menu.slides.filter((s) => s.isActive && Boolean(s.imageUrl))
    : [];
  const activePromotions = menu.settings.showPromotions
    ? menu.promotions.filter((p) => p.isActive && Boolean(p.title || p.imageUrl))
    : [];
  const hasPromoSidebar = activeSlides.length > 0 || activePromotions.length > 0;

  const [geometry, setGeometry] = useState<MegaMenuGeometryResult>(() => ({
    top: 136,
    left: 16,
    width: 1120,
    maxHeight: 520,
    effectiveColumns: Math.max(1, Math.min(3, activeGroups.length || 1)),
  }));

  const updateGeometry = () => {
    const triggerEl = triggerRef.current;
    const rect = triggerEl
      ? triggerEl.getBoundingClientRect()
      : { left: 48, right: 200, top: 96, bottom: 132, width: 152 };
    const next = computeMegaMenuGeometry({
      triggerRect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
      },
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      menuWidth: menu.settings.menuWidth,
      alignment: menu.settings.alignment,
      adminMaxHeightPx: menu.settings.maxHeightPx,
      configuredColumns: menu.settings.columns,
      groupCount: Math.max(1, activeGroups.length),
      hasPromoSidebar,
    });
    setGeometry(next);
  };

  useLayoutEffect(() => {
    updateGeometry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.id, menu.settings.alignment, menu.settings.menuWidth, menu.settings.maxHeightPx, menu.settings.columns, activeGroups.length, hasPromoSidebar]);

  useEffect(() => {
    const onResizeOrScroll = () => updateGeometry();
    window.addEventListener('resize', onResizeOrScroll, { passive: true });
    window.addEventListener('scroll', onResizeOrScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.id, hasPromoSidebar]);

  // If neither groups nor promo content exists, nothing should render
  if (activeGroups.length === 0 && !hasPromoSidebar) {
    return null;
  }

  const menuUrl = sanitizeNavigationUrl(menu.url, '/shop');
  const gridColClass =
    geometry.effectiveColumns >= 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : geometry.effectiveColumns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : geometry.effectiveColumns === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-1';

  const headerBarHeight = 46;
  const scrollAreaMaxHeight = Math.max(160, geometry.maxHeight - headerBarHeight - 16);

  const panel = (
    <div
      data-testid="mega-menu-portal"
      data-menu-slug={menu.slug}
      role="region"
      aria-label={`${menu.label} navigation menu`}
      onMouseEnter={onMouseEnterPanel}
      onMouseLeave={onMouseLeavePanel}
      style={{
        position: 'fixed',
        top: `${geometry.top}px`,
        left: `${geometry.left}px`,
        width: `${geometry.width}px`,
        maxHeight: `${geometry.maxHeight}px`,
        zIndex: 60,
      }}
      className="novara-mega-panel-in flex flex-col overflow-hidden rounded-2xl border border-[#DCE5F5] bg-white shadow-[0_24px_60px_-15px_rgba(7,27,58,0.22)]"
    >
      {/* Top Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-[#F8FAFF] px-5 py-2.5">
        <div className="flex items-center gap-2">
          {menu.settings.showIcons && menu.icon && (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#E9F0FD] text-[#1155EE]">
              <NavIcon name={menu.icon} className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="font-display text-sm font-bold text-[#0F1D3A]">{menu.label}</span>
          {menu.badgeText && (
            <span className="rounded-md bg-[#1155EE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {menu.badgeText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {menu.openInNewTab ? (
            <a
              href={menuUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1155EE] hover:underline"
            >
              <span>Browse {menu.label}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <Link
              to={menuUrl}
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1155EE] hover:underline"
            >
              <span>Browse {menu.label}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${menu.label} menu`}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Split: Scrollable Category Grid + Optional Promotional Sidebar */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {activeGroups.length > 0 && (
          <div
            data-testid="mega-menu-links-scroll"
            style={{ maxHeight: `${scrollAreaMaxHeight}px` }}
            className="novara-mega-scroll min-h-0 flex-1 overflow-y-auto p-5"
          >
            <div className={`grid gap-x-6 gap-y-6 ${gridColClass}`}>
              {activeGroups.map((group) => {
                const groupUrl = group.url ? sanitizeNavigationUrl(group.url, '') : '';
                return (
                  <div key={group.id || group.slug} className="min-w-0 space-y-2.5">
                    <div className="border-b border-slate-100 pb-2">
                      {groupUrl ? (
                        <Link
                          to={groupUrl}
                          onClick={onClose}
                          className="group/hdr flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F1D3A] hover:text-[#1155EE]"
                        >
                          {menu.settings.showIcons && group.icon && (
                            <NavIcon name={group.icon} className="h-3.5 w-3.5 text-[#1155EE]" />
                          )}
                          <span className="truncate">{group.title}</span>
                          <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover/hdr:opacity-100" />
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F1D3A]">
                          {menu.settings.showIcons && group.icon && (
                            <NavIcon name={group.icon} className="h-3.5 w-3.5 text-[#1155EE]" />
                          )}
                          <span className="truncate">{group.title}</span>
                        </div>
                      )}
                      {menu.settings.showDescriptions && group.description && (
                        <p className="mt-0.5 text-[11px] text-slate-500">{group.description}</p>
                      )}
                    </div>

                    <ul className="space-y-1">
                      {group.items.map((item) => {
                        const showItemIcon =
                          menu.settings.showIcons && item.visibilitySettings.showIcon && Boolean(item.icon);
                        const showItemDesc =
                          menu.settings.showDescriptions &&
                          item.visibilitySettings.showDescription &&
                          Boolean(item.description);
                        const safeHref = sanitizeNavigationUrl(item.url, '/shop');

                        const inner = (
                          <div className="flex items-start gap-2.5">
                            {showItemIcon && (
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F4F7FE] text-[#1155EE] transition-colors group-hover/link:bg-[#1155EE] group-hover/link:text-white">
                                <NavIcon name={item.icon} className="h-3.5 w-3.5" />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-[13px] font-semibold text-[#0F1D3A] group-hover/link:text-[#1155EE]">
                                  {item.label}
                                </span>
                                {item.badgeText && (
                                  <span className="shrink-0 rounded bg-[#E9F0FD] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#1155EE]">
                                    {item.badgeText}
                                  </span>
                                )}
                                {item.target === '_blank' && (
                                  <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                                )}
                              </div>
                              {showItemDesc && (
                                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );

                        return (
                          <li key={item.id || item.slug}>
                            {item.target === '_blank' ? (
                              <a
                                href={safeHref}
                                target="_blank"
                                rel="noreferrer"
                                onClick={onClose}
                                className="group/link block rounded-xl px-2.5 py-2 transition-colors hover:bg-[#F5F8FF]"
                              >
                                {inner}
                              </a>
                            ) : (
                              <Link
                                to={safeHref}
                                onClick={onClose}
                                className="group/link block rounded-xl px-2.5 py-2 transition-colors hover:bg-[#F5F8FF]"
                              >
                                {inner}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Promotional Sidebar — Strictly Hidden When Nothing Is Configured */}
        {hasPromoSidebar && (
          <aside
            data-testid="mega-menu-promo-sidebar"
            style={{ maxHeight: `${scrollAreaMaxHeight}px` }}
            className={`novara-mega-scroll shrink-0 space-y-3 overflow-y-auto border-t border-slate-100 bg-[#F8FAFF]/80 p-4 lg:border-l lg:border-t-0 ${
              activeGroups.length > 0 ? 'w-full lg:w-[320px] xl:w-[350px]' : 'w-full'
            }`}
          >
            {activeSlides.length > 0 && (
              <MegaMenuSlider
                slides={activeSlides}
                settings={menu.settings.sliderSettings}
                onNavigate={onClose}
              />
            )}

            {activePromotions.map((promo) => {
              const ctaHref = sanitizeNavigationUrl(promo.ctaUrl, '/shop');
              const themeClass = PROMO_THEME_CLASSES[promo.theme] || PROMO_THEME_CLASSES['royal-blue'];
              const isIce = promo.theme === 'ice-blue';
              return (
                <div
                  key={promo.id}
                  className={`overflow-hidden rounded-2xl border p-3.5 shadow-xs ${themeClass}`}
                >
                  {promo.imageUrl && (
                    <div className="mb-2.5 h-24 w-full overflow-hidden rounded-xl">
                      <ResilientImage
                        src={promo.imageUrl}
                        alt={promo.altText || promo.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  {promo.badgeText && (
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isIce ? 'bg-[#1155EE] text-white' : 'bg-white/15 text-blue-100'
                      }`}
                    >
                      {promo.badgeText}
                    </span>
                  )}
                  <h4 className="font-display mt-1.5 text-sm font-bold leading-snug">{promo.title}</h4>
                  {promo.subtitle && (
                    <p className={`mt-1 text-xs leading-relaxed ${isIce ? 'text-slate-600' : 'text-blue-100'}`}>
                      {promo.subtitle}
                    </p>
                  )}
                  {promo.ctaText && (
                    <Link
                      to={ctaHref}
                      onClick={onClose}
                      className={`mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isIce
                          ? 'bg-[#1155EE] text-white hover:bg-[#0B44CC]'
                          : 'bg-white text-[#0F1D3A] hover:bg-blue-50'
                      }`}
                    >
                      <span>{promo.ctaText}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              );
            })}
          </aside>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(panel, document.body) : panel;
}
