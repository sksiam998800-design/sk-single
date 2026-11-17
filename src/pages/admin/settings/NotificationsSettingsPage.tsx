import { useEffect, useState, type FormEvent } from 'react';
import { Bell, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function NotificationsSettingsPage() {
  useSeoMeta({ title: 'Notification Settings | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(true);
  const [newReviewAlert, setNewReviewAlert] = useState(true);
  const [newEnquiryAlert, setNewEnquiryAlert] = useState(true);
  const [lowStockThresholdDefault, setLowStockThresholdDefault] = useState('5');

  useEffect(() => {
    const n = config?.notificationSettings;
    if (!n) return;
    setLowStockAlert(Boolean(n.lowStockAlert ?? true));
    setNewOrderAlert(Boolean(n.newOrderAlert ?? true));
    setNewReviewAlert(Boolean(n.newReviewAlert ?? true));
    setNewEnquiryAlert(Boolean(n.newEnquiryAlert ?? true));
    setLowStockThresholdDefault(String(n.lowStockThresholdDefault ?? 5));
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        notificationSettings: {
          lowStockAlert,
          newOrderAlert,
          newReviewAlert,
          newEnquiryAlert,
          lowStockThresholdDefault: Number(lowStockThresholdDefault || 5),
        },
      },
      'Notification preferences updated.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="settings.manage">
        <div className="space-y-5 max-w-[840px] mx-auto">
          <AdminPageHeader
            title="Notification Settings"
            subtitle="Configure admin bell feed alerts and global default low-stock thresholds."
            breadcrumbs={[{ label: 'System Settings' }, { label: 'Notification Settings' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={1} />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-5"
            >
              <h2 className="font-display text-sm font-bold flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#145CFF]" /> Operations Alert Triggers
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'New Order Pending Alert', val: newOrderAlert, set: setNewOrderAlert },
                  { label: 'Low Stock Threshold Warning', val: lowStockAlert, set: setLowStockAlert },
                  { label: 'New Review Moderation Alert', val: newReviewAlert, set: setNewReviewAlert },
                  { label: 'Support Ticket Open Alert', val: newEnquiryAlert, set: setNewEnquiryAlert },
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
              <div className="max-w-xs">
                <label className="mb-1 block text-xs font-semibold">Default Low Stock Threshold (Units)</label>
                <input
                  type="number"
                  min={0}
                  value={lowStockThresholdDefault}
                  onChange={(e) => setLowStockThresholdDefault(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
