import { useEffect, useState, type FormEvent } from 'react';
import { Lock, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function SecuritySettingsPage() {
  useSeoMeta({ title: 'Security Settings | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState('72');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('10');
  const [maintenanceBypassAdmin, setMaintenanceBypassAdmin] = useState(true);

  useEffect(() => {
    const s = config?.securitySettings;
    if (!s) return;
    setRequireEmailVerification(Boolean(s.requireEmailVerification));
    setSessionTimeoutHours(String(s.sessionTimeoutHours ?? 72));
    setMaxLoginAttempts(String(s.maxLoginAttempts ?? 10));
    setMaintenanceBypassAdmin(Boolean(s.maintenanceBypassAdmin ?? true));
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        securitySettings: {
          requireEmailVerification,
          sessionTimeoutHours: Number(sessionTimeoutHours || 72),
          maxLoginAttempts: Number(maxLoginAttempts || 10),
          maintenanceBypassAdmin,
        },
      },
      'Security policies saved.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="settings.manage">
        <div className="space-y-5 max-w-[840px] mx-auto">
          <AdminPageHeader
            title="Security Settings"
            subtitle="Configure session expiry windows, brute-force attempt caps, and maintenance bypass policies."
            breadcrumbs={[{ label: 'System Settings' }, { label: 'Security Settings' }]}
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
                <Lock className="h-4 w-4 text-[#145CFF]" /> Session & Authentication Controls
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Session Expiration (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={sessionTimeoutHours}
                    onChange={(e) => setSessionTimeoutHours(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Max Login Attempts</label>
                  <input
                    type="number"
                    min={3}
                    max={100}
                    value={maxLoginAttempts}
                    onChange={(e) => setMaxLoginAttempts(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-3.5 text-xs font-semibold cursor-pointer">
                  <span>Require Email Verification Before Checkout</span>
                  <input
                    type="checkbox"
                    checked={requireEmailVerification}
                    onChange={(e) => setRequireEmailVerification(e.target.checked)}
                    className="h-4 w-4 rounded text-[#145CFF]"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-3.5 text-xs font-semibold cursor-pointer">
                  <span>Allow Staff Bypass During Maintenance Mode</span>
                  <input
                    type="checkbox"
                    checked={maintenanceBypassAdmin}
                    onChange={(e) => setMaintenanceBypassAdmin(e.target.checked)}
                    className="h-4 w-4 rounded text-[#145CFF]"
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Security Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
