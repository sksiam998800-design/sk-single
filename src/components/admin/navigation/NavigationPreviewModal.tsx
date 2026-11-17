import { useState } from 'react';
import { ArrowRight, Monitor, Smartphone, X } from 'lucide-react';
import type { NavigationMenuConfig, NavigationPromotionConfig } from '../../../lib/navigationEngine';
import { NavIcon } from '../../navigation/NavIcon';
import { MegaMenuSlider } from '../../navigation/MegaMenuSlider';
import { ResilientImage } from '../../ui/ResilientImage';

interface NavigationPreviewModalProps {
  menu: NavigationMenuConfig;
  onClose: () => void;
}

const PREVIEW_PROMO_THEMES: Record<NavigationPromotionConfig['theme'], string> = {
  'royal-blue': 'bg-gradient-to-br from-[#1155EE] to-[#0B39A8] text-white border-[#1155EE]',
  'ice-blue': 'bg-gradient-to-br from-[#EEF4FF] to-[#DCE8FF] text-[#0F1D3A] border-[#C7DAFF]',
  'midnight-navy': 'bg-gradient-to-br from-[#0B1730] to-[#172B56] text-white border-[#1D3566]',
};

export function NavigationPreviewModal({ menu, onClose }: NavigationPreviewModalProps) {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');

  const activeGroups = menu.groups.filter((g) => g.isActive);
  const activeSlides = menu.settings.showSlider
    ? menu.slides.filter((s) => s.isActive && Boolean(s.imageUrl))
    : [];
  const activePromos = menu.settings.showPromotions
    ? menu.promotions.filter((p) => p.isActive && Boolean(p.title || p.imageUrl))
    : [];
  const hasPromoSidebar = activeSlides.length > 0 || activePromos.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${menu.label} Mega Menu`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#DCE5F5] bg-[#F4F7FF] shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#145CFF]">Pre-Publish Preview</p>
            <h3 className="font-display text-lg font-extrabold text-[#0F1D3A]">
              {menu.label} ({menu.type.replace('_', ' ')})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  viewportMode === 'desktop' ? 'bg-white text-[#145CFF] shadow-xs' : 'text-slate-600'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  viewportMode === 'mobile' ? 'bg-white text-[#145CFF] shadow-xs' : 'text-slate-600'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Simulated Storefront Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewportMode === 'desktop' ? (
            <div className="mx-auto max-w-5xl space-y-3">
              {/* Simulated Header Strip */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-xs">
                <span className="font-display text-sm font-extrabold text-[#0F1D3A]">NOVARA</span>
                <div className="h-4 w-px bg-slate-200" />
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF4FF] px-3 py-1.5 text-xs font-bold text-[#1155EE]">
                  {menu.settings.showIcons && <NavIcon name={menu.icon} className="h-3.5 w-3.5" />}
                  <span>{menu.label}</span>
                  {menu.badgeText && (
                    <span className="rounded bg-[#1155EE] px-1.5 py-0.5 text-[9px] text-white">
                      {menu.badgeText}
                    </span>
                  )}
                </span>
              </div>

              {/* Simulated Mega Menu Panel */}
              {menu.type === 'link' || (activeGroups.length === 0 && !hasPromoSidebar) ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  {menu.type === 'link'
                    ? `Direct link menu pointing to ${menu.url}. Switch Menu Type to "Mega Menu" or "Dropdown" to add columns and promotional sliders.`
                    : 'No active dropdown groups, slides, or promotions configured yet.'}
                </div>
              ) : (
                <div
                  style={{ maxHeight: `${Math.min(540, menu.settings.maxHeightPx)}px` }}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#DCE5F5] bg-white shadow-xl lg:flex-row"
                >
                  {activeGroups.length > 0 && (
                    <div className="novara-mega-scroll flex-1 overflow-y-auto p-5">
                      <div
                        className={`grid gap-6 ${
                          activeGroups.length >= 3
                            ? 'grid-cols-3'
                            : activeGroups.length === 2
                              ? 'grid-cols-2'
                              : 'grid-cols-1'
                        }`}
                      >
                        {activeGroups.map((grp) => (
                          <div key={grp.id} className="space-y-2">
                            <p className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 text-xs font-bold uppercase tracking-wider text-[#0F1D3A]">
                              {menu.settings.showIcons && <NavIcon name={grp.icon} className="h-3.5 w-3.5 text-[#1155EE]" />}
                              <span>{grp.title}</span>
                            </p>
                            <ul className="space-y-1">
                              {grp.items
                                .filter((i) => i.isActive)
                                .map((item) => (
                                  <li
                                    key={item.id}
                                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-[#F5F8FF]"
                                  >
                                    {menu.settings.showIcons && item.visibilitySettings.showIcon && (
                                      <NavIcon name={item.icon} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1155EE]" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-[#0F1D3A]">{item.label}</p>
                                      {menu.settings.showDescriptions &&
                                        item.visibilitySettings.showDescription &&
                                        item.description && (
                                          <p className="text-[11px] text-slate-500">{item.description}</p>
                                        )}
                                    </div>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasPromoSidebar && (
                    <div
                      className={`novara-mega-scroll shrink-0 space-y-3 overflow-y-auto border-l border-slate-100 bg-[#F8FAFF] p-4 ${
                        activeGroups.length > 0 ? 'w-[330px]' : 'w-full max-w-md mx-auto'
                      }`}
                    >
                      {activeSlides.length > 0 && (
                        <MegaMenuSlider slides={activeSlides} settings={menu.settings.sliderSettings} />
                      )}
                      {activePromos.map((promo) => {
                        const themeClass = PREVIEW_PROMO_THEMES[promo.theme] || PREVIEW_PROMO_THEMES['royal-blue'];
                        const isIce = promo.theme === 'ice-blue';
                        return (
                          <div key={promo.id} className={`rounded-2xl border p-3.5 shadow-xs ${themeClass}`}>
                            {promo.imageUrl && (
                              <div className="mb-2 h-20 overflow-hidden rounded-xl">
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
                            <p className="font-display mt-1.5 text-sm font-bold leading-snug">{promo.title}</p>
                            {promo.subtitle && (
                              <p className={`mt-1 text-xs leading-relaxed ${isIce ? 'text-slate-600' : 'text-blue-100'}`}>
                                {promo.subtitle}
                              </p>
                            )}
                            {promo.ctaText && (
                              <span
                                className={`mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                  isIce ? 'bg-[#1155EE] text-white' : 'bg-white text-[#0F1D3A]'
                                }`}
                              >
                                <span>{promo.ctaText}</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto w-[375px] overflow-hidden rounded-2xl border border-slate-300 bg-white p-4 shadow-xl">
              <div className="mb-3 border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Mobile Drawer Preview (375px)
              </div>
              <div className="space-y-3">
                <div className="rounded-xl bg-[#F8FAFF] px-3 py-2 text-sm font-bold text-[#0F1D3A]">
                  {menu.label}
                </div>
                {activeGroups.map((grp) => (
                  <div key={grp.id} className="space-y-1 pl-2">
                    <p className="text-[11px] font-bold uppercase text-slate-500">{grp.title}</p>
                    {grp.items
                      .filter((i) => i.isActive && i.visibilitySettings.mobileVisible)
                      .map((it) => (
                        <div key={it.id} className="rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs font-medium text-[#0F1D3A]">
                          {it.label}
                        </div>
                      ))}
                  </div>
                ))}
                {activeSlides.length > 0 && (
                  <MegaMenuSlider slides={activeSlides} settings={menu.settings.sliderSettings} compact />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
