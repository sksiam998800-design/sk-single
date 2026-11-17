import React, { useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Layers,
  Palette,
  PaintBucket,
  RefreshCw,
  Shuffle,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  GRADIENT_PRESETS,
  randomizeGradientConfig,
  type BannerBackgroundType,
  type DynamicBannerConfig,
} from '../../../lib/bannerBuilder';
import { getAuthToken } from '../../../services/api';

const LOCAL_BANNER_ASSETS = [
  { label: 'Smart Tech Hero', url: '/src/assets/images/hero_smart_tech_1794832024388.jpg' },
  { label: 'Studio Headphones', url: '/src/assets/images/promo_headphones_1794832024152.jpg' },
  { label: 'Lifestyle Sneakers', url: '/src/assets/images/promo_sneakers_1794832025309.jpg' },
  { label: 'Smartwatch Edition', url: '/src/assets/images/promo_smartwatch_1794832026084.jpg' },
  { label: 'Laptop Workspace', url: '/src/assets/images/product_laptop_1794832026646.jpg' },
  { label: 'Flagship Smartphone', url: '/src/assets/images/product_smartphone_1794832025637.jpg' },
];

const BG_TYPES: Array<{
  type: BannerBackgroundType;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { type: 'solid', label: 'Solid Color', icon: PaintBucket },
  { type: 'gradient', label: 'Gradient', icon: Palette },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'gradient_image', label: 'Gradient + Image', icon: Sparkles },
  { type: 'image_overlay', label: 'Image Overlay', icon: Layers },
];

function hexToRgbString(hex: string): string {
  const clean = (hex || '#145CFF').replace('#', '').trim();
  if (clean.length !== 6) return '20, 92, 255';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return '20, 92, 255';
  return `${r}, ${g}, ${b}`;
}

interface BannerBackgroundEditorProps {
  banner: DynamicBannerConfig;
  onChange: (updater: (prev: DynamicBannerConfig) => DynamicBannerConfig) => void;
}

export const BannerBackgroundEditor: React.FC<BannerBackgroundEditorProps> = ({ banner, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageTarget, setImageTarget] = useState<'desktop' | 'mobile'>('desktop');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const activeImageUrl =
    imageTarget === 'mobile' ? banner.mobileImageUrl : banner.desktopImageUrl;

  const setActiveImage = (url: string, publicId?: string) => {
    onChange((prev) => ({
      ...prev,
      ...(imageTarget === 'mobile'
        ? { mobileImageUrl: url }
        : {
            desktopImageUrl: url,
            cloudinaryPublicId: url ? (publicId ?? prev.cloudinaryPublicId) : '',
          }),
    }));
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setUploadError('Unsupported image format. Please choose JPG, PNG, or WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image exceeds the 5MB limit. Please compress and try again.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getAuthToken();
      const res = await fetch('/api/admin/banners/media/upload', {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; asset?: { url: string; publicId?: string } };
      if (!res.ok || !json.asset?.url) {
        throw new Error(json.error || 'Upload failed.');
      }
      setActiveImage(json.asset.url, json.asset.publicId);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? `${err.message} You can still paste an image URL or select a local asset below.`
          : 'Upload failed.',
      );
    } finally {
      setUploading(false);
    }
  };

  const swapGradientColors = () => {
    onChange((prev) => {
      const stops = prev.gradientConfig.stops.slice();
      if (stops.length >= 2) {
        const firstColor = stops[0].color;
        const lastIdx = stops.length - 1;
        stops[0] = { ...stops[0], color: stops[lastIdx].color };
        stops[lastIdx] = { ...stops[lastIdx], color: firstColor };
      }
      return {
        ...prev,
        gradientConfig: { ...prev.gradientConfig, stops },
      };
    });
  };

  const updateStop = (idx: number, patch: Partial<{ color: string; position: number }>) => {
    onChange((prev) => ({
      ...prev,
      gradientConfig: {
        ...prev.gradientConfig,
        stops: prev.gradientConfig.stops.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
      },
    }));
  };

  const addGradientStop = () => {
    onChange((prev) => {
      if (prev.gradientConfig.stops.length >= 5) return prev;
      return {
        ...prev,
        gradientConfig: {
          ...prev.gradientConfig,
          stops: [...prev.gradientConfig.stops, { color: '#60A5FA', position: 50 }],
        },
      };
    });
  };

  const removeGradientStop = (idx: number) => {
    onChange((prev) => {
      if (prev.gradientConfig.stops.length <= 2) return prev;
      return {
        ...prev,
        gradientConfig: {
          ...prev.gradientConfig,
          stops: prev.gradientConfig.stops.filter((_, i) => i !== idx),
        },
      };
    });
  };

  const isGradientMode =
    banner.backgroundType === 'gradient' || banner.backgroundType === 'gradient_image';

  return (
    <div className="space-y-4">
      {/* 1. Background Type */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs">
        <h3 className="text-[13px] font-bold text-[#0A1F44]">1. Background Type</h3>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {BG_TYPES.map((item) => {
            const Icon = item.icon;
            const active = banner.backgroundType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    backgroundType: item.type,
                    overlaySettings:
                      item.type === 'solid' || item.type === 'gradient'
                        ? { ...prev.overlaySettings, type: 'none' }
                        : prev.overlaySettings.type === 'none'
                          ? { ...prev.overlaySettings, type: 'gradient', opacity: Math.max(45, prev.overlaySettings.opacity || 75) }
                          : prev.overlaySettings,
                  }))
                }
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-all ${
                  active
                    ? 'border-[#145CFF] bg-[#EEF4FF] text-[#145CFF] ring-1 ring-[#145CFF]/30 shadow-2xs'
                    : 'border-[#E4EAF5] bg-white text-[#475569] hover:border-blue-200 hover:bg-[#F8FAFF]'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-[#145CFF]' : 'text-[#64748B]'}`} />
                <span className="text-[10.5px] font-semibold leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Background Options */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-bold text-[#0A1F44]">2. Background Options</h3>
          {isGradientMode && (
            <button
              type="button"
              onClick={() =>
                onChange((prev) => ({ ...prev, gradientConfig: randomizeGradientConfig() }))
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2.5 py-1 text-[11px] font-semibold text-[#145CFF] hover:bg-[#EEF4FF]"
            >
              <Shuffle className="h-3 w-3" /> Randomize
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[128px_1fr] gap-3 items-start">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Base Color</label>
            <div className="flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2 h-9">
              <input
                type="color"
                aria-label="Solid background color"
                value={banner.backgroundColor || '#145CFF'}
                onChange={(e) => onChange((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <input
                value={banner.backgroundColor}
                onChange={(e) => onChange((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                className="w-full bg-transparent font-mono-tabular text-[11px] font-semibold text-[#0A1F44] outline-none"
              />
            </div>
            <p className="mt-1 text-[10px] font-mono-tabular text-[#94A3B8]">
              rgb({hexToRgbString(banner.backgroundColor)})
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-[#475569]">Gradient Stops</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      gradientConfig: {
                        ...prev.gradientConfig,
                        type: prev.gradientConfig.type === 'linear' ? 'radial' : 'linear',
                      },
                    }))
                  }
                  className="rounded-md border border-[#E4EAF5] bg-[#F8FAFF] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#475569]"
                >
                  {banner.gradientConfig.type}
                </button>
                <button
                  type="button"
                  onClick={swapGradientColors}
                  title="Swap gradient colors"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#E4EAF5] bg-[#F8FAFF] text-[#475569] hover:text-[#145CFF]"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {banner.gradientConfig.stops.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-1.5 min-w-0">
                  <div className="flex flex-1 min-w-0 items-center gap-1.5 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2 h-8">
                    <input
                      type="color"
                      aria-label={`Gradient stop ${idx + 1} color`}
                      value={stop.color}
                      onChange={(e) => updateStop(idx, { color: e.target.value })}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <input
                      value={stop.color}
                      onChange={(e) => updateStop(idx, { color: e.target.value })}
                      className="w-full bg-transparent font-mono-tabular text-[11px] font-semibold text-[#0A1F44] outline-none"
                    />
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={stop.position}
                    onChange={(e) => updateStop(idx, { position: Number(e.target.value) })}
                    className="h-8 w-14 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-center font-mono-tabular text-[11px] font-semibold"
                    title="Stop position %"
                  />
                  {banner.gradientConfig.stops.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeGradientStop(idx)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-md"
                      aria-label="Remove stop"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {banner.gradientConfig.stops.length < 5 && (
              <button
                type="button"
                onClick={addGradientStop}
                className="mt-1.5 text-[11px] font-semibold text-[#145CFF] hover:underline"
              >
                + Add Color Stop
              </button>
            )}
          </div>
        </div>

        {/* Angle & Presets */}
        {isGradientMode && (
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            {banner.gradientConfig.type === 'linear' && (
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-[#475569] w-16 shrink-0">Angle</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={banner.gradientConfig.angle}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      gradientConfig: { ...prev.gradientConfig, angle: Number(e.target.value) },
                    }))
                  }
                  className="flex-1 min-w-0 w-full accent-[#145CFF]"
                />
                <span className="w-12 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] py-1 text-center font-mono-tabular text-[11px] font-bold text-[#0A1F44]">
                  {banner.gradientConfig.angle}°
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-semibold text-[#64748B] mr-1">Presets:</span>
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  title={preset.name}
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      backgroundType:
                        prev.backgroundType === 'solid' || prev.backgroundType === 'image'
                          ? 'gradient'
                          : prev.backgroundType,
                      gradientConfig: {
                        type: preset.type,
                        angle: preset.angle,
                        stops: preset.stops,
                        opacity: prev.gradientConfig.opacity ?? 100,
                      },
                    }))
                  }
                  className="h-5 w-7 rounded-md border border-white ring-1 ring-slate-200 transition-transform hover:scale-110"
                  style={{
                    background: `linear-gradient(${preset.angle}deg, ${preset.stops
                      .map((s) => `${s.color} ${s.position}%`)
                      .join(', ')})`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Background Opacity Slider */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[11px] font-semibold text-[#475569] w-16 shrink-0">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={banner.backgroundOpacity}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, backgroundOpacity: Number(e.target.value) }))
            }
            className="flex-1 min-w-0 w-full accent-[#145CFF]"
          />
          <span className="w-12 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] py-1 text-center font-mono-tabular text-[11px] font-bold text-[#0A1F44]">
            {banner.backgroundOpacity}%
          </span>
        </div>
      </section>

      {/* 3. Background Image (Optional) */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-bold text-[#0A1F44]">3. Background Image (Optional)</h3>
          <div className="inline-flex rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] p-0.5 text-[10.5px] font-semibold">
            <button
              type="button"
              onClick={() => setImageTarget('desktop')}
              className={`rounded-md px-2.5 py-1 ${
                imageTarget === 'desktop' ? 'bg-white text-[#145CFF] shadow-2xs' : 'text-[#64748B]'
              }`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setImageTarget('mobile')}
              className={`rounded-md px-2.5 py-1 ${
                imageTarget === 'mobile' ? 'bg-white text-[#145CFF] shadow-2xs' : 'text-[#64748B]'
              }`}
            >
              Mobile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-3 items-stretch">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileUpload(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-4 text-center transition-colors ${
              dragActive
                ? 'border-[#145CFF] bg-[#EEF4FF]'
                : 'border-[#CBD5E1] bg-[#F8FAFF] hover:border-[#145CFF]'
            }`}
          >
            <UploadCloud className="h-6 w-6 text-[#145CFF]" />
            <p className="mt-1.5 text-[11.5px] font-semibold text-[#0A1F44]">
              {uploading ? 'Uploading banner image...' : 'Click to upload or drag and drop'}
            </p>
            <p className="mt-0.5 text-[10px] text-[#64748B]">
              Supports: JPG, PNG, WebP (Max: 5MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
            />
          </div>

          <div className="relative flex h-24 sm:h-auto items-center justify-center overflow-hidden rounded-xl border border-[#E4EAF5] bg-[#0F172A]">
            {activeImageUrl ? (
              <>
                <img src={activeImageUrl} alt="Banner background" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => setActiveImage('')}
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <span className="text-[10px] font-medium text-slate-400 px-2 text-center">No image</span>
            )}
          </div>
        </div>

        {uploadError && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] text-amber-800">
            {uploadError}
          </p>
        )}

        {/* Direct Image URL + Asset Quick Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={activeImageUrl}
            onChange={(e) => setActiveImage(e.target.value)}
            placeholder={imageTarget === 'desktop' ? 'Desktop image URL (/src/assets/...)' : 'Mobile override image URL'}
            className="h-8 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-[11px] text-[#0A1F44]"
          />
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setActiveImage(e.target.value);
            }}
            className="h-8 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2.5 text-[11px] text-[#475569]"
          >
            <option value="">Choose built-in NOVARA asset...</option>
            {LOCAL_BANNER_ASSETS.map((a) => (
              <option key={a.url} value={a.url}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Image Fit, Focal Point & Opacity */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Object Fit</label>
            <select
              value={banner.imageSettings.objectFit}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  imageSettings: {
                    ...prev.imageSettings,
                    objectFit: e.target.value as 'cover' | 'contain' | 'fill' | 'auto',
                  },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-[11px]"
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Fill</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Repeat</label>
            <select
              value={banner.imageSettings.repeat}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  imageSettings: {
                    ...prev.imageSettings,
                    repeat: e.target.value as 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y',
                  },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 text-[11px]"
            >
              <option value="no-repeat">No Repeat</option>
              <option value="repeat">Repeat</option>
              <option value="repeat-x">Repeat X</option>
              <option value="repeat-y">Repeat Y</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Focal X (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={banner.imageSettings.focalPoint.x}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  imageSettings: {
                    ...prev.imageSettings,
                    focalPoint: { ...prev.imageSettings.focalPoint, x: Number(e.target.value) },
                  },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Focal Y (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={banner.imageSettings.focalPoint.y}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  imageSettings: {
                    ...prev.imageSettings,
                    focalPoint: { ...prev.imageSettings.focalPoint, y: Number(e.target.value) },
                  },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#475569] w-20 shrink-0">Img Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={banner.imageSettings.opacity}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                imageSettings: { ...prev.imageSettings, opacity: Number(e.target.value) },
              }))
            }
            className="flex-1 min-w-0 w-full accent-[#145CFF]"
          />
          <span className="w-12 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] py-1 text-center font-mono-tabular text-[11px] font-bold">
            {banner.imageSettings.opacity}%
          </span>
        </div>
      </section>

      {/* 4. Overlay Settings (Optional) */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-[#0A1F44]">4. Overlay Settings (Optional)</h3>
          {banner.overlaySettings.type !== 'none' && (
            <button
              type="button"
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  overlaySettings: { ...prev.overlaySettings, type: 'none', opacity: 0 },
                }))
              }
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#64748B] hover:text-rose-600"
            >
              <Trash2 className="h-3 w-3" /> Disable Overlay
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Overlay Type</label>
            <select
              value={banner.overlaySettings.type}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  overlaySettings: {
                    ...prev.overlaySettings,
                    type: e.target.value as 'none' | 'solid' | 'gradient',
                    opacity: e.target.value === 'none' ? 0 : Math.max(25, prev.overlaySettings.opacity || 40),
                  },
                }))
              }
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs font-medium text-[#0A1F44]"
            >
              <option value="none">No Overlay</option>
              <option value="solid">Solid Overlay</option>
              <option value="gradient">Gradient Overlay</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Overlay Color</label>
            <div className="flex items-center gap-2 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2.5 h-9">
              <input
                type="color"
                aria-label="Overlay primary color"
                value={banner.overlaySettings.color || '#0A2DFF'}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    overlaySettings: { ...prev.overlaySettings, color: e.target.value },
                  }))
                }
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <input
                value={banner.overlaySettings.color}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    overlaySettings: { ...prev.overlaySettings, color: e.target.value },
                  }))
                }
                className="w-full bg-transparent font-mono-tabular text-xs font-semibold text-[#0A1F44] outline-none"
              />
            </div>
          </div>
        </div>

        {banner.overlaySettings.type === 'gradient' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1">Secondary Fade Color</label>
              <div className="flex items-center gap-2 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2.5 h-9">
                <input
                  type="color"
                  aria-label="Overlay secondary color"
                  value={banner.overlaySettings.secondaryColor || '#FFFFFF'}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      overlaySettings: { ...prev.overlaySettings, secondaryColor: e.target.value },
                    }))
                  }
                  className="h-5 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <input
                  value={banner.overlaySettings.secondaryColor}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      overlaySettings: { ...prev.overlaySettings, secondaryColor: e.target.value },
                    }))
                  }
                  className="w-full bg-transparent font-mono-tabular text-xs font-semibold text-[#0A1F44] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1">Gradient Direction</label>
              <select
                value={banner.overlaySettings.direction}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    overlaySettings: { ...prev.overlaySettings, direction: e.target.value },
                  }))
                }
                className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs font-medium text-[#0A1F44]"
              >
                <option value="to right">Left to Right</option>
                <option value="to left">Right to Left</option>
                <option value="to bottom">Top to Bottom</option>
                <option value="to top">Bottom to Top</option>
                <option value="135deg">Diagonal (135°)</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#475569] w-16 shrink-0">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={banner.overlaySettings.opacity}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                overlaySettings: { ...prev.overlaySettings, opacity: Number(e.target.value) },
              }))
            }
            className="flex-1 min-w-0 w-full accent-[#145CFF]"
          />
          <span className="w-12 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] py-1 text-center font-mono-tabular text-[11px] font-bold text-[#0A1F44]">
            {banner.overlaySettings.opacity}%
          </span>
        </div>
      </section>
    </div>
  );
};
