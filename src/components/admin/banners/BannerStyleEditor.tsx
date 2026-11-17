import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  BANNER_DESIGN_PRESETS,
  type BannerDesignPreset,
  type DynamicBannerConfig,
} from '../../../lib/bannerBuilder';

const FONT_FAMILIES = [
  'Outfit',
  'Plus Jakarta Sans',
  'Inter',
  'Sora',
  'DM Sans',
  'Georgia, serif',
];

interface BannerStyleEditorProps {
  banner: DynamicBannerConfig;
  onChange: (updater: (prev: DynamicBannerConfig) => DynamicBannerConfig) => void;
}

export const BannerStyleEditor: React.FC<BannerStyleEditorProps> = ({ banner, onChange }) => {
  const applyPreset = (preset: BannerDesignPreset) => {
    onChange((prev) => ({
      ...prev,
      backgroundType: prev.desktopImageUrl && preset.backgroundType === 'solid'
        ? prev.backgroundType
        : preset.backgroundType,
      backgroundColor: preset.backgroundColor,
      gradientConfig: preset.gradientConfig,
      overlaySettings: preset.overlaySettings,
      typographySettings: {
        ...prev.typographySettings,
        ...preset.typographySettings,
      },
      buttonSettings: {
        ...prev.buttonSettings,
        primary: {
          ...prev.buttonSettings.primary,
          ...preset.primaryButton,
        },
      },
      styleSettings: {
        ...prev.styleSettings,
        ...preset.styleSettings,
        presetKey: preset.key,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* 1. Editable Design Presets */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-[#0A1F44]">1. Design Presets</h3>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#145CFF]">
            <Sparkles className="h-3 w-3" /> One-click theme
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BANNER_DESIGN_PRESETS.map((preset) => {
            const active = banner.styleSettings.presetKey === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`group rounded-xl border p-2.5 text-left transition-all ${
                  active
                    ? 'border-[#145CFF] bg-[#EEF4FF] ring-1 ring-[#145CFF]/30'
                    : 'border-[#E4EAF5] bg-[#F8FAFF] hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-white ring-1 ring-slate-200 shrink-0"
                    style={{ backgroundColor: preset.backgroundColor }}
                  />
                  <span className="truncate text-[11px] font-bold text-[#0A1F44]">{preset.label}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-[#64748B]">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Typography */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <h3 className="text-[13px] font-bold text-[#0A1F44]">2. Typography &amp; Text Colors</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[10.5px] font-semibold text-[#475569] mb-1">Heading Font</label>
            <select
              value={banner.typographySettings.titleFontFamily}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  typographySettings: { ...p.typographySettings, titleFontFamily: e.target.value },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-xs"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold text-[#475569] mb-1">Title Weight</label>
            <select
              value={banner.typographySettings.titleFontWeight}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  typographySettings: { ...p.typographySettings, titleFontWeight: Number(e.target.value) },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-xs"
            >
              <option value={600}>SemiBold (600)</option>
              <option value={700}>Bold (700)</option>
              <option value={800}>ExtraBold (800)</option>
              <option value={900}>Black (900)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold text-[#475569] mb-1">Transform</label>
            <select
              value={banner.typographySettings.textTransform}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  typographySettings: {
                    ...p.typographySettings,
                    textTransform: e.target.value as 'none' | 'uppercase' | 'capitalize',
                  },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-xs"
            >
              <option value="none">Normal</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Title Color</label>
            <div className="flex items-center gap-1.5 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 h-8">
              <input
                type="color"
                value={banner.typographySettings.titleColor}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    typographySettings: { ...p.typographySettings, titleColor: e.target.value },
                  }))
                }
                className="h-4 w-4 shrink-0 cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="font-mono-tabular text-[10.5px] font-semibold">{banner.typographySettings.titleColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Highlight Color</label>
            <div className="flex items-center gap-1.5 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 h-8">
              <input
                type="color"
                value={banner.typographySettings.highlightColor}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    typographySettings: { ...p.typographySettings, highlightColor: e.target.value },
                  }))
                }
                className="h-4 w-4 shrink-0 cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="font-mono-tabular text-[10.5px] font-semibold">{banner.typographySettings.highlightColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Subtitle Color</label>
            <div className="flex items-center gap-1.5 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 h-8">
              <input
                type="color"
                value={banner.typographySettings.subtitleColor}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    typographySettings: { ...p.typographySettings, subtitleColor: e.target.value },
                  }))
                }
                className="h-4 w-4 shrink-0 cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="font-mono-tabular text-[10.5px] font-semibold">{banner.typographySettings.subtitleColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Line Height</label>
            <input
              type="number"
              step={0.05}
              min={0.9}
              max={2.2}
              value={banner.typographySettings.lineHeight}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  typographySettings: { ...p.typographySettings, lineHeight: Number(e.target.value) },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Desc Font Size (px)</label>
            <input
              type="number"
              min={10}
              max={28}
              value={banner.typographySettings.descriptionFontSize}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  typographySettings: { ...p.typographySettings, descriptionFontSize: Number(e.target.value) },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Letter Spacing (em)</label>
            <input
              type="number"
              step={0.01}
              min={-0.08}
              max={0.3}
              value={banner.typographySettings.letterSpacing}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  typographySettings: { ...p.typographySettings, letterSpacing: Number(e.target.value) },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Text Shadow</label>
            <select
              value={banner.typographySettings.textShadow}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  typographySettings: { ...p.typographySettings, textShadow: e.target.value },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-[11px]"
            >
              <option value="none">None</option>
              <option value="0 2px 8px rgba(10,31,68,0.18)">Soft</option>
              <option value="0 2px 14px rgba(0,0,0,0.45)">Crisp Dark</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. Borders, Shadows & Effects */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <h3 className="text-[13px] font-bold text-[#0A1F44]">3. Container Borders, Shadows &amp; Animations</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Radius (px)</label>
            <input
              type="number"
              min={0}
              max={48}
              value={banner.styleSettings.borderRadius}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  styleSettings: { ...p.styleSettings, borderRadius: Number(e.target.value) },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Border Style</label>
            <select
              value={banner.styleSettings.borderStyle}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  styleSettings: { ...p.styleSettings, borderStyle: e.target.value as 'none' | 'solid' | 'dashed' },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-[11px]"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Border Width (px)</label>
            <input
              type="number"
              min={0}
              max={8}
              value={banner.styleSettings.borderWidth}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  styleSettings: { ...p.styleSettings, borderWidth: Number(e.target.value) },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Border Color</label>
            <div className="flex items-center gap-1.5 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 h-8">
              <input
                type="color"
                value={banner.styleSettings.borderColor}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    styleSettings: { ...p.styleSettings, borderColor: e.target.value },
                  }))
                }
                className="h-4 w-4 shrink-0 cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="font-mono-tabular text-[10.5px] font-semibold">{banner.styleSettings.borderColor}</span>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Box Shadow</label>
            <select
              value={banner.styleSettings.boxShadow}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  styleSettings: { ...p.styleSettings, boxShadow: e.target.value as 'none' | 'sm' | 'md' | 'lg' | 'xl' },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-[11px]"
            >
              <option value="none">None</option>
              <option value="sm">Soft (sm)</option>
              <option value="md">Elevated (md)</option>
              <option value="lg">Deep (lg)</option>
              <option value="xl">Hero (xl)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Hover Effect</label>
            <select
              value={banner.styleSettings.hoverEffect}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  styleSettings: { ...p.styleSettings, hoverEffect: e.target.value as 'none' | 'lift' | 'zoom_image' | 'glow' },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-[11px]"
            >
              <option value="lift">Subtle Lift</option>
              <option value="zoom_image">Zoom Image</option>
              <option value="glow">Blue Glow</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 items-center">
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Entrance Animation</label>
            <select
              value={banner.styleSettings.animation}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  styleSettings: {
                    ...p.styleSettings,
                    animation: e.target.value as 'none' | 'fade_in' | 'slide_up' | 'zoom_subtle',
                  },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-[11px]"
            >
              <option value="none">None</option>
              <option value="fade_in">Fade In</option>
              <option value="slide_up">Slide Up</option>
              <option value="zoom_subtle">Subtle Zoom</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-3 sm:pt-4">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#334155]">
              <input
                type="checkbox"
                checked={banner.styleSettings.decorativeBadge}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    styleSettings: { ...p.styleSettings, decorativeBadge: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded text-[#145CFF]"
              />
              Show Badges
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#334155]">
              <input
                type="checkbox"
                checked={banner.styleSettings.decorativeGlow}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    styleSettings: { ...p.styleSettings, decorativeGlow: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded text-[#145CFF]"
              />
              Ambient Glow
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};
