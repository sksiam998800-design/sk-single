import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function HeaderSettingsPage() {
  useSeoMeta({ title: 'Header Settings | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [showSearch, setShowSearch] = useState(true);
  const [showWishlist, setShowWishlist] = useState(true);
  const [showCategoryMenu, setShowCategoryMenu] = useState(true);
  const [stickyHeader, setStickyHeader] = useState(true);
  const [specialOfferLabel, setSpecialOfferLabel] = useState('Flash Deals');
  const [specialOfferUrl, setSpecialOfferUrl] = useState('/offers');

  useEffect(() => {
    const h = config?.headerSettings;
    if (!h) return;
    setShowSearch(Boolean(h.showSearch ?? true));
    setShowWishlist(Boolean(h.showWishlist ?? true));
    setShowCategoryMenu(Boolean(h.showCategoryMenu ?? true));
    setStickyHeader(Boolean(h.stickyHeader ?? true));
    setSpecialOfferLabel(h.specialOfferLabel || 'Flash Deals');
    setSpecialOfferUrl(h.specialOfferUrl || '/offers');
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        headerSettings: { showSearch, showWishlist, showCategoryMenu, stickyHeader, specialOfferLabel, specialOfferUrl },
      },
      'Header settings saved.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-5 max-w-[920px] mx-auto">
          <AdminPageHeader
            title="Header Settings"
            subtitle="Toggle storefront search, wishlist drawer, category megamenu, sticky navigation, and highlighted promo link."
            breadcrumbs={[{ label: 'Website Management' }, { label: 'Header Settings' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-5"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Show Live Search Bar', val: showSearch, set: setShowSearch },
                  { label: 'Show Wishlist Heart Button', val: showWishlist, set: setShowWishlist },
                  { label: 'Show Category Browse Dropdown', val: showCategoryMenu, set: setShowCategoryMenu },
                  { label: 'Sticky Header on Scroll', val: stickyHeader, set: setStickyHeader },
                ].map((opt) => (
                  <label
                    key={opt.label}
                    className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-3.5 text-xs font-semibold cursor-pointer"
                  >
                    <span>{opt.label}</span>
                    <input
                      type="checkbox"
                      checked={opt.val}
                      onChange={(e) => opt.set(e.target.checked)}
                      className="h-4 w-4 rounded text-[#145CFF]"
                    />
                  </label>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-[#E4EAF5] dark:border-slate-800">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Highlighted Promo Link Label</label>
                  <input
                    value={specialOfferLabel}
                    onChange={(e) => setSpecialOfferLabel(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Highlighted Promo URL</label>
                  <input
                    value={specialOfferUrl}
                    onChange={(e) => setSpecialOfferUrl(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Header Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
