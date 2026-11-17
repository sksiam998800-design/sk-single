import { useEffect, useState, type FormEvent } from 'react';
import { Megaphone, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function AnnouncementSettingsPage() {
  useSeoMeta({ title: 'Announcement Bar | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('/offers');

  useEffect(() => {
    const a = config?.announcementBar;
    if (!a) return;
    setEnabled(Boolean(a.enabled ?? true));
    setText(a.text || '');
    setLinkText(a.linkText || '');
    setLinkUrl(a.linkUrl || '/offers');
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        announcementBar: {
          enabled,
          text,
          linkText: linkText.trim(),
          linkUrl: linkUrl.trim(),
        },
      },
      'Announcement bar updated.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-5 max-w-[840px] mx-auto">
          <AdminPageHeader
            title="Announcement Bar"
            subtitle="Configure the global top utility strip displayed above the storefront header."
            breadcrumbs={[{ label: 'Website Management' }, { label: 'Announcement Bar' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={1} />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[#145CFF]" /> Top Strip Configuration
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-4 w-4 rounded text-[#145CFF]"
                  />
                  Show Announcement Strip
                </label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Announcement Text *</label>
                <input
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Free Dhaka Metro shipping on orders above ৳3,000"
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Action Link Label</label>
                  <input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Shop Deals"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Action URL</label>
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="/offers"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Announcement'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
