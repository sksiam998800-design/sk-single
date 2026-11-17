import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

interface FooterColumn {
  title: string;
  links: Array<{ label: string; url: string }>;
}

export function FooterSettingsPage() {
  useSeoMeta({ title: 'Footer Settings | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [copyrightText, setCopyrightText] = useState('');
  const [storeStatus, setStoreStatus] = useState<'live' | 'maintenance'>('live');
  const [columns, setColumns] = useState<FooterColumn[]>([]);

  useEffect(() => {
    const f = config?.footerSettings;
    if (!f) return;
    setDescription(f.description || '');
    setTagline(f.tagline || '');
    setCopyrightText(f.copyrightText || '© 2026 NOVARA COMMERCE. All Rights Reserved.');
    setStoreStatus(f.storeStatus || 'live');
    setColumns(
      (f.columns || []).map((col) => ({
        title: col.title || '',
        links: (col.links || []).map((l) => ({ label: l.label || '', url: l.url || '/' })),
      })),
    );
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        footerSettings: {
          description,
          tagline,
          copyrightText,
          storeStatus,
          columns: columns.map((c) => ({
            title: c.title.trim(),
            links: c.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
          })),
        },
      },
      'Footer settings updated.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-5 max-w-[1040px] mx-auto">
          <AdminPageHeader
            title="Footer Settings"
            subtitle="Customize storefront footer copy, live store badge, copyright notice, and link columns."
            breadcrumbs={[{ label: 'Website Management' }, { label: 'Footer Settings' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Footer Tagline</label>
                    <input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Store Status Badge</label>
                    <select
                      value={storeStatus}
                      onChange={(e) => setStoreStatus(e.target.value as 'live' | 'maintenance')}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="live">Live Store</option>
                      <option value="maintenance">Maintenance Notice</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold">Footer About Description</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold">Copyright Text</label>
                    <input
                      value={copyrightText}
                      onChange={(e) => setCopyrightText(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold">Footer Link Columns</h2>
                  <button
                    type="button"
                    onClick={() => setColumns((prev) => [...prev, { title: 'Support', links: [{ label: 'FAQs', url: '/faqs' }] }])}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E4EAF5] px-3 py-1.5 text-xs font-semibold text-[#145CFF]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Column
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {columns.map((col, colIdx) => (
                    <div
                      key={colIdx}
                      className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          value={col.title}
                          onChange={(e) =>
                            setColumns((prev) => prev.map((c, i) => (i === colIdx ? { ...c, title: e.target.value } : c)))
                          }
                          placeholder="Column Title"
                          className="flex-1 h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setColumns((prev) => prev.filter((_, i) => i !== colIdx))}
                          className="rounded-lg border border-rose-200 p-2 text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {col.links.map((lnk, lIdx) => (
                          <div key={lIdx} className="flex gap-1.5">
                            <input
                              value={lnk.label}
                              onChange={(e) =>
                                setColumns((prev) =>
                                  prev.map((c, ci) =>
                                    ci === colIdx
                                      ? {
                                          ...c,
                                          links: c.links.map((l, li) => (li === lIdx ? { ...l, label: e.target.value } : l)),
                                        }
                                      : c,
                                  ),
                                )
                              }
                              placeholder="Link label"
                              className="flex-1 h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                            />
                            <input
                              value={lnk.url}
                              onChange={(e) =>
                                setColumns((prev) =>
                                  prev.map((c, ci) =>
                                    ci === colIdx
                                      ? {
                                          ...c,
                                          links: c.links.map((l, li) => (li === lIdx ? { ...l, url: e.target.value } : l)),
                                        }
                                      : c,
                                  ),
                                )
                              }
                              placeholder="/path"
                              className="w-28 h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setColumns((prev) =>
                                  prev.map((c, ci) =>
                                    ci === colIdx ? { ...c, links: c.links.filter((_, li) => li !== lIdx) } : c,
                                  ),
                                )
                              }
                              className="rounded-lg px-2 text-rose-500 hover:bg-rose-50"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setColumns((prev) =>
                              prev.map((c, ci) =>
                                ci === colIdx ? { ...c, links: [...c.links, { label: 'Link', url: '/shop' }] } : c,
                              ),
                            )
                          }
                          className="text-[11px] font-semibold text-[#145CFF] hover:underline"
                        >
                          + Add link
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Footer Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
