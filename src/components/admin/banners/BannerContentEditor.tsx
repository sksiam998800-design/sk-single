import React from 'react';
import { AlignCenter, AlignLeft, AlignRight, Link2 } from 'lucide-react';
import type { BannerButtonConfig, BannerHeightMode, DynamicBannerConfig } from '../../../lib/bannerBuilder';

const HEIGHT_PRESETS: Array<{
  mode: BannerHeightMode;
  label: string;
  hint: string;
  desktop: number;
  tablet: number;
  mobile: number;
}> = [
  { mode: 'auto', label: 'Auto', hint: 'Content', desktop: 260, tablet: 230, mobile: 200 },
  { mode: 'small', label: 'Small', hint: '160px', desktop: 160, tablet: 150, mobile: 140 },
  { mode: 'medium', label: 'Medium', hint: '260px', desktop: 260, tablet: 230, mobile: 200 },
  { mode: 'large', label: 'Large', hint: '380px', desktop: 380, tablet: 320, mobile: 260 },
  { mode: 'custom', label: 'Custom', hint: 'Exact px', desktop: 260, tablet: 230, mobile: 200 },
];

const QUICK_ROUTES = ['/shop', '/offers', '/shop?discount=true', '/shop?sort=newest', '/category/smart-watches'];

interface BannerContentEditorProps {
  banner: DynamicBannerConfig;
  onChange: (updater: (prev: DynamicBannerConfig) => DynamicBannerConfig) => void;
}

export const BannerContentEditor: React.FC<BannerContentEditorProps> = ({ banner, onChange }) => {
  const updateButton = (which: 'primary' | 'secondary', patch: Partial<BannerButtonConfig>) => {
    onChange((prev) => ({
      ...prev,
      ...(which === 'primary'
        ? {
            ctaText: patch.text !== undefined ? patch.text : prev.ctaText,
            destinationUrl: patch.url !== undefined ? patch.url : prev.destinationUrl,
          }
        : {
            secondaryCtaText: patch.text !== undefined ? patch.text : prev.secondaryCtaText,
            secondaryDestinationUrl: patch.url !== undefined ? patch.url : prev.secondaryDestinationUrl,
          }),
      buttonSettings: {
        ...prev.buttonSettings,
        [which]: {
          ...prev.buttonSettings[which],
          ...patch,
        },
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* 1. Core Copy & Badges */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <h3 className="text-[13px] font-bold text-[#0A1F44]">1. Banner Copy &amp; Highlights</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">
              Internal Banner Name
            </label>
            <input
              value={banner.name}
              onChange={(e) => onChange((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Q4 Hero Promo Strip"
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs text-[#0A1F44]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">
              Badge / Eyebrow Text
            </label>
            <input
              value={banner.eyebrow}
              onChange={(e) => onChange((p) => ({ ...p, eyebrow: e.target.value }))}
              placeholder="e.g., Up to 50% OFF"
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs text-[#0A1F44]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">
              Banner Title *
            </label>
            <input
              required
              value={banner.title}
              onChange={(e) => onChange((p) => ({ ...p, title: e.target.value }))}
              placeholder="Smart Technology"
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs font-semibold text-[#0A1F44]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">
              Highlighted Accent Line
            </label>
            <input
              value={banner.highlightedTitle}
              onChange={(e) => onChange((p) => ({ ...p, highlightedTitle: e.target.value }))}
              placeholder="Better Life"
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs font-semibold text-[#145CFF]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Promo Label</label>
            <input
              value={banner.promoLabel}
              onChange={(e) => onChange((p) => ({ ...p, promoLabel: e.target.value }))}
              placeholder="Limited Stock"
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs text-[#0A1F44]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Caption / Footnote</label>
            <input
              value={banner.caption}
              onChange={(e) => onChange((p) => ({ ...p, caption: e.target.value }))}
              placeholder="Free nationwide shipping on orders over ৳999"
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs text-[#0A1F44]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#475569] mb-1">Subtitle</label>
          <textarea
            rows={2}
            value={banner.subtitle}
            onChange={(e) => onChange((p) => ({ ...p, subtitle: e.target.value }))}
            placeholder="Discover the latest gadgets and upgrade your lifestyle with NOVARA."
            className="w-full rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 py-2 text-xs text-[#0A1F44]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#475569] mb-1">Extended Description (Optional)</label>
          <textarea
            rows={2}
            value={banner.description}
            onChange={(e) => onChange((p) => ({ ...p, description: e.target.value }))}
            placeholder="Optional supporting copy displayed below the subtitle."
            className="w-full rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 py-2 text-xs text-[#0A1F44]"
          />
        </div>
      </section>

      {/* 2. Primary & Secondary Buttons */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <h3 className="text-[13px] font-bold text-[#0A1F44]">2. CTA Buttons</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Primary Button Text</label>
            <input
              value={banner.buttonSettings.primary.text}
              onChange={(e) => updateButton('primary', { text: e.target.value })}
              placeholder="Shop Now"
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs text-[#0A1F44]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Primary Button Link</label>
            <div className="relative">
              <input
                value={banner.buttonSettings.primary.url}
                onChange={(e) => updateButton('primary', { url: e.target.value })}
                placeholder="/shop"
                className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] pl-3 pr-8 text-xs text-[#0A1F44]"
              />
              <Link2 className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-[#94A3B8]" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[#64748B]">Quick Links:</span>
          {QUICK_ROUTES.map((route) => (
            <button
              key={route}
              type="button"
              onClick={() => updateButton('primary', { url: route })}
              className="rounded-md border border-[#E4EAF5] bg-[#F8FAFF] px-2 py-0.5 text-[10px] font-medium text-[#145CFF] hover:bg-[#EEF4FF]"
            >
              {route}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Style</label>
            <select
              value={banner.buttonSettings.primary.style}
              onChange={(e) => updateButton('primary', { style: e.target.value as 'solid' | 'outline' | 'ghost' })}
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-[11px]"
            >
              <option value="solid">Solid</option>
              <option value="outline">Outline</option>
              <option value="ghost">Ghost</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Hover Anim</label>
            <select
              value={banner.buttonSettings.primary.hoverAnimation}
              onChange={(e) =>
                updateButton('primary', { hoverAnimation: e.target.value as 'none' | 'lift' | 'scale' | 'slide' })
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-[11px]"
            >
              <option value="lift">Lift</option>
              <option value="scale">Scale</option>
              <option value="slide">Arrow Slide</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Btn Bg</label>
            <input
              type="color"
              value={banner.buttonSettings.primary.bgColor}
              onChange={(e) => updateButton('primary', { bgColor: e.target.value })}
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] p-1 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Btn Text</label>
            <input
              type="color"
              value={banner.buttonSettings.primary.textColor}
              onChange={(e) => updateButton('primary', { textColor: e.target.value })}
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] p-1 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Radius px</label>
            <input
              type="number"
              min={0}
              max={999}
              value={banner.buttonSettings.primary.borderRadius}
              onChange={(e) => updateButton('primary', { borderRadius: Number(e.target.value) })}
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Secondary Button Text (Optional)</label>
            <input
              value={banner.buttonSettings.secondary.text}
              onChange={(e) => updateButton('secondary', { text: e.target.value })}
              placeholder="Learn More"
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs text-[#0A1F44]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Secondary Button Link</label>
            <input
              value={banner.buttonSettings.secondary.url}
              onChange={(e) => updateButton('secondary', { url: e.target.value })}
              placeholder="/offers"
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs text-[#0A1F44]"
            />
          </div>
        </div>
      </section>

      {/* 3. Positioning & Sizing */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3.5">
        <h3 className="text-[13px] font-bold text-[#0A1F44]">3. Content Positioning &amp; Sizing</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Desktop Align</label>
            <div className="inline-flex w-full rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] p-0.5">
              {(['left', 'center', 'right'] as const).map((align) => {
                const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                const active = banner.contentSettings.horizontalAlign === align;
                return (
                  <button
                    key={align}
                    type="button"
                    aria-label={`Desktop align ${align}`}
                    onClick={() =>
                      onChange((p) => ({
                        ...p,
                        contentSettings: { ...p.contentSettings, horizontalAlign: align },
                        typographySettings: { ...p.typographySettings, textAlign: align },
                      }))
                    }
                    className={`flex-1 flex items-center justify-center py-1.5 rounded-lg ${
                      active ? 'bg-white text-[#145CFF] shadow-2xs' : 'text-[#64748B]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Tablet Align</label>
            <select
              value={banner.contentSettings.tabletHorizontalAlign}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  contentSettings: {
                    ...p.contentSettings,
                    tabletHorizontalAlign: e.target.value as 'left' | 'center' | 'right',
                  },
                }))
              }
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-xs"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Mobile Align</label>
            <select
              value={banner.contentSettings.mobileHorizontalAlign}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  contentSettings: {
                    ...p.contentSettings,
                    mobileHorizontalAlign: e.target.value as 'left' | 'center' | 'right',
                  },
                }))
              }
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-xs"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Vertical Align</label>
            <select
              value={banner.contentSettings.verticalAlign}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  contentSettings: { ...p.contentSettings, verticalAlign: e.target.value as 'top' | 'middle' | 'bottom' },
                }))
              }
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-xs"
            >
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
        </div>

        {/* Banner Height Presets */}
        <div>
          <label className="block text-[11px] font-semibold text-[#475569] mb-1.5">Banner Height Mode</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {HEIGHT_PRESETS.map((preset) => {
              const currentMode = banner.contentSettings.heightMode || 'medium';
              const active = currentMode === preset.mode;
              return (
                <button
                  key={preset.mode}
                  type="button"
                  onClick={() =>
                    onChange((p) => ({
                      ...p,
                      contentSettings: {
                        ...p.contentSettings,
                        heightMode: preset.mode,
                        ...(preset.mode === 'custom' || preset.mode === 'auto'
                          ? {}
                          : {
                              minHeightPx: preset.desktop,
                              tabletMinHeightPx: preset.tablet,
                              mobileMinHeightPx: preset.mobile,
                            }),
                      },
                    }))
                  }
                  className={`rounded-xl border px-2 py-1.5 text-center transition-all ${
                    active
                      ? 'border-[#145CFF] bg-[#EEF4FF] text-[#145CFF] ring-1 ring-[#145CFF]/25'
                      : 'border-[#E4EAF5] bg-[#F8FAFF] text-[#475569] hover:border-blue-200'
                  }`}
                >
                  <div className="text-[11px] font-bold">{preset.label}</div>
                  <div className="text-[9.5px] opacity-75">{preset.hint}</div>
                </button>
              );
            })}
          </div>
        </div>

        {banner.contentSettings.heightMode !== 'auto' && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Desktop Height (px)</label>
              <input
                type="number"
                min={100}
                max={900}
                value={banner.contentSettings.minHeightPx}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    contentSettings: {
                      ...p.contentSettings,
                      heightMode: 'custom',
                      minHeightPx: Number(e.target.value),
                    },
                  }))
                }
                className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Tablet Height (px)</label>
              <input
                type="number"
                min={100}
                max={900}
                value={banner.contentSettings.tabletMinHeightPx ?? 230}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    contentSettings: {
                      ...p.contentSettings,
                      heightMode: 'custom',
                      tabletMinHeightPx: Number(e.target.value),
                    },
                  }))
                }
                className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Mobile Height (px)</label>
              <input
                type="number"
                min={100}
                max={800}
                value={banner.contentSettings.mobileMinHeightPx}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    contentSettings: {
                      ...p.contentSettings,
                      heightMode: 'custom',
                      mobileMinHeightPx: Number(e.target.value),
                    },
                  }))
                }
                className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Content Width</label>
            <input
              value={banner.contentSettings.contentWidth}
              onChange={(e) =>
                onChange((p) => ({ ...p, contentSettings: { ...p.contentSettings, contentWidth: e.target.value } }))
              }
              placeholder="58%"
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Max Width (px)</label>
            <input
              type="number"
              min={200}
              max={1280}
              value={banner.contentSettings.maxWidthPx}
              onChange={(e) =>
                onChange((p) => ({ ...p, contentSettings: { ...p.contentSettings, maxWidthPx: Number(e.target.value) } }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Padding X (px)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={banner.contentSettings.paddingX}
              onChange={(e) =>
                onChange((p) => ({ ...p, contentSettings: { ...p.contentSettings, paddingX: Number(e.target.value) } }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Padding Y (px)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={banner.contentSettings.paddingY}
              onChange={(e) =>
                onChange((p) => ({ ...p, contentSettings: { ...p.contentSettings, paddingY: Number(e.target.value) } }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Element Gap</label>
            <input
              type="number"
              min={0}
              max={48}
              value={banner.contentSettings.elementSpacing}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  contentSettings: { ...p.contentSettings, elementSpacing: Number(e.target.value) },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
