import React from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import {
  BANNER_PLACEMENT_OPTIONS,
  type BannerPlacement,
  type BannerStatus,
  type BannerWidthMode,
  type DynamicBannerConfig,
} from '../../../lib/bannerBuilder';
import { toLocalDateTimeInputValue } from '../../../lib/dateTime';

const WIDTH_MODES: Array<{ mode: BannerWidthMode; label: string; hint: string }> = [
  { mode: 'full', label: 'Full Width', hint: '100%' },
  { mode: 'half', label: 'Half Width', hint: '50% (2/row)' },
  { mode: 'one_third', label: '1/3 Width', hint: '33% (3/row)' },
  { mode: 'two_thirds', label: '2/3 Width', hint: '67% Span' },
  { mode: 'custom', label: 'Custom %', hint: 'Flexible' },
];

interface BannerPositionEditorProps {
  banner: DynamicBannerConfig;
  onChange: (updater: (prev: DynamicBannerConfig) => DynamicBannerConfig) => void;
}

export const BannerPositionEditor: React.FC<BannerPositionEditorProps> = ({ banner, onChange }) => {
  return (
    <div className="space-y-4">
      {/* 1. Storefront Placement */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <h3 className="text-[13px] font-bold text-[#0A1F44]">1. Homepage &amp; Storefront Placement</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Placement Slot *</label>
            <select
              value={banner.placement}
              onChange={(e) => onChange((p) => ({ ...p, placement: e.target.value as BannerPlacement }))}
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs font-medium text-[#0A1F44]"
            >
              {BANNER_PLACEMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.group} — {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">
              Custom Slot Key {banner.placement === 'custom' ? '*' : '(Optional)'}
            </label>
            <input
              value={banner.layoutSettings.customSlotKey}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  layoutSettings: { ...p.layoutSettings, customSlotKey: e.target.value },
                }))
              }
              placeholder="e.g., eid-mega-showcase"
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 font-mono-tabular text-xs text-[#0A1F44]"
            />
          </div>
        </div>
      </section>

      {/* 2. Width & Multi-Column Grid */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <h3 className="text-[13px] font-bold text-[#0A1F44]">2. Layout Width &amp; Grid Spacing</h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {WIDTH_MODES.map((w) => {
            const active = banner.widthMode === w.mode;
            return (
              <button
                key={w.mode}
                type="button"
                onClick={() => onChange((p) => ({ ...p, widthMode: w.mode }))}
                className={`rounded-xl border px-2 py-2.5 text-center transition-all ${
                  active
                    ? 'border-[#145CFF] bg-[#EEF4FF] text-[#145CFF] ring-1 ring-[#145CFF]/30'
                    : 'border-[#E4EAF5] bg-[#F8FAFF] text-[#475569] hover:border-blue-200'
                }`}
              >
                <div className="text-[11px] font-bold">{w.label}</div>
                <div className="text-[10px] opacity-75">{w.hint}</div>
              </button>
            );
          })}
        </div>

        {banner.widthMode === 'custom' && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] font-semibold text-[#475569] w-24 shrink-0">Custom Width</span>
            <input
              type="range"
              min={15}
              max={100}
              value={banner.customWidthPercent}
              onChange={(e) => onChange((p) => ({ ...p, customWidthPercent: Number(e.target.value) }))}
              className="flex-1 min-w-0 w-full accent-[#145CFF]"
            />
            <span className="w-14 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] py-1 text-center font-mono-tabular text-[11px] font-bold">
              {banner.customWidthPercent}%
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Col Gap (px)</label>
            <input
              type="number"
              min={0}
              max={64}
              value={banner.layoutSettings.columnGap}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  layoutSettings: { ...p.layoutSettings, columnGap: Number(e.target.value) },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Row Gap (px)</label>
            <input
              type="number"
              min={0}
              max={64}
              value={banner.layoutSettings.rowGap}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  layoutSettings: { ...p.layoutSettings, rowGap: Number(e.target.value) },
                }))
              }
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Display Order</label>
            <input
              type="number"
              min={0}
              value={banner.displayOrder}
              onChange={(e) => onChange((p) => ({ ...p, displayOrder: Number(e.target.value) }))}
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Priority Tie-Break</label>
            <input
              type="number"
              value={banner.priority}
              onChange={(e) => onChange((p) => ({ ...p, priority: Number(e.target.value) }))}
              className="w-full h-8 rounded-lg border border-[#E4EAF5] bg-[#F8FAFF] px-2 font-mono-tabular text-[11px]"
            />
          </div>
        </div>
      </section>

      {/* 3. Device Visibility & Schedule */}
      <section className="rounded-2xl border border-[#E4EAF5] bg-white p-4 shadow-2xs space-y-3">
        <h3 className="text-[13px] font-bold text-[#0A1F44]">3. Device Visibility, Status &amp; Schedule</h3>

        <div className="flex flex-wrap gap-3">
          {[
            { key: 'visibleOnDesktop' as const, label: 'Desktop', icon: Monitor },
            { key: 'visibleOnTablet' as const, label: 'Tablet', icon: Tablet },
            { key: 'visibleOnMobile' as const, label: 'Mobile', icon: Smartphone },
          ].map((dev) => {
            const Icon = dev.icon;
            const active = banner.layoutSettings[dev.key];
            return (
              <button
                key={dev.key}
                type="button"
                onClick={() =>
                  onChange((p) => ({
                    ...p,
                    layoutSettings: { ...p.layoutSettings, [dev.key]: !p.layoutSettings[dev.key] },
                  }))
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-[#145CFF] bg-[#EEF4FF] text-[#145CFF]'
                    : 'border-[#E4EAF5] bg-slate-50 text-[#64748B]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{dev.label}: {active ? 'Visible' : 'Hidden'}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Publication Status</label>
            <select
              value={banner.status}
              onChange={(e) => {
                const nextStatus = e.target.value as BannerStatus;
                onChange((p) => ({
                  ...p,
                  status: nextStatus,
                  isPublished: nextStatus === 'published' || nextStatus === 'scheduled',
                }));
              }}
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-3 text-xs font-semibold text-[#0A1F44]"
            >
              <option value="published">Published (Live)</option>
              <option value="draft">Draft (Hidden)</option>
              <option value="scheduled">Scheduled Window</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Starts At</label>
            <input
              type="datetime-local"
              value={toLocalDateTimeInputValue(banner.startsAt)}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  startsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                }))
              }
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Ends At</label>
            <input
              type="datetime-local"
              value={toLocalDateTimeInputValue(banner.endsAt)}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  endsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                }))
              }
              className="w-full h-9 rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] px-2.5 text-xs"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
