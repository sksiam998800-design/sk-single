import { useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  FolderPlus,
  Layers,
  LayoutGrid,
  Link as LinkIcon,
  Plus,
  Save,
  Settings2,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  DEFAULT_NAVIGATION_MENU_SETTINGS,
  isSafeNavigationUrl,
  slugifyNavigationSegment,
  type NavigationGroupConfig,
  type NavigationItemConfig,
  type NavigationMenuConfig,
  type NavigationMenuType,
  type NavigationPromotionConfig,
} from '../../../lib/navigationEngine';
import type { CategoryItem } from '../../../types/commerce';
import { NAV_ICON_OPTIONS, NavIcon } from '../../navigation/NavIcon';
import { NavigationMediaField } from './NavigationMediaField';
import { NavigationSlideManager } from './NavigationSlideManager';

interface NavigationMenuEditorModalProps {
  initialMenu: NavigationMenuConfig | null;
  categories: CategoryItem[];
  nextDisplayOrder: number;
  saving: boolean;
  onClose: () => void;
  onSave: (menu: NavigationMenuConfig) => Promise<void>;
  onPreview: (menu: NavigationMenuConfig) => void;
}

type EditorTab = 'general' | 'groups' | 'slider' | 'promotions' | 'layout';

const INTERNAL_ROUTE_PRESETS = [
  { label: 'Homepage (/)', url: '/' },
  { label: 'Shop All (/shop)', url: '/shop' },
  { label: 'Special Offers (/offers)', url: '/offers' },
  { label: 'Best Sellers (/shop?sort=popular)', url: '/shop?sort=popular' },
  { label: 'New Arrivals (/shop?sort=newest)', url: '/shop?sort=newest' },
  { label: 'Discounted Deals (/shop?discount=true)', url: '/shop?discount=true' },
  { label: 'Blog & Guides (/blog)', url: '/blog' },
  { label: 'Track Order (/track-order)', url: '/track-order' },
  { label: 'FAQs (/faqs)', url: '/faqs' },
  { label: 'About Us (/about)', url: '/about' },
  { label: 'Contact Support (/contact)', url: '/contact' },
];

function createEmptyMenu(nextDisplayOrder: number): NavigationMenuConfig {
  return {
    id: '',
    name: '',
    slug: '',
    label: '',
    type: 'mega_menu',
    url: '/shop',
    openInNewTab: false,
    icon: 'LayoutGrid',
    badgeText: '',
    isActive: true,
    isPublished: true,
    displayOrder: nextDisplayOrder,
    startsAt: null,
    endsAt: null,
    groups: [
      {
        id: `grp-tmp-${Date.now()}`,
        title: 'Featured Links',
        slug: 'featured-links',
        url: '/shop',
        icon: 'Sparkles',
        description: '',
        isActive: true,
        displayOrder: 0,
        items: [],
      },
    ],
    promotions: [],
    slides: [],
    settings: {
      ...DEFAULT_NAVIGATION_MENU_SETTINGS,
      sliderSettings: { ...DEFAULT_NAVIGATION_MENU_SETTINGS.sliderSettings },
    },
  };
}

function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NavigationMenuEditorModal({
  initialMenu,
  categories,
  nextDisplayOrder,
  saving,
  onClose,
  onSave,
  onPreview,
}: NavigationMenuEditorModalProps) {
  const [tab, setTab] = useState<EditorTab>('general');
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState<NavigationMenuConfig>(() =>
    initialMenu
      ? JSON.parse(JSON.stringify(initialMenu))
      : createEmptyMenu(nextDisplayOrder),
  );
  const [selectedGroupIdx, setSelectedGroupIdx] = useState<number>(0);

  const safeGroupIdx =
    draft.groups.length === 0 ? -1 : Math.min(Math.max(0, selectedGroupIdx), draft.groups.length - 1);
  const currentGroup = safeGroupIdx >= 0 ? draft.groups[safeGroupIdx] : null;

  const routeOptions = [
    ...INTERNAL_ROUTE_PRESETS,
    ...categories.map((c) => ({
      label: `Category: ${c.name} (/category/${c.slug})`,
      url: `/category/${c.slug}`,
    })),
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!draft.label.trim()) {
      setTab('general');
      setFormError('Menu label is required.');
      return;
    }
    if (!isSafeNavigationUrl(draft.url)) {
      setTab('general');
      setFormError('Destination URL must start with /, https://, http://, or #.');
      return;
    }
    if (draft.startsAt && draft.endsAt && new Date(draft.endsAt) < new Date(draft.startsAt)) {
      setTab('general');
      setFormError('End date/time must be after start date/time.');
      return;
    }

    for (const grp of draft.groups) {
      if (!grp.title.trim()) {
        setTab('groups');
        setFormError('Every group must have a title.');
        return;
      }
      for (const item of grp.items) {
        if (!item.label.trim() || !isSafeNavigationUrl(item.url)) {
          setTab('groups');
          setFormError(`Item "${item.label || 'Unnamed'}" needs a valid label and URL.`);
          return;
        }
      }
    }

    for (const sl of draft.slides) {
      if (!sl.imageUrl.trim() || !isSafeNavigationUrl(sl.imageUrl) || !sl.altText.trim()) {
        setTab('slider');
        setFormError('Every promotional slide must have a valid image URL and alt text.');
        return;
      }
    }

    await onSave({
      ...draft,
      name: draft.name.trim() || draft.label.trim(),
      slug: slugifyNavigationSegment(draft.slug || draft.label),
    });
  };

  // Group & Dropdown Item helpers
  const addGroup = () => {
    const grp: NavigationGroupConfig = {
      id: `grp-tmp-${Date.now()}`,
      title: `Category Group ${draft.groups.length + 1}`,
      slug: `category-group-${draft.groups.length + 1}`,
      url: '',
      icon: 'LayoutGrid',
      description: '',
      isActive: true,
      displayOrder: draft.groups.length,
      items: [],
    };
    const nextGroups = [...draft.groups, grp];
    setDraft((prev) => ({ ...prev, groups: nextGroups }));
    setSelectedGroupIdx(nextGroups.length - 1);
  };

  const updateGroup = (idx: number, patch: Partial<NavigationGroupConfig>) => {
    setDraft((prev) => ({
      ...prev,
      groups: prev.groups.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
    }));
  };

  const moveGroup = (from: number, to: number) => {
    if (to < 0 || to >= draft.groups.length) return;
    setDraft((prev) => {
      const next = [...prev.groups];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, groups: next.map((g, i) => ({ ...g, displayOrder: i })) };
    });
    setSelectedGroupIdx(to);
  };

  const deleteGroup = (idx: number) => {
    setDraft((prev) => {
      const next = prev.groups.filter((_, i) => i !== idx).map((g, i) => ({ ...g, displayOrder: i }));
      return { ...prev, groups: next };
    });
    setSelectedGroupIdx((prev) => Math.max(0, prev - 1));
  };

  const addItemToGroup = (groupIdx: number) => {
    const newItem: NavigationItemConfig = {
      id: `item-tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `New Item ${draft.groups[groupIdx].items.length + 1}`,
      slug: `new-item-${draft.groups[groupIdx].items.length + 1}`,
      url: '/shop',
      icon: 'Tag',
      description: '',
      target: '_self',
      badgeText: '',
      isActive: true,
      displayOrder: draft.groups[groupIdx].items.length,
      visibilitySettings: {
        showIcon: true,
        showDescription: true,
        desktopVisible: true,
        mobileVisible: true,
      },
    };
    setDraft((prev) => ({
      ...prev,
      groups: prev.groups.map((g, idx) =>
        idx === groupIdx ? { ...g, items: [...g.items, newItem] } : g,
      ),
    }));
  };

  const updateItem = (groupIdx: number, itemIdx: number, patch: Partial<NavigationItemConfig>) => {
    setDraft((prev) => ({
      ...prev,
      groups: prev.groups.map((g, gi) =>
        gi === groupIdx
          ? {
              ...g,
              items: g.items.map((it, ii) => (ii === itemIdx ? { ...it, ...patch } : it)),
            }
          : g,
      ),
    }));
  };

  const moveItem = (groupIdx: number, from: number, to: number) => {
    const items = draft.groups[groupIdx]?.items || [];
    if (to < 0 || to >= items.length) return;
    setDraft((prev) => ({
      ...prev,
      groups: prev.groups.map((g, gi) => {
        if (gi !== groupIdx) return g;
        const next = [...g.items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return { ...g, items: next.map((it, i) => ({ ...it, displayOrder: i })) };
      }),
    }));
  };

  const deleteItem = (groupIdx: number, itemIdx: number) => {
    setDraft((prev) => ({
      ...prev,
      groups: prev.groups.map((g, gi) =>
        gi === groupIdx
          ? {
              ...g,
              items: g.items.filter((_, ii) => ii !== itemIdx).map((it, i) => ({ ...it, displayOrder: i })),
            }
          : g,
      ),
    }));
  };

  const addPromotion = () => {
    const newPromo: NavigationPromotionConfig = {
      id: `promo-tmp-${Date.now()}`,
      title: 'Featured Offer',
      subtitle: 'Limited time curated savings',
      badgeText: 'PROMO',
      imageUrl: '',
      altText: 'Featured offer',
      ctaText: 'Shop Offers',
      ctaUrl: '/offers',
      theme: 'royal-blue',
      isActive: true,
      displayOrder: draft.promotions.length,
    };
    setDraft((prev) => ({ ...prev, promotions: [...prev.promotions, newPromo] }));
  };

  const tabs: { key: EditorTab; label: string; icon: typeof LinkIcon }[] = [
    { key: 'general', label: 'General & Routing', icon: LinkIcon },
    { key: 'groups', label: `Groups & Links (${draft.groups.reduce((s, g) => s + g.items.length, 0)})`, icon: Layers },
    { key: 'slider', label: `Promo Slider (${draft.slides.length})`, icon: Sliders },
    { key: 'promotions', label: `Promo Banners (${draft.promotions.length})`, icon: Sparkles },
    { key: 'layout', label: 'Layout & Visibility', icon: Settings2 },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initialMenu ? `Edit ${initialMenu.label}` : 'Create Navigation Menu'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-5 backdrop-blur-xs"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-[#0B1730] shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4EAF5] dark:border-slate-800 px-5 py-3.5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#145CFF]">
              Navigation & Mega Menu Builder
            </p>
            <h2 className="font-display text-lg font-extrabold text-[#0F1D3A] dark:text-white">
              {initialMenu ? `Edit Menu: ${initialMenu.label}` : 'Create New Navigation Menu'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPreview(draft)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#C7DAFF] bg-[#EEF4FF] px-3.5 py-2 text-xs font-semibold text-[#1155EE] hover:bg-blue-100"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview Mega Menu</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close editor"
              className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Builder Tabs */}
        <div className="banner-builder-tabs-scroll flex shrink-0 gap-1 overflow-x-auto border-b border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/60 px-5 py-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#145CFF] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {formError && (
          <div className="mx-5 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
            {formError}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* TAB 1: GENERAL & ROUTING */}
          {tab === 'general' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Menu Label (Storefront Display) *
                </label>
                <input
                  required
                  value={draft.label}
                  onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Electronics"
                  className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Internal Name
                </label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Optional admin reference name"
                  className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Menu Type
                </label>
                <select
                  value={draft.type}
                  onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value as NavigationMenuType }))}
                  className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                >
                  <option value="mega_menu">Wide Mega Menu (Columns + Promo Slider)</option>
                  <option value="dropdown">Standard Dropdown Menu</option>
                  <option value="link">Direct Link Only</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Destination URL *
                </label>
                <input
                  required
                  value={draft.url}
                  onChange={(e) => setDraft((p) => ({ ...p, url: e.target.value }))}
                  placeholder="/category/mobiles-tablets or https://..."
                  className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Quick Select Internal Route or Store Category
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setDraft((p) => ({ ...p, url: e.target.value }));
                  }}
                  className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="">-- Pick an internal page or category to populate Destination URL --</option>
                  {routeOptions.map((opt) => (
                    <option key={opt.url} value={opt.url}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Menu Icon
                </label>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCE5F5] bg-[#F8FAFF] text-[#145CFF]">
                    <NavIcon name={draft.icon} className="h-4 w-4" />
                  </span>
                  <select
                    value={draft.icon || ''}
                    onChange={(e) => setDraft((p) => ({ ...p, icon: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="">No Icon (Hide)</option>
                    {NAV_ICON_OPTIONS.map((iconName) => (
                      <option key={iconName} value={iconName}>
                        {iconName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Optional Badge Text
                </label>
                <input
                  value={draft.badgeText || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, badgeText: e.target.value }))}
                  placeholder="e.g. HOT, NEW, 50% OFF"
                  className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Optional Schedule Start
                </label>
                <input
                  type="datetime-local"
                  value={toLocalDateTimeInput(draft.startsAt)}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      startsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                  className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Optional Schedule End
                </label>
                <input
                  type="datetime-local"
                  value={toLocalDateTimeInput(draft.endsAt)}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      endsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                  className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                />
              </div>

              <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
                <label className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5F5] dark:border-slate-700 px-3.5 py-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => setDraft((p) => ({ ...p, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded text-[#145CFF]"
                  />
                  <span>Menu Active (Enabled)</span>
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5F5] dark:border-slate-700 px-3.5 py-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.isPublished}
                    onChange={(e) => setDraft((p) => ({ ...p, isPublished: e.target.checked }))}
                    className="h-4 w-4 rounded text-[#145CFF]"
                  />
                  <span>Published on Storefront</span>
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5F5] dark:border-slate-700 px-3.5 py-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.openInNewTab}
                    onChange={(e) => setDraft((p) => ({ ...p, openInNewTab: e.target.checked }))}
                    className="h-4 w-4 rounded text-[#145CFF]"
                  />
                  <span>Open Destination in New Tab</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: LEVEL 2 GROUPS & DROPDOWN ITEMS */}
          {tab === 'groups' && (
            <div className="grid gap-5 lg:grid-cols-[270px_1fr]">
              {/* Left: Groups List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Category Groups ({draft.groups.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addGroup}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#145CFF] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Add Group
                  </button>
                </div>

                {draft.groups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500">
                    No category groups yet. Click "Add Group" to create dropdown columns.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {draft.groups.map((grp, idx) => (
                      <div
                        key={grp.id || idx}
                        className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${
                          idx === safeGroupIdx
                            ? 'border-[#145CFF] bg-[#EEF4FF] dark:bg-blue-950/30'
                            : 'border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedGroupIdx(idx)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-xs font-bold text-[#0F1D3A] dark:text-white">
                            {grp.title || 'Untitled Group'}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {grp.items.length} link{grp.items.length === 1 ? '' : 's'} ·{' '}
                            {grp.isActive ? 'Visible' : 'Hidden'}
                          </p>
                        </button>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            aria-label={`Move group ${grp.title} up`}
                            onClick={() => moveGroup(idx, idx - 1)}
                            className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draft.groups.length - 1}
                            aria-label={`Move group ${grp.title} down`}
                            onClick={() => moveGroup(idx, idx + 1)}
                            className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Active Group Details + Unlimited Dropdown Links */}
              {currentGroup ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/60 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#0F1D3A] dark:text-white">
                        Group Settings: {currentGroup.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={currentGroup.isActive}
                            onChange={(e) => updateGroup(safeGroupIdx, { isActive: e.target.checked })}
                            className="h-4 w-4 rounded text-[#145CFF]"
                          />
                          <span>Group Active</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => deleteGroup(safeGroupIdx)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Group
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                          Group Heading *
                        </label>
                        <input
                          value={currentGroup.title}
                          onChange={(e) => updateGroup(safeGroupIdx, { title: e.target.value })}
                          className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                          Optional Heading URL
                        </label>
                        <input
                          value={currentGroup.url || ''}
                          onChange={(e) => updateGroup(safeGroupIdx, { url: e.target.value })}
                          placeholder="/category/..."
                          className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                          Group Icon
                        </label>
                        <select
                          value={currentGroup.icon || ''}
                          onChange={(e) => updateGroup(safeGroupIdx, { icon: e.target.value })}
                          className="w-full h-9 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                        >
                          <option value="">No Icon</option>
                          {NAV_ICON_OPTIONS.map((ic) => (
                            <option key={ic} value={ic}>
                              {ic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Links inside this Group */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Dropdown Links ({currentGroup.items.length})
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Supports unlimited links (50+ scroll cleanly inside viewport-clamped mega menus).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addItemToGroup(safeGroupIdx)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#145CFF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Dropdown Item
                      </button>
                    </div>

                    {currentGroup.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                        No dropdown links in "{currentGroup.title}" yet. Click "Add Dropdown Item".
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {currentGroup.items.map((item, itemIdx) => (
                          <div
                            key={item.id || itemIdx}
                            className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2.5"
                          >
                            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                                  Link Label *
                                </label>
                                <input
                                  value={item.label}
                                  onChange={(e) =>
                                    updateItem(safeGroupIdx, itemIdx, { label: e.target.value })
                                  }
                                  className="w-full h-8 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                                  URL *
                                </label>
                                <input
                                  value={item.url}
                                  onChange={(e) =>
                                    updateItem(safeGroupIdx, itemIdx, { url: e.target.value })
                                  }
                                  className="w-full h-8 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                                  Icon (Optional)
                                </label>
                                <select
                                  value={item.icon || ''}
                                  onChange={(e) =>
                                    updateItem(safeGroupIdx, itemIdx, { icon: e.target.value })
                                  }
                                  className="w-full h-8 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                                >
                                  <option value="">No Icon</option>
                                  {NAV_ICON_OPTIONS.map((ic) => (
                                    <option key={ic} value={ic}>
                                      {ic}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                                  Badge (Optional)
                                </label>
                                <input
                                  value={item.badgeText || ''}
                                  onChange={(e) =>
                                    updateItem(safeGroupIdx, itemIdx, { badgeText: e.target.value })
                                  }
                                  placeholder="NEW / M4"
                                  className="w-full h-8 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-[1fr_140px_auto]">
                              <input
                                value={item.description || ''}
                                onChange={(e) =>
                                  updateItem(safeGroupIdx, itemIdx, { description: e.target.value })
                                }
                                placeholder="Optional link subtitle / short description"
                                className="h-8 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                              />
                              <select
                                value={item.target}
                                onChange={(e) =>
                                  updateItem(safeGroupIdx, itemIdx, {
                                    target: e.target.value as '_self' | '_blank',
                                  })
                                }
                                className="h-8 rounded-lg border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                              >
                                <option value="_self">Same Tab</option>
                                <option value="_blank">New Tab</option>
                              </select>
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex items-center gap-1 text-[11px] font-semibold">
                                  <input
                                    type="checkbox"
                                    checked={item.isActive}
                                    onChange={(e) =>
                                      updateItem(safeGroupIdx, itemIdx, { isActive: e.target.checked })
                                    }
                                    className="h-3.5 w-3.5 rounded text-[#145CFF]"
                                  />
                                  Active
                                </label>
                                <button
                                  type="button"
                                  disabled={itemIdx === 0}
                                  aria-label={`Move ${item.label} up`}
                                  onClick={() => moveItem(safeGroupIdx, itemIdx, itemIdx - 1)}
                                  className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={itemIdx === currentGroup.items.length - 1}
                                  aria-label={`Move ${item.label} down`}
                                  onClick={() => moveItem(safeGroupIdx, itemIdx, itemIdx + 1)}
                                  className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete ${item.label}`}
                                  onClick={() => deleteItem(safeGroupIdx, itemIdx)}
                                  className="rounded border border-rose-200 p-1 text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <LayoutGrid className="h-7 w-7 text-slate-400" />
                  <p className="mt-2 text-sm font-bold text-[#0F1D3A]">Create a Category Group First</p>
                  <button
                    type="button"
                    onClick={addGroup}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Add Category Group
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SINGLE-IMAGE PROMOTIONAL SLIDER */}
          {tab === 'slider' && (
            <NavigationSlideManager
              slides={draft.slides}
              sliderSettings={draft.settings.sliderSettings}
              showSlider={draft.settings.showSlider}
              onChangeSlides={(slides) => setDraft((p) => ({ ...p, slides }))}
              onChangeSettings={(sliderSettings) =>
                setDraft((p) => ({ ...p, settings: { ...p.settings, sliderSettings } }))
              }
              onToggleShowSlider={(showSlider) =>
                setDraft((p) => ({ ...p, settings: { ...p.settings, showSlider } }))
              }
            />
          )}

          {/* TAB 4: PROMOTIONAL BANNERS */}
          {tab === 'promotions' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-[#0F1D3A] dark:text-white">
                    Optional Promotional Cards Inside Mega Menu
                  </h4>
                  <p className="text-xs text-slate-500">
                    If disabled or empty, promotional containers stay completely hidden on the storefront.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPromotion}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Promo Card
                </button>
              </div>

              {draft.promotions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                  No promotional cards configured. Add one if you want featured offer cards beneath the slider.
                </div>
              ) : (
                <div className="space-y-4">
                  {draft.promotions.map((promo, pIdx) => (
                    <div
                      key={promo.id || pIdx}
                      className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F1D3A] dark:text-white">
                          Promo Card #{pIdx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <input
                              type="checkbox"
                              checked={promo.isActive}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  promotions: prev.promotions.map((r, i) =>
                                    i === pIdx ? { ...r, isActive: e.target.checked } : r,
                                  ),
                                }))
                              }
                              className="h-4 w-4 rounded text-[#145CFF]"
                            />
                            Active
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                promotions: prev.promotions.filter((_, i) => i !== pIdx),
                              }))
                            }
                            className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <input
                          value={promo.title}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              promotions: prev.promotions.map((r, i) =>
                                i === pIdx ? { ...r, title: e.target.value } : r,
                              ),
                            }))
                          }
                          placeholder="Promo Title *"
                          className="h-9 rounded-lg border border-[#DCE5F5] bg-white px-2.5 text-xs"
                        />
                        <input
                          value={promo.subtitle || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              promotions: prev.promotions.map((r, i) =>
                                i === pIdx ? { ...r, subtitle: e.target.value } : r,
                              ),
                            }))
                          }
                          placeholder="Subtitle"
                          className="h-9 rounded-lg border border-[#DCE5F5] bg-white px-2.5 text-xs"
                        />
                        <input
                          value={promo.badgeText || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              promotions: prev.promotions.map((r, i) =>
                                i === pIdx ? { ...r, badgeText: e.target.value } : r,
                              ),
                            }))
                          }
                          placeholder="Badge (e.g. FREE SHIPPING)"
                          className="h-9 rounded-lg border border-[#DCE5F5] bg-white px-2.5 text-xs"
                        />
                        <input
                          value={promo.ctaText || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              promotions: prev.promotions.map((r, i) =>
                                i === pIdx ? { ...r, ctaText: e.target.value } : r,
                              ),
                            }))
                          }
                          placeholder="CTA Button Label"
                          className="h-9 rounded-lg border border-[#DCE5F5] bg-white px-2.5 text-xs"
                        />
                        <input
                          value={promo.ctaUrl || ''}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              promotions: prev.promotions.map((r, i) =>
                                i === pIdx ? { ...r, ctaUrl: e.target.value } : r,
                              ),
                            }))
                          }
                          placeholder="CTA URL (/offers)"
                          className="h-9 rounded-lg border border-[#DCE5F5] bg-white px-2.5 font-mono-tabular text-xs"
                        />
                        <select
                          value={promo.theme}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              promotions: prev.promotions.map((r, i) =>
                                i === pIdx
                                  ? { ...r, theme: e.target.value as NavigationPromotionConfig['theme'] }
                                  : r,
                              ),
                            }))
                          }
                          className="h-9 rounded-lg border border-[#DCE5F5] bg-white px-2.5 text-xs"
                        >
                          <option value="royal-blue">Royal Blue</option>
                          <option value="ice-blue">Ice Blue</option>
                          <option value="midnight-navy">Midnight Navy</option>
                        </select>
                      </div>

                      <NavigationMediaField
                        label="Optional Promo Thumbnail Image"
                        value={promo.imageUrl || ''}
                        onChange={(url, publicId) =>
                          setDraft((prev) => ({
                            ...prev,
                            promotions: prev.promotions.map((r, i) =>
                              i === pIdx
                                ? { ...r, imageUrl: url, ...(publicId !== undefined ? { cloudinaryPublicId: publicId } : {}) }
                                : r,
                            ),
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LAYOUT & VISIBILITY */}
          {tab === 'layout' && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dropdown Width
                  </label>
                  <select
                    value={draft.settings.menuWidth}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        settings: {
                          ...p.settings,
                          menuWidth: e.target.value as NavigationMenuConfig['settings']['menuWidth'],
                        },
                      }))
                    }
                    className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="auto">Auto (Content Fit)</option>
                    <option value="md">Medium (680px)</option>
                    <option value="lg">Large (920px)</option>
                    <option value="xl">Extra Wide (1160px)</option>
                    <option value="full">Full Container Width</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Alignment
                  </label>
                  <select
                    value={draft.settings.alignment}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        settings: {
                          ...p.settings,
                          alignment: e.target.value as NavigationMenuConfig['settings']['alignment'],
                        },
                      }))
                    }
                    className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="left">Align Left to Trigger</option>
                    <option value="center">Center Below Trigger</option>
                    <option value="right">Align Right to Trigger</option>
                    <option value="full_width">Full Viewport Width</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Column Grid Count
                  </label>
                  <select
                    value={draft.settings.columns}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        settings: { ...p.settings, columns: Number(e.target.value) },
                      }))
                    }
                    className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value={0}>Auto Adapt Columns</option>
                    <option value={1}>1 Column</option>
                    <option value={2}>2 Columns</option>
                    <option value={3}>3 Columns</option>
                    <option value={4}>4 Columns</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Max Panel Height (px)
                  </label>
                  <input
                    type="number"
                    min={240}
                    max={760}
                    step={20}
                    value={draft.settings.maxHeightPx}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        settings: {
                          ...p.settings,
                          maxHeightPx: Math.min(760, Math.max(240, Number(e.target.value || 540))),
                        },
                      }))
                    }
                    className="w-full h-10 rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { key: 'desktopVisible', label: 'Visible on Desktop Header' },
                  { key: 'mobileVisible', label: 'Visible on Mobile / Tablet Drawer' },
                  { key: 'showIcons', label: 'Show Category & Link Icons' },
                  { key: 'showDescriptions', label: 'Show Link Descriptions' },
                  { key: 'showPromotions', label: 'Show Promo Banner Cards' },
                  { key: 'showSlider', label: 'Show Single-Image Slider' },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/50 px-3.5 py-2.5 text-xs font-semibold"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(draft.settings[opt.key as keyof typeof draft.settings])}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          settings: { ...p.settings, [opt.key]: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded text-[#145CFF]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/60 px-5 py-3.5">
          <p className="text-xs text-slate-500">
            Changes persist to MongoDB and reflect cleanly across Desktop, Tablet, and Mobile headers.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : initialMenu ? 'Save Menu Changes' : 'Create Navigation Menu'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
