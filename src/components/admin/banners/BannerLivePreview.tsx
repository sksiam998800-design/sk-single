import React, { useEffect, useState } from 'react';
import {
  Eye,
  Link2,
  Maximize2,
  Minus,
  Monitor,
  Plus,
  Settings,
  Smartphone,
  Tablet,
  Type,
  X,
} from 'lucide-react';
import {
  BANNER_PLACEMENT_OPTIONS,
  type BannerPlacement,
  type BannerWidthMode,
  type DynamicBannerConfig,
} from '../../../lib/bannerBuilder';
import { DynamicBannerRenderer } from '../../banners/DynamicBannerRenderer';

interface BannerLivePreviewProps {
  banner: DynamicBannerConfig;
  onChange: (updater: (prev: DynamicBannerConfig) => DynamicBannerConfig) => void;
  expanded?: boolean;
}

export const BannerLivePreview: React.FC<BannerLivePreviewProps> = ({
  banner,
  onChange,
  expanded = false,
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [quickTab, setQuickTab] = useState<'content' | 'button' | 'advanced'>('content');
  const [activePreviewSlide, setActivePreviewSlide] = useState(0);

  useEffect(() => {
    if (!fullScreenOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setFullScreenOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [fullScreenOpen]);

  const widthContainerClass =
    viewport === 'mobile'
      ? 'max-w-[360px] mx-auto'
      : viewport === 'tablet'
        ? 'max-w-[600px] mx-auto'
        : 'w-full';

  const adjustFontSize = (field: 'titleFontSize' | 'subtitleFontSize', delta: number, min: number, max: number) => {
    onChange((prev) => ({
      ...prev,
      typographySettings: {
        ...prev.typographySettings,
        [field]: Math.max(min, Math.min(max, Number(prev.typographySettings[field] || 16) + delta)),
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Live Preview Stage */}
      <div className="rounded-2xl border border-[#E4EAF5] bg-gradient-to-b from-[#F4F8FF] to-[#EBF2FF] p-3.5 shadow-xs">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A1F44]">
            <Eye className="h-3.5 w-3.5 text-[#145CFF]" />
            <span>Live Preview</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Device Switcher */}
            <div className="inline-flex items-center rounded-lg border border-[#DCE6F7] bg-white p-0.5 shadow-2xs">
              {(
                [
                  { mode: 'desktop', label: 'Desktop preview', icon: Monitor },
                  { mode: 'tablet', label: 'Tablet preview', icon: Tablet },
                  { mode: 'mobile', label: 'Mobile preview', icon: Smartphone },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = viewport === item.mode;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    aria-label={item.label}
                    onClick={() => setViewport(item.mode)}
                    className={`rounded-md p-1.5 transition-colors ${
                      active ? 'bg-[#145CFF] text-white' : 'text-[#64748B] hover:text-[#0A1F44]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setFullScreenOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F7] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0A1F44] shadow-2xs hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Maximize2 className="h-3 w-3 text-[#145CFF]" />
              <span>Full Screen</span>
            </button>
          </div>
        </div>

        <div className={`transition-all duration-200 ${widthContainerClass}`}>
          <DynamicBannerRenderer
            banner={banner}
            viewportOverride={viewport}
            previewMode
          />
        </div>

        {/* Interactive Slider Dots (matching reference carousel preview) */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {[0, 1, 2, 3].map((dot) => (
            <button
              key={dot}
              type="button"
              aria-label={`Preview slide state ${dot + 1}`}
              onClick={() => setActivePreviewSlide(dot)}
              className={`h-2 rounded-full transition-all ${
                activePreviewSlide === dot
                  ? 'w-5 bg-[#145CFF]'
                  : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Quick Inline Editor + Text Style (matches bottom-right section of reference modal) */}
      {!expanded && (
        <div className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs">
          {/* Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-5 border-b border-[#E4EAF5] pb-2.5">
            <button
              type="button"
              onClick={() => setQuickTab('content')}
              className={`relative inline-flex items-center gap-1.5 text-xs font-bold pb-1 transition-colors ${
                quickTab === 'content' ? 'text-[#145CFF]' : 'text-[#64748B] hover:text-[#0A1F44]'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              <span>Banner Content</span>
              {quickTab === 'content' && (
                <span className="absolute -bottom-[11px] left-0 right-0 h-0.5 rounded-full bg-[#145CFF]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setQuickTab('button')}
              className={`relative inline-flex items-center gap-1.5 text-xs font-bold pb-1 transition-colors ${
                quickTab === 'button' ? 'text-[#145CFF]' : 'text-[#64748B] hover:text-[#0A1F44]'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Button Settings</span>
              {quickTab === 'button' && (
                <span className="absolute -bottom-[11px] left-0 right-0 h-0.5 rounded-full bg-[#145CFF]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setQuickTab('advanced')}
              className={`relative inline-flex items-center gap-1.5 text-xs font-bold pb-1 transition-colors ${
                quickTab === 'advanced' ? 'text-[#145CFF]' : 'text-[#64748B] hover:text-[#0A1F44]'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Advanced Settings</span>
              {quickTab === 'advanced' && (
                <span className="absolute -bottom-[11px] left-0 right-0 h-0.5 rounded-full bg-[#145CFF]" />
              )}
            </button>
          </div>

          {/* 2-Col Quick Split: Quick Fields on Left, Text Style Steppers on Right */}
          <div className="mt-3.5 grid grid-cols-1 xl:grid-cols-[1fr_230px] gap-4 items-start">
            {/* Left Quick Sub-tab Content */}
            <div className="space-y-3">
              {quickTab === 'content' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-[#0A1F44]">Title *</label>
                      <span className="font-mono-tabular text-[10px] text-[#94A3B8]">
                        {banner.title.length}/80
                      </span>
                    </div>
                    <input
                      value={banner.title}
                      onChange={(e) => onChange((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Smart Technology"
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs font-semibold text-[#0A1F44]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-[#0A1F44]">Subtitle</label>
                      <span className="font-mono-tabular text-[10px] text-[#94A3B8]">
                        {banner.subtitle.length}/120
                      </span>
                    </div>
                    <input
                      value={banner.subtitle}
                      onChange={(e) => onChange((p) => ({ ...p, subtitle: e.target.value }))}
                      placeholder="Discover the latest gadgets and upgrade your lifestyle with NOVARA."
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs text-[#334155]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#0A1F44] mb-1">Button Text</label>
                      <input
                        value={banner.buttonSettings.primary.text}
                        onChange={(e) =>
                          onChange((p) => ({
                            ...p,
                            ctaText: e.target.value,
                            buttonSettings: {
                              ...p.buttonSettings,
                              primary: { ...p.buttonSettings.primary, text: e.target.value },
                            },
                          }))
                        }
                        placeholder="Shop Now"
                        className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs font-medium text-[#0A1F44]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#0A1F44] mb-1">Button Link</label>
                      <div className="relative">
                        <input
                          value={banner.buttonSettings.primary.url}
                          onChange={(e) =>
                            onChange((p) => ({
                              ...p,
                              destinationUrl: e.target.value,
                              buttonSettings: {
                                ...p.buttonSettings,
                                primary: { ...p.buttonSettings.primary, url: e.target.value },
                              },
                            }))
                          }
                          placeholder="/shop"
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] pl-3 pr-7 text-xs text-[#0A1F44]"
                        />
                        <Link2 className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {quickTab === 'button' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#0A1F44] mb-1">Button Fill</label>
                      <div className="flex items-center gap-2 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2.5 h-9">
                        <input
                          type="color"
                          value={banner.buttonSettings.primary.bgColor}
                          onChange={(e) =>
                            onChange((p) => ({
                              ...p,
                              buttonSettings: {
                                ...p.buttonSettings,
                                primary: { ...p.buttonSettings.primary, bgColor: e.target.value },
                              },
                            }))
                          }
                          className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="font-mono-tabular text-xs font-semibold">{banner.buttonSettings.primary.bgColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#0A1F44] mb-1">Hover Fill</label>
                      <div className="flex items-center gap-2 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2.5 h-9">
                        <input
                          type="color"
                          value={banner.buttonSettings.primary.hoverBgColor}
                          onChange={(e) =>
                            onChange((p) => ({
                              ...p,
                              buttonSettings: {
                                ...p.buttonSettings,
                                primary: { ...p.buttonSettings.primary, hoverBgColor: e.target.value },
                              },
                            }))
                          }
                          className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="font-mono-tabular text-xs font-semibold">{banner.buttonSettings.primary.hoverBgColor}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#0A1F44] mb-1">Secondary CTA Text</label>
                      <input
                        value={banner.buttonSettings.secondary.text}
                        onChange={(e) =>
                          onChange((p) => ({
                            ...p,
                            secondaryCtaText: e.target.value,
                            buttonSettings: {
                              ...p.buttonSettings,
                              secondary: { ...p.buttonSettings.secondary, text: e.target.value },
                            },
                          }))
                        }
                        placeholder="Optional second button"
                        className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#0A1F44] mb-1">Corner Radius</label>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={banner.buttonSettings.primary.borderRadius}
                        onChange={(e) =>
                          onChange((p) => ({
                            ...p,
                            buttonSettings: {
                              ...p.buttonSettings,
                              primary: { ...p.buttonSettings.primary, borderRadius: Number(e.target.value) },
                            },
                          }))
                        }
                        className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 font-mono-tabular text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {quickTab === 'advanced' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#0A1F44] mb-1">Highlight Line</label>
                      <input
                        value={banner.highlightedTitle}
                        onChange={(e) => onChange((p) => ({ ...p, highlightedTitle: e.target.value }))}
                        placeholder="Better Life"
                        className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#0A1F44] mb-1">Eyebrow Badge</label>
                      <input
                        value={banner.eyebrow}
                        onChange={(e) => onChange((p) => ({ ...p, eyebrow: e.target.value }))}
                        placeholder="Up to 50% OFF"
                        className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#0A1F44] mb-1">Placement</label>
                      <select
                        value={banner.placement}
                        onChange={(e) => onChange((p) => ({ ...p, placement: e.target.value as BannerPlacement }))}
                        className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2.5 text-xs"
                      >
                        {BANNER_PLACEMENT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#0A1F44] mb-1">Width Mode</label>
                      <select
                        value={banner.widthMode}
                        onChange={(e) => onChange((p) => ({ ...p, widthMode: e.target.value as BannerWidthMode }))}
                        className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2.5 text-xs"
                      >
                        <option value="full">Full (100%)</option>
                        <option value="half">Half (50%)</option>
                        <option value="one_third">1/3 Width (33%)</option>
                        <option value="two_thirds">2/3 Width (67%)</option>
                        <option value="custom">Custom ({banner.customWidthPercent}%)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Text Style Controls Box (exact visual match to reference) */}
            <div className="rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] p-3 space-y-2.5">
              <div className="text-xs font-bold text-[#0A1F44]">Text Style</div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[#475569]">Title Font Size</span>
                <div className="inline-flex items-center rounded-lg border border-[#E4EAF5] bg-white">
                  <button
                    type="button"
                    aria-label="Decrease title font size"
                    onClick={() => adjustFontSize('titleFontSize', -2, 16, 72)}
                    className="px-2 py-1 text-[#64748B] hover:text-[#145CFF]"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-7 text-center font-mono-tabular text-[11px] font-bold text-[#0A1F44]">
                    {banner.typographySettings.titleFontSize}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase title font size"
                    onClick={() => adjustFontSize('titleFontSize', 2, 16, 72)}
                    className="px-2 py-1 text-[#64748B] hover:text-[#145CFF]"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[#475569]">Subtitle Font Size</span>
                <div className="inline-flex items-center rounded-lg border border-[#E4EAF5] bg-white">
                  <button
                    type="button"
                    aria-label="Decrease subtitle font size"
                    onClick={() => adjustFontSize('subtitleFontSize', -1, 11, 32)}
                    className="px-2 py-1 text-[#64748B] hover:text-[#145CFF]"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-7 text-center font-mono-tabular text-[11px] font-bold text-[#0A1F44]">
                    {banner.typographySettings.subtitleFontSize}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase subtitle font size"
                    onClick={() => adjustFontSize('subtitleFontSize', 1, 11, 32)}
                    className="px-2 py-1 text-[#64748B] hover:text-[#145CFF]"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[#475569]">Title Color</span>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF5] bg-white px-2 h-7 w-[92px]">
                  <input
                    type="color"
                    aria-label="Quick title color"
                    value={banner.typographySettings.titleColor}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        typographySettings: { ...p.typographySettings, titleColor: e.target.value },
                      }))
                    }
                    className="h-4 w-4 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="font-mono-tabular text-[10.5px] font-semibold text-[#0A1F44]">
                    {banner.typographySettings.titleColor}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[#475569]">Subtitle Color</span>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF5] bg-white px-2 h-7 w-[92px]">
                  <input
                    type="color"
                    aria-label="Quick subtitle color"
                    value={banner.typographySettings.subtitleColor}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        typographySettings: { ...p.typographySettings, subtitleColor: e.target.value },
                      }))
                    }
                    className="h-4 w-4 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="font-mono-tabular text-[10.5px] font-semibold text-[#0A1F44]">
                    {banner.typographySettings.subtitleColor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Preview Dialog */}
      {fullScreenOpen && (
        <div
          data-nested-preview-modal
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-xs"
          onClick={() => setFullScreenOpen(false)}
        >
          <div
            className="w-full max-w-[1340px] max-h-[92dvh] flex flex-col rounded-3xl bg-white p-4 sm:p-6 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-bold text-[#0A1F44]">Full-Width Storefront Preview</span>
                <div className="inline-flex items-center rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] p-0.5">
                  {(['desktop', 'tablet', 'mobile'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setViewport(m)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize ${
                        viewport === m ? 'bg-[#145CFF] text-white' : 'text-[#64748B]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close full screen preview"
                onClick={() => setFullScreenOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E4EAF5] text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pt-4">
              <div className={`rounded-2xl bg-[#F4F7FF] p-4 sm:p-6 ${widthContainerClass}`}>
                <DynamicBannerRenderer banner={banner} viewportOverride={viewport} previewMode />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
