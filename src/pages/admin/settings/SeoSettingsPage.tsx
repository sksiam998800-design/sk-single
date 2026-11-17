import { useEffect, useState, type FormEvent } from 'react';
import { Save, Search } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function SeoSettingsPage() {
  useSeoMeta({ title: 'SEO Settings | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [siteName, setSiteName] = useState('NOVARA COMMERCE');
  const [defaultTitle, setDefaultTitle] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');

  useEffect(() => {
    const s = config?.seoDefaults;
    if (!s) return;
    setSiteName(s.siteName || 'NOVARA COMMERCE');
    setDefaultTitle(s.defaultTitle || '');
    setDefaultDescription(s.defaultDescription || '');
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      { seoDefaults: { siteName, defaultTitle, defaultDescription } },
      'Global SEO defaults updated.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="settings.manage">
        <div className="space-y-5 max-w-[840px] mx-auto">
          <AdminPageHeader
            title="SEO Settings"
            subtitle="Set default storefront HTML title, OpenGraph site name, and fallback meta descriptions."
            breadcrumbs={[{ label: 'System Settings' }, { label: 'SEO Settings' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={1} />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-4"
            >
              <h2 className="font-display text-sm font-bold flex items-center gap-2">
                <Search className="h-4 w-4 text-[#145CFF]" /> Default Search Engine Metadata
              </h2>
              <div>
                <label className="mb-1 block text-xs font-semibold">Site Name</label>
                <input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Default Meta Title</label>
                <input
                  value={defaultTitle}
                  onChange={(e) => setDefaultTitle(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Default Meta Description</label>
                <textarea
                  rows={3}
                  value={defaultDescription}
                  onChange={(e) => setDefaultDescription(e.target.value)}
                  className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save SEO Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
