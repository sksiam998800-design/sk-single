import { useEffect, useState, type FormEvent } from 'react';
import { CreditCard, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards, StatusBadge } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function PaymentMethodsPage() {
  useSeoMeta({ title: 'Payment Methods | NOVARA Admin', noIndex: true });
  const { config, integrations, loading, saving, error, load, savePatch } = useAdminSettings();

  const [codEnabled, setCodEnabled] = useState(true);
  const [sslcommerzEnabled, setSslcommerzEnabled] = useState(true);
  const [bkashEnabled, setBkashEnabled] = useState(true);
  const [nagadEnabled, setNagadEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [codMaxAmount, setCodMaxAmount] = useState('50000');
  const [codInstructions, setCodInstructions] = useState('');

  useEffect(() => {
    const p = config?.paymentMethods;
    if (!p) return;
    setCodEnabled(Boolean(p.codEnabled ?? true));
    setSslcommerzEnabled(Boolean(p.sslcommerzEnabled ?? true));
    setBkashEnabled(Boolean(p.bkashEnabled ?? true));
    setNagadEnabled(Boolean(p.nagadEnabled ?? true));
    setCardEnabled(Boolean(p.cardEnabled ?? true));
    setCodMaxAmount(String(p.codMaxAmount ?? 50000));
    setCodInstructions(p.codInstructions || '');
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        paymentMethods: {
          codEnabled,
          sslcommerzEnabled,
          bkashEnabled,
          nagadEnabled,
          cardEnabled,
          codMaxAmount: Number(codMaxAmount || 0),
          codInstructions,
        },
      },
      'Payment method controls updated.',
    );
  };

  const gatewayStatusList = [
    { label: 'bKash Tokenized API', configured: Boolean(integrations.bkash) },
    { label: 'Nagad Merchant PG', configured: Boolean(integrations.nagad) },
    { label: 'SSLCommerz / Cards', configured: Boolean(integrations.sslcommerz ?? integrations.paymentGateway) },
  ];

  return (
    <AdminLayout>
      <PermissionGuard permission="settings.manage">
        <div className="space-y-5 max-w-[920px] mx-auto">
          <AdminPageHeader
            title="Payment Methods"
            subtitle="Control checkout payment options, Cash on Delivery limits, and inspect live gateway integration status."
            breadcrumbs={[{ label: 'Payments & Shipping' }, { label: 'Payment Methods' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-bold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#145CFF]" /> Checkout Payment Channels
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {gatewayStatusList.map((g) => (
                      <StatusBadge
                        key={g.label}
                        label={`${g.label}: ${g.configured ? 'Ready' : 'Not Configured'}`}
                        tone={g.configured ? 'emerald' : 'amber'}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      label: 'Cash on Delivery (COD)',
                      hint: 'Offline verification on delivery',
                      val: codEnabled,
                      set: setCodEnabled,
                    },
                    {
                      label: 'bKash Digital Wallet',
                      hint: integrations.bkash ? 'Official bKash Tokenized Checkout Ready' : 'Requires BKASH_* credentials in server env',
                      val: bkashEnabled,
                      set: setBkashEnabled,
                    },
                    {
                      label: 'নগদ (Nagad) Digital Payment',
                      hint: integrations.nagad ? 'Official Nagad PG RSA API Ready' : 'Requires NAGAD_* credentials in server env',
                      val: nagadEnabled,
                      set: setNagadEnabled,
                    },
                    {
                      label: 'SSLCommerz Gateway',
                      hint: integrations.sslcommerz ? 'SSLCommerz Session v4 + IPN Ready' : 'Requires PAYMENT_STORE_* credentials in server env',
                      val: sslcommerzEnabled,
                      set: setSslcommerzEnabled,
                    },
                    {
                      label: 'Visa / Mastercard / Cards',
                      hint: integrations.card ? 'Hosted SSLCommerz 3DS Card Checkout Ready' : 'Requires PAYMENT_STORE_* credentials in server env',
                      val: cardEnabled,
                      set: setCardEnabled,
                    },
                  ].map((m) => (
                    <label
                      key={m.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-3.5 text-xs font-semibold cursor-pointer"
                    >
                      <div>
                        <div>{m.label}</div>
                        <div className="mt-0.5 text-[11px] font-normal text-[#64748B]">{m.hint}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={m.val}
                        onChange={(e) => m.set(e.target.checked)}
                        className="h-4 w-4 rounded text-[#145CFF] shrink-0"
                      />
                    </label>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-[#E4EAF5] dark:border-slate-800">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Maximum COD Order Limit (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={codMaxAmount}
                      onChange={(e) => setCodMaxAmount(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">COD Checkout Instructions</label>
                    <input
                      value={codInstructions}
                      onChange={(e) => setCodInstructions(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Payment Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
