import { useEffect, useState, type FormEvent } from 'react';
import { Mail, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards, StatusBadge } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function EmailSettingsPage() {
  useSeoMeta({ title: 'Email Settings | NOVARA Admin', noIndex: true });
  const { config, integrations, loading, saving, error, load, savePatch } = useAdminSettings();

  const [senderName, setSenderName] = useState('NOVARA COMMERCE');
  const [senderEmail, setSenderEmail] = useState('orders@novara.bd');
  const [replyTo, setReplyTo] = useState('support@novara.bd');
  const [orderConfirmationSubject, setOrderConfirmationSubject] = useState('Your NOVARA Order Confirmation');
  const [shippingUpdateSubject, setShippingUpdateSubject] = useState('Your NOVARA Order Has Shipped');

  useEffect(() => {
    const e = config?.emailSettings;
    if (!e) return;
    setSenderName(e.senderName || 'NOVARA COMMERCE');
    setSenderEmail(e.senderEmail || '');
    setReplyTo(e.replyTo || '');
    setOrderConfirmationSubject(e.orderConfirmationSubject || '');
    setShippingUpdateSubject(e.shippingUpdateSubject || '');
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        emailSettings: { senderName, senderEmail, replyTo, orderConfirmationSubject, shippingUpdateSubject },
      },
      'Email settings updated.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="settings.manage">
        <div className="space-y-5 max-w-[900px] mx-auto">
          <AdminPageHeader
            title="Email Settings"
            subtitle="Configure transactional sender identity, reply-to address, and customer notification subject lines."
            breadcrumbs={[{ label: 'System Settings' }, { label: 'Email Settings' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={1} />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#145CFF]" /> Transactional Email Preferences
                </h2>
                <StatusBadge
                  label={integrations.smtp ? 'SMTP Transport Connected' : 'SMTP Env Not Set'}
                  tone={integrations.smtp ? 'emerald' : 'amber'}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Sender Display Name</label>
                  <input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Sender Email</label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Reply-To Address</label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Order Confirmation Subject</label>
                  <input
                    value={orderConfirmationSubject}
                    onChange={(e) => setOrderConfirmationSubject(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold">Shipping Dispatch Email Subject</label>
                  <input
                    value={shippingUpdateSubject}
                    onChange={(e) => setShippingUpdateSubject(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
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
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
