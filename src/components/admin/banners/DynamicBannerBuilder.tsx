import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  Image as ImageIcon,
  LayoutGrid,
  Lightbulb,
  Paintbrush,
  Palette,
  Save,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  createDefaultDynamicBanner,
  getWidthModeLabel,
  normalizeBannerFromApi,
  type DynamicBannerConfig,
} from '../../../lib/bannerBuilder';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { BannerRecord } from '../../../types/commerce';
import { ConfirmDialog } from '../../ui/Modal';
import { BannerBackgroundEditor } from './BannerBackgroundEditor';
import { BannerContentEditor } from './BannerContentEditor';
import { BannerStyleEditor } from './BannerStyleEditor';
import { BannerPositionEditor } from './BannerPositionEditor';
import { BannerLivePreview } from './BannerLivePreview';

type BuilderTabKey = 'background' | 'content' | 'style' | 'position' | 'preview';

const BUILDER_TABS: Array<{
  key: BuilderTabKey;
  label: string;
  icon: React.FC<{ className?: string }>;
  tip: string;
}> = [
  {
    key: 'background',
    label: 'Background',
    icon: Palette,
    tip: 'Use gradient + image for premium look. Set proper opacity for readability.',
  },
  {
    key: 'content',
    label: 'Content',
    icon: Edit3,
    tip: 'Keep headlines crisp under 6 words and highlight key phrases for instant scan.',
  },
  {
    key: 'style',
    label: 'Style & Design',
    icon: Paintbrush,
    tip: 'Start with a design preset, then fine-tune font contrast and button radius.',
  },
  {
    key: 'position',
    label: 'Position & Order',
    icon: LayoutGrid,
    tip: 'Combine Half (50%) or 1/3 Width banners in the same slot for responsive multi-column grids.',
  },
  {
    key: 'preview',
    label: 'Preview',
    icon: Eye,
    tip: 'Switch Desktop, Tablet, and Mobile viewports to confirm readability before publishing.',
  },
];

interface DynamicBannerBuilderProps {
  initialBanner?: BannerRecord | DynamicBannerConfig | null;
  bannerId?: string | null;
  asModal?: boolean;
  onClose?: () => void;
  onSaved?: (savedBanner: BannerRecord) => void;
}

function buildInitialBannerState(initialBanner?: BannerRecord | DynamicBannerConfig | null): DynamicBannerConfig {
  return initialBanner
    ? normalizeBannerFromApi(initialBanner as unknown as Record<string, unknown>)
    : createDefaultDynamicBanner();
}

export const DynamicBannerBuilder: React.FC<DynamicBannerBuilderProps> = ({
  initialBanner,
  bannerId,
  asModal = false,
  onClose,
  onSaved,
}) => {
  const dispatch = useAppDispatch();
  const isEditing = Boolean(bannerId || initialBanner?.id);

  const [activeTab, setActiveTab] = useState<BuilderTabKey>('background');
  const [mobilePane, setMobilePane] = useState<'controls' | 'preview'>('controls');
  const [banner, setBanner] = useState<DynamicBannerConfig>(() => buildInitialBannerState(initialBanner));
  const savedSnapshotRef = useRef<string>(JSON.stringify(buildInitialBannerState(initialBanner)));
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = buildInitialBannerState(initialBanner);
    setBanner(next);
    savedSnapshotRef.current = JSON.stringify(next);
    setError(null);
    setActiveTab('background');
    setMobilePane('controls');
    setConfirmCloseOpen(false);
  }, [initialBanner, bannerId]);

  const isDirty = JSON.stringify(banner) !== savedSnapshotRef.current;

  const handleRequestClose = useCallback(() => {
    if (!onClose) return;
    if (isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    if (!asModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmCloseOpen || document.querySelector('[data-nested-preview-modal]')) return;
        e.preventDefault();
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [asModal, confirmCloseOpen, handleRequestClose]);

  const activeTip = BUILDER_TABS.find((t) => t.key === activeTab)?.tip || BUILDER_TABS[0].tip;

  const submitBanner = async (overrideStatus?: 'draft' | 'published') => {
    setError(null);
    if (!banner.title.trim() || banner.title.trim().length < 2) {
      setError('Banner title is required (minimum 2 characters).');
      setActiveTab('content');
      setMobilePane('controls');
      return;
    }
    if (
      (banner.backgroundType === 'image' || banner.backgroundType === 'image_overlay') &&
      !banner.desktopImageUrl.trim()
    ) {
      setError('A background image is required when Image or Image Overlay background type is selected.');
      setActiveTab('background');
      setMobilePane('controls');
      return;
    }

    const nextStatus = overrideStatus || banner.status || 'published';
    const nextIsPublished = nextStatus === 'published' || nextStatus === 'scheduled';

    const payload = {
      ...banner,
      name: banner.name.trim() || banner.title.trim(),
      title: banner.title.trim(),
      ctaText: banner.buttonSettings.primary.text || banner.ctaText || 'Shop Now',
      destinationUrl: banner.buttonSettings.primary.url || banner.destinationUrl || '/shop',
      secondaryCtaText: banner.buttonSettings.secondary.text || '',
      secondaryDestinationUrl: banner.buttonSettings.secondary.url || '/offers',
      status: nextStatus,
      isPublished: nextIsPublished,
    };

    setSaving(true);
    try {
      const targetId = bannerId || banner.id;
      const res = targetId
        ? await apiRequest<{ ok: true; banner: BannerRecord }>(`/api/admin/banners/${targetId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ ok: true; banner: BannerRecord }>('/api/admin/banners', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      savedSnapshotRef.current = JSON.stringify(banner);
      dispatch(
        showToast({
          variant: 'success',
          message:
            nextStatus === 'draft'
              ? 'Banner saved as draft.'
              : isEditing
                ? 'Dynamic banner updated.'
                : 'Dynamic banner created.',
        }),
      );
      onSaved?.(res.banner);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save banner.';
      setError(msg);
      dispatch(showToast({ variant: 'error', message: msg }));
    } finally {
      setSaving(false);
    }
  };

  const innerContent = (
    <div
      className={`flex flex-col w-full border border-[#DCE6F7] bg-[#FBFCFF] shadow-2xl overflow-hidden ${
        asModal ? 'max-h-[95dvh] sm:max-h-[92dvh] min-h-0 rounded-2xl sm:rounded-3xl' : 'rounded-3xl'
      }`}
    >
      {/* Top Modal Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-[#E4EAF5] bg-white px-4 py-3 sm:px-6 sm:py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-[#145CFF] text-white shadow-md shadow-blue-500/25">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-extrabold tracking-tight text-[#0A1F44] truncate">
              {isEditing ? 'Edit Dynamic Banner' : 'Create Dynamic Banner'}
            </h2>
            <p className="text-[11.5px] sm:text-xs text-[#64748B] truncate">
              Design stunning banners with multiple options
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Close banner builder"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E4EAF5] bg-[#F8FAFF] text-[#475569] transition-colors hover:bg-slate-100 hover:text-[#0A1F44]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 5 Primary Navigation Tabs (single-row scrollable on compact viewports) */}
      <div
        role="tablist"
        aria-label="Banner builder sections"
        className="shrink-0 min-w-0 w-full banner-builder-tabs-scroll flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto border-b border-[#E4EAF5] bg-white px-4 py-2.5 sm:px-6"
      >
        {BUILDER_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#145CFF] text-white shadow-sm shadow-blue-500/25'
                  : 'bg-[#F4F7FF] text-[#475569] hover:bg-[#EAF1FF] hover:text-[#0A1F44]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile / Tablet Quick Switcher between Controls and Live Preview (< 1024px) */}
      {activeTab !== 'preview' && (
        <div className="lg:hidden shrink-0 flex items-center gap-2 border-b border-[#E4EAF5] bg-[#F8FAFF] px-4 py-2">
          <button
            type="button"
            onClick={() => setMobilePane('controls')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-colors ${
              mobilePane === 'controls'
                ? 'bg-white text-[#145CFF] shadow-2xs ring-1 ring-[#DCE6F7]'
                : 'text-[#64748B]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Edit Controls</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('preview')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-colors ${
              mobilePane === 'preview'
                ? 'bg-white text-[#145CFF] shadow-2xs ring-1 ring-[#DCE6F7]'
                : 'text-[#64748B]'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Live Preview</span>
          </button>
        </div>
      )}

      {error && (
        <div className="shrink-0 mx-4 sm:mx-6 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Main 2-Column Workspace (fills exact bounded container height when in modal) */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3.5 sm:px-6 sm:py-4">
        {activeTab === 'preview' ? (
          <div className="space-y-4">
            <BannerLivePreview banner={banner} onChange={setBanner} expanded />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-[#E4EAF5] bg-white p-4 text-xs">
              <div>
                <div className="text-[10.5px] font-semibold text-[#64748B]">Placement</div>
                <div className="font-bold text-[#0A1F44] capitalize mt-0.5">{banner.placement.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-semibold text-[#64748B]">Layout Width</div>
                <div className="font-bold text-[#0A1F44] mt-0.5">
                  {getWidthModeLabel(banner.widthMode, banner.customWidthPercent)}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-semibold text-[#64748B]">Background Mode</div>
                <div className="font-bold text-[#0A1F44] capitalize mt-0.5">
                  {banner.backgroundType.replace(/_/g, ' ')}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-semibold text-[#64748B]">Status &amp; Order</div>
                <div className="font-bold text-[#0A1F44] capitalize mt-0.5">
                  {banner.status} · #{banner.displayOrder}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className={`lg:col-span-5 min-w-0 ${mobilePane === 'controls' ? 'block' : 'hidden lg:block'}`}>
              {activeTab === 'background' && (
                <BannerBackgroundEditor banner={banner} onChange={setBanner} />
              )}
              {activeTab === 'content' && (
                <BannerContentEditor banner={banner} onChange={setBanner} />
              )}
              {activeTab === 'style' && (
                <BannerStyleEditor banner={banner} onChange={setBanner} />
              )}
              {activeTab === 'position' && (
                <BannerPositionEditor banner={banner} onChange={setBanner} />
              )}
            </div>

            <div className={`lg:col-span-7 min-w-0 lg:sticky lg:top-0 ${mobilePane === 'preview' ? 'block' : 'hidden lg:block'}`}>
              <BannerLivePreview banner={banner} onChange={setBanner} />
            </div>
          </div>
        )}
      </div>

      {/* Pinned Bottom Footer Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2.5 sm:gap-3 border-t border-[#E4EAF5] bg-white px-4 py-2.5 sm:px-6 sm:py-3">
        {/* Pro Tips Callout (Desktop wide screens to prevent footer overcrowding on 1024px/tablet/mobile) */}
        <div className="hidden xl:flex items-start gap-2.5 rounded-xl border border-[#DCE6F7] bg-[#F4F8FF] px-3.5 py-2 max-w-md">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#145CFF]" />
          <div className="text-[11px] leading-snug text-[#334155]">
            <span className="font-bold text-[#0A1F44]">Pro Tips: </span>
            {activeTip}
          </div>
        </div>

        {/* Display Order, Status Toggle & Actions */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3.5 xl:ml-auto w-full xl:w-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#0A1F44]">Order</span>
              <div className="inline-flex items-center rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-1.5 h-8 sm:h-9">
                <input
                  type="number"
                  min={0}
                  aria-label="Banner display order"
                  value={banner.displayOrder}
                  onChange={(e) => setBanner((p) => ({ ...p, displayOrder: Math.max(0, Number(e.target.value)) }))}
                  className="w-9 bg-transparent text-center font-mono-tabular text-xs font-bold text-[#0A1F44] outline-none"
                />
                <div className="flex flex-col border-l border-[#E4EAF5] pl-1">
                  <button
                    type="button"
                    aria-label="Increase display order"
                    onClick={() => setBanner((p) => ({ ...p, displayOrder: Number(p.displayOrder || 0) + 1 }))}
                    className="text-[#64748B] hover:text-[#145CFF]"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Decrease display order"
                    onClick={() =>
                      setBanner((p) => ({ ...p, displayOrder: Math.max(0, Number(p.displayOrder || 0) - 1) }))
                    }
                    className="text-[#64748B] hover:text-[#145CFF]"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active/Draft Toggle Switch */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#0A1F44] hidden sm:inline">Status</span>
              <button
                type="button"
                role="switch"
                aria-checked={banner.status === 'published' || banner.isPublished}
                onClick={() =>
                  setBanner((p) => {
                    const nextActive = p.status !== 'published';
                    return {
                      ...p,
                      status: nextActive ? 'published' : 'draft',
                      isPublished: nextActive,
                    };
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-transparent text-xs font-semibold"
              >
                <span
                  className={`relative inline-flex h-6 w-10 sm:w-11 items-center rounded-full transition-colors ${
                    banner.status === 'published' ? 'bg-[#145CFF]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                      banner.status === 'published' ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </span>
                <span className={banner.status === 'published' ? 'text-[#0A1F44]' : 'text-[#64748B]'}>
                  {banner.status === 'published' ? 'Active' : banner.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 ml-auto sm:ml-0">
            {onClose && (
              <button
                type="button"
                onClick={handleRequestClose}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] bg-white px-3 sm:px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => submitBanner('draft')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6F7] bg-[#F4F8FF] px-3 sm:px-3.5 py-2 text-xs font-semibold text-[#145CFF] hover:bg-[#EAF1FF] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => submitBanner()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 sm:px-5 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/25 hover:bg-[#0E47D9] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : isEditing ? 'Update Banner' : 'Create Banner'}</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        onConfirm={() => {
          setConfirmCloseOpen(false);
          onClose?.();
        }}
        title="Discard unsaved changes?"
        message="You have unsaved edits in the Dynamic Banner Builder. Closing now will discard those changes."
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        destructive
      />
    </div>
  );

  if (asModal) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Edit Dynamic Banner' : 'Create Dynamic Banner'}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) handleRequestClose();
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-[#071B3A]/60 p-2 sm:p-4 lg:p-5 backdrop-blur-xs"
      >
        <div className="w-full min-w-0 max-w-[min(calc(100vw-1rem),1220px)] max-h-[95dvh] sm:max-h-[92dvh] flex min-h-0">
          {innerContent}
        </div>
      </div>
    );
  }

  return <div className="w-full max-w-[1260px] mx-auto">{innerContent}</div>;
};
