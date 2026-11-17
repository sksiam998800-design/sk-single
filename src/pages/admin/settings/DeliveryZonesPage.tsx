import { useEffect, useState, type FormEvent } from 'react';
import { MapPin, Plus, Save, Trash2 } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

interface DeliveryZoneRow {
  name: string;
  divisionsText: string;
  charge: string;
  freeAbove: string;
  estimatedDays: string;
  isActive: boolean;
}

export function DeliveryZonesPage() {
  useSeoMeta({ title: 'Delivery Zones | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [zones, setZones] = useState<DeliveryZoneRow[]>([]);

  useEffect(() => {
    if (!config?.deliveryZones) return;
    setZones(
      config.deliveryZones.map((z) => ({
        name: z.name || '',
        divisionsText: (z.divisions || []).join(', '),
        charge: String(z.charge ?? 0),
        freeAbove: String(z.freeAbove ?? 0),
        estimatedDays: z.estimatedDays || '2-3 Days',
        isActive: Boolean(z.isActive ?? true),
      })),
    );
  }, [config]);

  const addZone = () => {
    setZones((prev) => [
      ...prev,
      { name: 'Regional Zone', divisionsText: 'Chattogram, Sylhet', charge: '120', freeAbove: '4000', estimatedDays: '2-4 Days', isActive: true },
    ]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const deliveryZones = zones.map((z) => ({
      name: z.name.trim(),
      divisions: z.divisionsText.split(',').map((s) => s.trim()).filter(Boolean),
      charge: Number(z.charge || 0),
      freeAbove: Number(z.freeAbove || 0),
      estimatedDays: z.estimatedDays.trim(),
      isActive: Boolean(z.isActive),
    }));
    await savePatch({ deliveryZones }, 'Delivery zones saved.');
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="settings.manage">
        <div className="space-y-5 max-w-[1040px] mx-auto">
          <AdminPageHeader
            title="Delivery Zones"
            subtitle="Configure regional shipping zones across Bangladesh divisions with estimated SLA windows."
            breadcrumbs={[{ label: 'Payments & Shipping' }, { label: 'Delivery Zones' }]}
            actions={
              <button
                type="button"
                onClick={addZone}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Add Delivery Zone
              </button>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {zones.length === 0 ? (
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-10 text-center text-xs text-[#64748B]">
                  <MapPin className="mx-auto mb-2 h-6 w-6 text-[#145CFF]" />
                  No custom delivery zones defined. Add a zone to map divisions to shipping rules.
                </div>
              ) : (
                zones.map((z, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold">Zone #{idx + 1}</span>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={z.isActive}
                            onChange={(e) =>
                              setZones((prev) => prev.map((r, i) => (i === idx ? { ...r, isActive: e.target.checked } : r)))
                            }
                            className="h-4 w-4 rounded text-[#145CFF]"
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          onClick={() => setZones((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-5">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold">Zone Name *</label>
                        <input
                          required
                          value={z.name}
                          onChange={(e) =>
                            setZones((prev) => prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                          }
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold">Divisions (comma separated)</label>
                        <input
                          value={z.divisionsText}
                          onChange={(e) =>
                            setZones((prev) => prev.map((r, i) => (i === idx ? { ...r, divisionsText: e.target.value } : r)))
                          }
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold">Charge (৳)</label>
                        <input
                          type="number"
                          min={0}
                          value={z.charge}
                          onChange={(e) =>
                            setZones((prev) => prev.map((r, i) => (i === idx ? { ...r, charge: e.target.value } : r)))
                          }
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold">SLA Window</label>
                        <input
                          value={z.estimatedDays}
                          onChange={(e) =>
                            setZones((prev) => prev.map((r, i) => (i === idx ? { ...r, estimatedDays: e.target.value } : r)))
                          }
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Delivery Zones'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
