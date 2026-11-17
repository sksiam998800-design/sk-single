import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Sliders,
  Trash2,
} from 'lucide-react';
import type {
  NavigationFocalPoint,
  NavigationImageFit,
  NavigationSlideConfig,
  NavigationSliderSettings,
} from '../../../lib/navigationEngine';
import { MegaMenuSlider } from '../../navigation/MegaMenuSlider';
import { ResilientImage } from '../../ui/ResilientImage';
import { NavigationMediaField } from './NavigationMediaField';

interface NavigationSlideManagerProps {
  slides: NavigationSlideConfig[];
  sliderSettings: NavigationSliderSettings;
  showSlider: boolean;
  onChangeSlides: (next: NavigationSlideConfig[]) => void;
  onChangeSettings: (next: NavigationSliderSettings) => void;
  onToggleShowSlider: (next: boolean) => void;
}

export function NavigationSlideManager({
  slides,
  sliderSettings,
  showSlider,
  onChangeSlides,
  onChangeSettings,
  onToggleShowSlider,
}: NavigationSlideManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number>(slides.length > 0 ? 0 : -1);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const safeEditingIndex =
    slides.length === 0 ? -1 : Math.min(Math.max(0, editingIndex), slides.length - 1);
  const activeSlide = safeEditingIndex >= 0 ? slides[safeEditingIndex] : null;

  const addSlide = () => {
    const newSlide: NavigationSlideConfig = {
      id: `slide-tmp-${Date.now()}`,
      imageUrl: '/src/assets/images/hero_smart_tech_1794832024388.jpg',
      altText: `Featured promotion slide ${slides.length + 1}`,
      title: 'Featured Promotion',
      subtitle: 'Limited Offer',
      description: 'Highlight a flagship category, launch, or campaign directly inside this mega menu.',
      buttonText: 'Shop Now',
      buttonUrl: '/shop',
      target: '_self',
      focalPoint: 'center',
      objectFit: 'cover',
      isActive: true,
      displayOrder: slides.length,
    };
    const next = [...slides, newSlide];
    onChangeSlides(next);
    setEditingIndex(next.length - 1);
  };

  const updateSlideAt = (idx: number, patch: Partial<NavigationSlideConfig>) => {
    onChangeSlides(slides.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length || from === to) return;
    const next = [...slides];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChangeSlides(next.map((s, idx) => ({ ...s, displayOrder: idx })));
    setEditingIndex(to);
  };

  const deleteSlide = (idx: number) => {
    const next = slides.filter((_, i) => i !== idx).map((s, i) => ({ ...s, displayOrder: i }));
    onChangeSlides(next);
    setEditingIndex(next.length > 0 ? Math.min(idx, next.length - 1) : -1);
  };

  const activePreviewSlides = slides.filter((s) => s.isActive && Boolean(s.imageUrl));

  return (
    <div className="space-y-5">
      {/* Slider Master Switch + Settings Row */}
      <div className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/60 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-[#0F1D3A] dark:text-white">
              <Sliders className="h-4 w-4 text-[#145CFF]" />
              <span>Single-Image Promotional Slider Settings</span>
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Displays strictly one promotional slide at a time with directional left/right transitions.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold">
            <input
              type="checkbox"
              checked={showSlider}
              onChange={(e) => onToggleShowSlider(e.target.checked)}
              className="h-4 w-4 rounded text-[#145CFF]"
            />
            <span>Enable Slider in Mega Menu</span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={sliderSettings.autoplay}
              onChange={(e) => onChangeSettings({ ...sliderSettings, autoplay: e.target.checked })}
              className="h-4 w-4 rounded text-[#145CFF]"
            />
            <span>Autoplay Slides</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={sliderSettings.pauseOnHover}
              onChange={(e) => onChangeSettings({ ...sliderSettings, pauseOnHover: e.target.checked })}
              className="h-4 w-4 rounded text-[#145CFF]"
            />
            <span>Pause on Hover</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={sliderSettings.showArrows}
              onChange={(e) => onChangeSettings({ ...sliderSettings, showArrows: e.target.checked })}
              className="h-4 w-4 rounded text-[#145CFF]"
            />
            <span>Show Prev / Next Arrows</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={sliderSettings.showIndicators}
              onChange={(e) => onChangeSettings({ ...sliderSettings, showIndicators: e.target.checked })}
              className="h-4 w-4 rounded text-[#145CFF]"
            />
            <span>Show Pagination Dots</span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Autoplay Interval (ms)
            </label>
            <input
              type="number"
              min={1500}
              max={20000}
              step={250}
              value={sliderSettings.intervalMs}
              onChange={(e) =>
                onChangeSettings({
                  ...sliderSettings,
                  intervalMs: Math.min(20000, Math.max(1500, Number(e.target.value || 4500))),
                })
              }
              className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-mono-tabular"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Slide Transition Speed (ms)
            </label>
            <input
              type="number"
              min={150}
              max={1000}
              step={30}
              value={sliderSettings.transitionDurationMs}
              onChange={(e) =>
                onChangeSettings({
                  ...sliderSettings,
                  transitionDurationMs: Math.min(1000, Math.max(150, Number(e.target.value || 420))),
                })
              }
              className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-mono-tabular"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Frame Aspect Ratio
            </label>
            <select
              value={sliderSettings.aspectRatio}
              onChange={(e) =>
                onChangeSettings({
                  ...sliderSettings,
                  aspectRatio: e.target.value as NavigationSliderSettings['aspectRatio'],
                })
              }
              className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
            >
              <option value="4/3">4:3 Standard Card</option>
              <option value="16/10">16:10 Wide Showcase</option>
              <option value="16/9">16:9 Cinema Banner</option>
              <option value="square">1:1 Square Card</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split: Slide List + Active Slide Editor + Live Single-Image Slider Preview */}
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Left: Slides Queue */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Slides ({slides.length})
            </h4>
            <button
              type="button"
              onClick={addSlide}
              className="inline-flex items-center gap-1 rounded-lg bg-[#145CFF] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0E47D9]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Slide
            </button>
          </div>

          {slides.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center text-xs text-slate-500">
              <ImageIcon className="mx-auto mb-2 h-6 w-6 text-slate-400" />
              No slides configured. The slider section will stay hidden cleanly on the storefront.
            </div>
          ) : (
            <div className="space-y-2">
              {slides.map((slide, idx) => {
                const selected = idx === safeEditingIndex;
                return (
                  <div
                    key={slide.id || idx}
                    draggable
                    onDragStart={() => setDragIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) moveSlide(dragIndex, idx);
                      setDragIndex(null);
                    }}
                    className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${
                      selected
                        ? 'border-[#145CFF] bg-[#EEF4FF] dark:bg-blue-950/30'
                        : 'border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-400" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => setEditingIndex(idx)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <ResilientImage
                          src={slide.imageUrl}
                          alt={slide.altText || `Slide ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#0F1D3A] dark:text-white">
                          {slide.title || `Slide #${idx + 1}`}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {slide.isActive ? 'Active' : 'Disabled'}
                        </p>
                      </div>
                    </button>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        aria-label={`Move slide ${idx + 1} up`}
                        disabled={idx === 0}
                        onClick={() => moveSlide(idx, idx - 1)}
                        className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move slide ${idx + 1} down`}
                        disabled={idx === slides.length - 1}
                        onClick={() => moveSlide(idx, idx + 1)}
                        className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Embedded Live Interactive Single-Image Preview */}
          {showSlider && activePreviewSlides.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Live Slider Preview
              </p>
              <MegaMenuSlider slides={activePreviewSlides} settings={sliderSettings} compact />
            </div>
          )}
        </div>

        {/* Right: Active Slide Detail Form */}
        {activeSlide ? (
          <div className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h5 className="text-sm font-bold text-[#0F1D3A] dark:text-white">
                Edit Slide #{safeEditingIndex + 1}
              </h5>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSlideAt(safeEditingIndex, { isActive: !activeSlide.isActive })}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    activeSlide.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {activeSlide.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span>{activeSlide.isActive ? 'Enabled' : 'Disabled'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteSlide(safeEditingIndex)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Slide</span>
                </button>
              </div>
            </div>

            <NavigationMediaField
              label="Slide Promotional Image *"
              value={activeSlide.imageUrl}
              onChange={(url, publicId) =>
                updateSlideAt(safeEditingIndex, {
                  imageUrl: url,
                  ...(publicId !== undefined ? { cloudinaryPublicId: publicId } : {}),
                })
              }
              helperText="Displays one promotional image at a time inside the mega menu slider."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Image Alt Text *
                </label>
                <input
                  value={activeSlide.altText}
                  onChange={(e) => updateSlideAt(safeEditingIndex, { altText: e.target.value })}
                  placeholder="Describe promotional image for accessibility"
                  className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Eyebrow / Subtitle
                </label>
                <input
                  value={activeSlide.subtitle || ''}
                  onChange={(e) => updateSlideAt(safeEditingIndex, { subtitle: e.target.value })}
                  placeholder="e.g. Up to 35% Off"
                  className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Headline Title
                </label>
                <input
                  value={activeSlide.title || ''}
                  onChange={(e) => updateSlideAt(safeEditingIndex, { title: e.target.value })}
                  placeholder="e.g. MacBook Air M4 Showcase"
                  className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  CTA Button Label
                </label>
                <input
                  value={activeSlide.buttonText || ''}
                  onChange={(e) => updateSlideAt(safeEditingIndex, { buttonText: e.target.value })}
                  placeholder="e.g. Shop Laptops"
                  className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  CTA Target URL
                </label>
                <input
                  value={activeSlide.buttonUrl || ''}
                  onChange={(e) => updateSlideAt(safeEditingIndex, { buttonUrl: e.target.value })}
                  placeholder="/category/laptops-computers"
                  className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Link Open Target
                </label>
                <select
                  value={activeSlide.target}
                  onChange={(e) =>
                    updateSlideAt(safeEditingIndex, { target: e.target.value as '_self' | '_blank' })
                  }
                  className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="_self">Same Tab (_self)</option>
                  <option value="_blank">New Tab (_blank)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Image Fit Mode
                </label>
                <select
                  value={activeSlide.objectFit}
                  onChange={(e) =>
                    updateSlideAt(safeEditingIndex, { objectFit: e.target.value as NavigationImageFit })
                  }
                  className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="cover">Cover (Edge-to-Edge)</option>
                  <option value="contain">Contain (Full Product View)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Image Focal Point
                </label>
                <select
                  value={activeSlide.focalPoint}
                  onChange={(e) =>
                    updateSlideAt(safeEditingIndex, { focalPoint: e.target.value as NavigationFocalPoint })
                  }
                  className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Optional Description
              </label>
              <textarea
                rows={2}
                value={activeSlide.description || ''}
                onChange={(e) => updateSlideAt(safeEditingIndex, { description: e.target.value })}
                placeholder="Short supporting caption shown on desktop mega menu cards"
                className="w-full rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
            <ImageIcon className="h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-[#0F1D3A] dark:text-white">
              Add a Single-Image Promotional Slide
            </p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Showcase featured launches, campaigns, and category deals inside the Mega Menu slider.
            </p>
            <button
              type="button"
              onClick={addSlide}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
            >
              <Plus className="h-4 w-4" />
              Create First Slide
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
