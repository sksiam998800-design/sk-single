import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Navigation,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import { useSeoMeta } from '../../../lib/useSeoMeta';
import {
  computeNavigationOverviewStats,
  type NavigationMenuConfig,
  type NavigationOverviewStats,
} from '../../../lib/navigationEngine';
import type { CategoryItem } from '../../../types/commerce';
import { NavIcon } from '../../../components/navigation/NavIcon';
import { NavigationMenuEditorModal } from '../../../components/admin/navigation/NavigationMenuEditorModal';
import { NavigationPreviewModal } from '../../../components/admin/navigation/NavigationPreviewModal';

export function NavigationManagerPage() {
  useSeoMeta({ title: 'Navigation & Mega Menu | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [menus, setMenus] = useState<NavigationMenuConfig[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [stats, setStats] = useState<NavigationOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'inactive'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<NavigationMenuConfig | null>(null);
  const [previewMenu, setPreviewMenu] = useState<NavigationMenuConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NavigationMenuConfig | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const broadcastNavigationUpdate = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('novara:navigation-updated'));
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [navRes, catRes] = await Promise.all([
        apiRequest<{ ok: true; menus: NavigationMenuConfig[]; stats?: NavigationOverviewStats }>(
          '/api/admin/navigation',
        ),
        apiRequest<{ ok: true; categories: CategoryItem[] }>('/api/admin/categories').catch(() => ({
          ok: true as const,
          categories: [] as CategoryItem[],
        })),
      ]);
      const loadedMenus = Array.isArray(navRes.menus) ? navRes.menus : [];
      setMenus(loadedMenus);
      setStats(navRes.stats || computeNavigationOverviewStats(loadedMenus));
      setCategories(Array.isArray(catRes.categories) ? catRes.categories : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dynamic navigation menus.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const effectiveStats = useMemo(
    () => stats || computeNavigationOverviewStats(menus),
    [menus, stats],
  );

  const filteredMenus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menus.filter((m) => {
      if (statusFilter === 'published' && !(m.isActive && m.isPublished)) return false;
      if (statusFilter === 'draft' && m.isPublished) return false;
      if (statusFilter === 'inactive' && m.isActive) return false;
      if (!q) return true;
      return (
        m.label.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.url.toLowerCase().includes(q) ||
        m.groups.some(
          (g) =>
            g.title.toLowerCase().includes(q) ||
            g.items.some((it) => it.label.toLowerCase().includes(q)),
        )
      );
    });
  }, [menus, searchQuery, statusFilter]);

  const handleSaveMenu = async (menuData: NavigationMenuConfig) => {
    setSaving(true);
    try {
      if (menuData.id) {
        await apiRequest<{ ok: true; menu: NavigationMenuConfig }>(`/api/admin/navigation/${menuData.id}`, {
          method: 'PUT',
          body: JSON.stringify(menuData),
        });
        dispatch(showToast({ variant: 'success', message: `Updated navigation menu "${menuData.label}".` }));
      } else {
        await apiRequest<{ ok: true; menu: NavigationMenuConfig }>('/api/admin/navigation', {
          method: 'POST',
          body: JSON.stringify(menuData),
        });
        dispatch(showToast({ variant: 'success', message: `Created navigation menu "${menuData.label}".` }));
      }
      setEditorOpen(false);
      setEditingMenu(null);
      broadcastNavigationUpdate();
      await loadData();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to save navigation menu.',
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleState = async (
    menu: NavigationMenuConfig,
    patch: { isActive?: boolean; isPublished?: boolean },
  ) => {
    try {
      await apiRequest(`/api/admin/navigation/${menu.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      dispatch(showToast({ variant: 'success', message: `Updated "${menu.label}" status.` }));
      broadcastNavigationUpdate();
      await loadData();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Status update failed.',
        }),
      );
    }
  };

  const handleDuplicate = async (menu: NavigationMenuConfig) => {
    try {
      await apiRequest(`/api/admin/navigation/${menu.id}/duplicate`, { method: 'POST' });
      dispatch(showToast({ variant: 'success', message: `Duplicated "${menu.label}" as draft.` }));
      await loadData();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to duplicate menu.',
        }),
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/admin/navigation/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: `Deleted "${deleteTarget.label}".` }));
      setDeleteTarget(null);
      broadcastNavigationUpdate();
      await loadData();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to delete menu.',
        }),
      );
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= menus.length || fromIndex === toIndex) return;
    const reordered = [...menus];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updated = reordered.map((m, idx) => ({ ...m, displayOrder: idx }));
    setMenus(updated);

    try {
      await apiRequest('/api/admin/navigation/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          items: updated.map((m) => ({ id: m.id, displayOrder: m.displayOrder })),
        }),
      });
      dispatch(showToast({ variant: 'success', message: 'Navigation order saved.' }));
      broadcastNavigationUpdate();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to save new menu order.',
        }),
      );
      await loadData();
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="mx-auto max-w-[1280px] space-y-5">
          <AdminPageHeader
            title="Navigation & Mega Menu"
            subtitle="Manage header menus, Level 2 category groups, unlimited dropdown links, and single-image mega menu promotional sliders."
            breadcrumbs={[{ label: 'Marketing' }, { label: 'Navigation Menu' }]}
            actions={
              <button
                type="button"
                onClick={() => {
                  setEditingMenu(null);
                  setEditorOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" />
                <span>Create Navigation Menu</span>
              </button>
            }
          />

          {/* Navigation Overview KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                label: 'Total Menus',
                value: effectiveStats.totalMenus,
                sub: `${effectiveStats.inactiveMenus} inactive`,
                icon: Navigation,
                tone: 'text-[#145CFF] bg-[#EEF4FF]',
              },
              {
                label: 'Active Menus',
                value: effectiveStats.activeMenus,
                sub: `${effectiveStats.publishedMenus} published live`,
                icon: CheckCircle2,
                tone: 'text-emerald-600 bg-emerald-50',
              },
              {
                label: 'Published Live',
                value: effectiveStats.publishedMenus,
                sub: 'Storefront visible',
                icon: Globe,
                tone: 'text-indigo-600 bg-indigo-50',
              },
              {
                label: 'Dropdown Links',
                value: effectiveStats.totalDropdownLinks,
                sub: 'Level 2 items',
                icon: Layers,
                tone: 'text-sky-600 bg-sky-50',
              },
              {
                label: 'Slider Images',
                value: effectiveStats.totalSlides,
                sub: `${effectiveStats.activeSlides} active slides`,
                icon: ImageIcon,
                tone: 'text-amber-600 bg-amber-50',
              },
              {
                label: 'Published Promos',
                value: effectiveStats.publishedPromoContent,
                sub: 'Slides + banners live',
                icon: Sparkles,
                tone: 'text-violet-600 bg-violet-50',
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">{kpi.label}</span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${kpi.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="font-display mt-1.5 text-2xl font-extrabold text-[#0F1D3A] dark:text-white">
                    {kpi.value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{kpi.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menus, URLs, groups, or dropdown links..."
                className="h-9 w-full rounded-xl border border-[#DCE5F5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900 pl-9 pr-3 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: 'all', label: 'All Menus' },
                  { key: 'published', label: 'Published Live' },
                  { key: 'draft', label: 'Drafts' },
                  { key: 'inactive', label: 'Inactive' },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    statusFilter === f.key
                      ? 'bg-[#145CFF] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {error && <ErrorBanner message={error} onRetry={loadData} />}

          {loading ? (
            <LoadingCards count={3} />
          ) : filteredMenus.length === 0 ? (
            <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-10 text-center">
              <Navigation className="mx-auto h-8 w-8 text-[#145CFF]" />
              <h3 className="font-display mt-3 text-base font-bold text-[#0F1D3A] dark:text-white">
                {menus.length === 0 ? 'No Dynamic Navigation Menus Yet' : 'No Matching Menus'}
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                {menus.length === 0
                  ? 'Create your first Level 1 navigation item, configure Level 2 dropdown groups, and upload promotional slides for the wide mega menu.'
                  : 'Try clearing your search or status filter.'}
              </p>
              {menus.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMenu(null);
                    setEditorOpen(true);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Create First Navigation Menu
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredMenus.map((menu) => {
                const realIdx = menus.findIndex((m) => m.id === menu.id);
                const dropdownCount = menu.groups.reduce((sum, g) => sum + g.items.length, 0);
                const activeSlides = menu.slides.filter((s) => s.isActive).length;
                const canDrag = searchQuery === '' && statusFilter === 'all';

                return (
                  <div
                    key={menu.id}
                    draggable={canDrag}
                    onDragStart={() => setDragIndex(realIdx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (canDrag && dragIndex !== null) {
                        handleReorder(dragIndex, realIdx);
                      }
                      setDragIndex(null);
                    }}
                    className="flex flex-col gap-3 rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-4 shadow-xs transition-colors hover:border-[#C7DAFF] lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        title={canDrag ? 'Drag to reorder' : 'Clear search/filter to reorder'}
                        className={`mt-1 flex h-8 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 ${
                          canDrag ? 'cursor-grab hover:bg-slate-100' : 'opacity-40'
                        }`}
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#145CFF]">
                        {menu.icon ? <NavIcon name={menu.icon} className="h-5 w-5" /> : <Navigation className="h-5 w-5" />}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-sm font-bold text-[#0F1D3A] dark:text-white">
                            {menu.label}
                          </h3>
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">
                            {menu.type === 'mega_menu'
                              ? 'Mega Menu'
                              : menu.type === 'dropdown'
                                ? 'Dropdown'
                                : 'Direct Link'}
                          </span>
                          {menu.badgeText && (
                            <span className="rounded-md bg-[#145CFF] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                              {menu.badgeText}
                            </span>
                          )}
                          {!menu.isActive ? (
                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              Disabled
                            </span>
                          ) : menu.isPublished ? (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              Published Live
                            </span>
                          ) : (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Draft
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="font-mono-tabular truncate max-w-[260px]">{menu.url}</span>
                          <span>
                            {menu.groups.length} group{menu.groups.length === 1 ? '' : 's'} · {dropdownCount} link
                            {dropdownCount === 1 ? '' : 's'}
                          </span>
                          <span>
                            {activeSlides}/{menu.slides.length} active slide{menu.slides.length === 1 ? '' : 's'}
                          </span>
                          <span>
                            {menu.settings.desktopVisible ? 'Desktop' : ''}
                            {menu.settings.desktopVisible && menu.settings.mobileVisible ? ' + ' : ''}
                            {menu.settings.mobileVisible ? 'Mobile' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex flex-wrap items-center gap-1.5 pl-9 lg:pl-0">
                      <button
                        type="button"
                        onClick={() => handleToggleState(menu, { isActive: !menu.isActive })}
                        title={menu.isActive ? 'Disable menu' : 'Enable menu'}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                          menu.isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {menu.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        <span>{menu.isActive ? 'Active' : 'Hidden'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleState(menu, { isPublished: !menu.isPublished })}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                          menu.isPublished
                            ? 'border-blue-200 bg-[#EEF4FF] text-[#145CFF] hover:bg-blue-100'
                            : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span>{menu.isPublished ? 'Unpublish' : 'Publish'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewMenu(menu)}
                        aria-label={`Preview ${menu.label}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingMenu(menu);
                          setEditorOpen(true);
                        }}
                        aria-label={`Edit ${menu.label}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#0F1D3A] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1E325C]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(menu)}
                        aria-label={`Duplicate ${menu.label}`}
                        title="Duplicate as draft"
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 hover:bg-slate-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={!canDrag || realIdx === 0}
                        onClick={() => handleReorder(realIdx, realIdx - 1)}
                        aria-label={`Move ${menu.label} up`}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={!canDrag || realIdx === menus.length - 1}
                        onClick={() => handleReorder(realIdx, realIdx + 1)}
                        aria-label={`Move ${menu.label} down`}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(menu)}
                        aria-label={`Delete ${menu.label}`}
                        className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Menu Builder Modal */}
        {editorOpen && (
          <NavigationMenuEditorModal
            initialMenu={editingMenu}
            categories={categories}
            nextDisplayOrder={menus.length}
            saving={saving}
            onClose={() => {
              setEditorOpen(false);
              setEditingMenu(null);
            }}
            onSave={handleSaveMenu}
            onPreview={(draft) => setPreviewMenu(draft)}
          />
        )}

        {/* Pre-Publish Interactive Mega Menu Preview Modal */}
        {previewMenu && (
          <NavigationPreviewModal
            menu={previewMenu}
            onClose={() => setPreviewMenu(null)}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm menu deletion"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <h3 className="font-display text-lg font-extrabold text-[#0F1D3A]">
                Delete "{deleteTarget.label}"?
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                This permanently removes this navigation menu, its {deleteTarget.groups.length} group(s), and{' '}
                {deleteTarget.slides.length} promotional slide(s) from the storefront.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Delete Menu
                </button>
              </div>
            </div>
          </div>
        )}
      </PermissionGuard>
    </AdminLayout>
  );
}
