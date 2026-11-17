import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Save, Trash2, Truck } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { DEFAULT_DELIVERY_OPTIONS, type DeliveryOptionSpec } from '../../../lib/bdLocations';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function ShippingSettingsPage() {
  useSeoMeta({ title: 'Shipping Settings | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [dhakaMetroCharge, setDhakaMetroCharge] = useState('60');
  const [dhakaSuburbCharge, setDhakaSuburbCharge] = useState('100');
  const [nationwideCharge, setNationwideCharge] = useState('120');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('999');
  const [expressSurcharge, setExpressSurcharge] = useState('80');
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOptionSpec[]>(DEFAULT_DELIVERY_OPTIONS);

  useEffect(() => {
    const s = config?.shippingSettings;
    if (s) {
      setDhakaMetroCharge(String(s.dhakaMetroCharge ?? 60));
      setDhakaSuburbCharge(String(s.dhakaSuburbCharge ?? 100));
      setNationwideCharge(String(s.nationwideCharge ?? 120));
      setFreeShippingThreshold(String(s.freeShippingThreshold ?? 999));
      setExpressSurcharge(String(s.expressSurcharge ?? 80));
    }
    if (Array.isArray(config?.deliveryOptions) && config.deliveryOptions.length > 0) {
      setDeliveryOptions(config.deliveryOptions);
    }
  }, [config]);

  const handleAddDeliveryOption = () => {
    const idx = deliveryOptions.length + 1;
    setDeliveryOptions((prev) => [
      ...prev,
      {
        code: `option_${idx}`,
        name: 'Custom Courier Tier',
        description: 'Scheduled doorstep delivery',
        estimatedTime: 'Within 1–3 Business Days',
        methodType: 'standard',
        surcharge: 0,
        freeShippingEligible: true,
        isActive: true,
        sortOrder: idx - 1,
      },
    ]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        shippingSettings: {
          dhakaMetroCharge: Number(dhakaMetroCharge || 0),
          dhakaSuburbCharge: Number(dhakaSuburbCharge || 0),
          nationwideCharge: Number(nationwideCharge || 0),
          freeShippingThreshold: Number(freeShippingThreshold || 0),
          expressSurcharge: Number(expressSurcharge || 0),
        },
        deliveryOptions: deliveryOptions.map((opt, idx) => ({
          ...opt,
          code: opt.code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || `option_${idx + 1}`,
          name: opt.name.trim() || 'Delivery Option',
          description: opt.description.trim(),
          estimatedTime: opt.estimatedTime.trim() || 'Within 2–5 Business Days',
          surcharge: Math.max(0, Number(opt.surcharge || 0)),
          sortOrder: Number(opt.sortOrder ?? idx),
        })),
      },
      'Shipping rates and checkout delivery options saved.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="settings.manage">
        <div className="space-y-5 max-w-[1040px] mx-auto">
          <AdminPageHeader
            title="Shipping Settings & Delivery Options"
            subtitle="Configure Bangladesh courier fee tiers, free-shipping thresholds, and customer-facing checkout delivery options."
            breadcrumbs={[{ label: 'Payments & Shipping' }, { label: 'Shipping Settings' }]}
            actions={
              <Link
                to="/admin/shipping/zones"
                className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
              >
                Manage Delivery Zones →
              </Link>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-5">
                <h2 className="font-display text-sm font-bold flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#145CFF]" /> Bangladesh Delivery Fee Matrix
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Dhaka Metro Fee (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={dhakaMetroCharge}
                      onChange={(e) => setDhakaMetroCharge(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Dhaka Suburb Fee (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={dhakaSuburbCharge}
                      onChange={(e) => setDhakaSuburbCharge(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Nationwide Outside Dhaka (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={nationwideCharge}
                      onChange={(e) => setNationwideCharge(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Free Shipping Above (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={freeShippingThreshold}
                      onChange={(e) => setFreeShippingThreshold(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Express Surcharge Default (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={expressSurcharge}
                      onChange={(e) => setExpressSurcharge(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Checkout Delivery Options */}
              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-sm font-bold text-[#101B35] dark:text-white">
                      Checkout Delivery Options
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Rendered as Step 2 selectable shipping cards on /checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDeliveryOption}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#EAF1FF] px-3 py-1.5 text-xs font-semibold text-[#145CFF] hover:bg-[#DCE8FF]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Option
                  </button>
                </div>

                <div className="space-y-3">
                  {deliveryOptions.map((opt, idx) => (
                    <div
                      key={`${opt.code}-${idx}`}
                      className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-4 space-y-3"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold">Option Code</label>
                          <input
                            value={opt.code}
                            onChange={(e) =>
                              setDeliveryOptions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, code: e.target.value } : item)),
                              )
                            }
                            className="h-9 w-full rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold">Display Title</label>
                          <input
                            value={opt.name}
                            onChange={(e) =>
                              setDeliveryOptions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)),
                              )
                            }
                            className="h-9 w-full rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold">Delivery ETA</label>
                          <input
                            value={opt.estimatedTime}
                            onChange={(e) =>
                              setDeliveryOptions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, estimatedTime: e.target.value } : item)),
                              )
                            }
                            placeholder="Within 2–5 Business Days"
                            className="h-9 w-full rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold">Surcharge (৳)</label>
                          <input
                            type="number"
                            min={0}
                            value={opt.surcharge}
                            onChange={(e) =>
                              setDeliveryOptions((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, surcharge: Number(e.target.value || 0) } : item,
                                ),
                              )
                            }
                            className="h-9 w-full rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <select
                            value={opt.methodType}
                            onChange={(e) =>
                              setDeliveryOptions((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, methodType: e.target.value === 'express' ? 'express' : 'standard' }
                                    : item,
                                ),
                              )
                            }
                            className="h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                          >
                            <option value="standard">Standard Tier</option>
                            <option value="express">Express Tier</option>
                          </select>

                          <label className="inline-flex items-center gap-1.5 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={opt.freeShippingEligible}
                              onChange={(e) =>
                                setDeliveryOptions((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, freeShippingEligible: e.target.checked } : item,
                                  ),
                                )
                              }
                            />
                            <span>Free Shipping Eligible</span>
                          </label>

                          <label className="inline-flex items-center gap-1.5 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={opt.isActive}
                              onChange={(e) =>
                                setDeliveryOptions((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, isActive: e.target.checked } : item)),
                                )
                              }
                            />
                            <span>Active</span>
                          </label>
                        </div>

                        {deliveryOptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDeliveryOptions((prev) => prev.filter((_, i) => i !== idx))}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        )}
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
                  {saving ? 'Saving...' : 'Save Shipping Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
