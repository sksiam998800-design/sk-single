import { useEffect, useState, type FormEvent } from 'react';
import { Receipt, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function TaxSettingsPage() {
  useSeoMeta({ title: 'Tax Configuration | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState('VAT');
  const [ratePercent, setRatePercent] = useState('5');
  const [inclusive, setInclusive] = useState(true);

  useEffect(() => {
    const t = config?.taxSettings;
    if (!t) return;
    setEnabled(Boolean(t.enabled));
    setLabel(t.label || 'VAT');
    setRatePercent(String(t.ratePercent ?? 5));
    setInclusive(Boolean(t.inclusive ?? true));
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        taxSettings: {
          enabled,
          label: label.trim() || 'VAT',
          ratePercent: Number(ratePercent || 0),
          inclusive,
        },
      },
      'Tax configuration saved.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="settings.manage">
        <div className="space-y-5 max-w-[840px] mx-auto">
          <AdminPageHeader
            title="Tax Configuration"
            subtitle="Manage store VAT / GST calculation rates and tax-inclusive pricing rules."
            breadcrumbs={[{ label: 'Payments & Shipping' }, { label: 'Tax Configuration' }]}
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
                  <Receipt className="h-4 w-4 text-[#145CFF]" /> VAT / Tax Rules
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-4 w-4 rounded text-[#145CFF]"
                  />
                  Enable Tax Calculation
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Tax Label</label>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step="0.1"
                    value={ratePercent}
                    onChange={(e) => setRatePercent(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={inclusive}
                  onChange={(e) => setInclusive(e.target.checked)}
                  className="h-4 w-4 rounded text-[#145CFF]"
                />
                Catalog prices already include {label || 'VAT'}
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Tax Config'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
