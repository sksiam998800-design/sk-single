import { useEffect, useState, type FormEvent } from 'react';
import { Save, Settings } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { CloudinaryImageField } from '../../../components/admin/CloudinaryImageField';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';
import type { ProductTrustHighlightItem } from '../../../types/commerce';

const DEFAULT_TRUST_HIGHLIGHTS: ProductTrustHighlightItem[] = [
  { icon: 'ShieldCheck', title: '100% Original', subtitle: 'Products' },
  { icon: 'Truck', title: 'Fast Delivery', subtitle: 'Across Bangladesh' },
  { icon: 'Headphones', title: '24/7 Support', subtitle: 'Always Here' },
  { icon: 'Lock', title: 'Secure Payment', subtitle: 'SSL Encrypted' },
  { icon: 'RotateCcw', title: 'Easy Returns', subtitle: 'Within 7 Days' },
];

export function GeneralSettingsPage() {
  useSeoMeta({ title: 'General & Store Settings | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [storeName, setStoreName] = useState('NOVARA COMMERCE');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');

  const [currencyCode, setCurrencyCode] = useState('BDT');
  const [currencySymbol, setCurrencySymbol] = useState('৳');
  const [currencyPos, setCurrencyPos] = useState<'prefix' | 'suffix'>('prefix');

  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintTitle, setMaintTitle] = useState('Scheduled Maintenance');
  const [maintMessage, setMaintMessage] = useState('We are upgrading our storefront experience and will return shortly.');
  const [trustHighlights, setTrustHighlights] = useState<ProductTrustHighlightItem[]>(DEFAULT_TRUST_HIGHLIGHTS);

  useEffect(() => {
    if (!config) return;
    if (config.storeInfo) {
      setStoreName(config.storeInfo.storeName || 'NOVARA COMMERCE');
      setTagline(config.storeInfo.tagline || '');
      setDescription(config.storeInfo.description || '');
      setLogoUrl(config.storeInfo.logoUrl || '');
      setFaviconUrl(config.storeInfo.faviconUrl || '');
      setSupportPhone(config.storeInfo.supportPhone || '');
      setSupportEmail(config.storeInfo.supportEmail || '');
    }
    if (config.currencySettings) {
      setCurrencyCode(config.currencySettings.code || 'BDT');
      setCurrencySymbol(config.currencySettings.symbol || '৳');
      setCurrencyPos(config.currencySettings.position || 'prefix');
    }
    if (config.maintenanceMode) {
      setMaintEnabled(Boolean(config.maintenanceMode.enabled));
      setMaintTitle(config.maintenanceMode.title || 'Scheduled Maintenance');
      setMaintMessage(config.maintenanceMode.message || '');
    }
    if (Array.isArray(config.productTrustHighlights) && config.productTrustHighlights.length > 0) {
      setTrustHighlights(config.productTrustHighlights);
    }
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        storeInfo: { storeName, tagline, description, logoUrl, faviconUrl, supportPhone, supportEmail },
        currencySettings: { code: currencyCode, symbol: currencySymbol, position: currencyPos },
        maintenanceMode: { enabled: maintEnabled, title: maintTitle, message: maintMessage },
        productTrustHighlights: trustHighlights.filter((t) => t.title.trim()),
      },
      'General store settings saved.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="settings.manage">
        <div className="space-y-5 max-w-[1040px] mx-auto">
          <AdminPageHeader
            title="General & Store Settings"
            subtitle="Configure store identity, brand logo, currency formatting, support contact, and maintenance mode."
            breadcrumbs={[{ label: 'System Settings' }, { label: 'General & Store' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={3} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <h2 className="font-display text-sm font-bold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-[#145CFF]" /> Store Identity & Contact
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Store Name *</label>
                    <input
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Tagline</label>
                    <input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Support Phone</label>
                    <input
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Support Email</label>
                    <input
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Store Summary</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CloudinaryImageField
                    label="Store Logo"
                    folder="novara/brand"
                    value={logoUrl}
                    onChange={(url) => setLogoUrl(url)}
                  />
                  <CloudinaryImageField
                    label="Favicon"
                    folder="novara/brand"
                    value={faviconUrl}
                    onChange={(url) => setFaviconUrl(url)}
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <h3 className="font-display text-sm font-bold">Currency Settings</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold">Code</label>
                      <input
                        value={currencyCode}
                        onChange={(e) => setCurrencyCode(e.target.value)}
                        className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold">Symbol</label>
                      <input
                        value={currencySymbol}
                        onChange={(e) => setCurrencySymbol(e.target.value)}
                        className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold">Position</label>
                      <select
                        value={currencyPos}
                        onChange={(e) => setCurrencyPos(e.target.value as 'prefix' | 'suffix')}
                        className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2 text-xs"
                      >
                        <option value="prefix">Prefix (৳100)</option>
                        <option value="suffix">Suffix (100৳)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold">Maintenance Mode</h3>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={maintEnabled}
                        onChange={(e) => setMaintEnabled(e.target.checked)}
                        className="h-4 w-4 rounded text-[#145CFF]"
                      />
                      Enabled
                    </label>
                  </div>
                  <input
                    value={maintTitle}
                    onChange={(e) => setMaintTitle(e.target.value)}
                    placeholder="Maintenance heading"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                  <input
                    value={maintMessage}
                    onChange={(e) => setMaintMessage(e.target.value)}
                    placeholder="Message shown to visitors"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                <h3 className="font-display text-sm font-bold">Product Details Trust & Service Strip</h3>
                <p className="text-xs text-[#64748B]">
                  Configure the 5 service guarantee badges displayed beneath the product showcase across all product pages.
                </p>
                <div className="grid gap-3 sm:grid-cols-5">
                  {trustHighlights.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/50 p-3 space-y-2">
                      <select
                        aria-label={`Trust icon ${idx + 1}`}
                        value={item.icon}
                        onChange={(e) =>
                          setTrustHighlights((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, icon: e.target.value } : row)),
                          )
                        }
                        className="w-full h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                      >
                        <option value="ShieldCheck">Shield</option>
                        <option value="Truck">Delivery Truck</option>
                        <option value="Headphones">24/7 Support</option>
                        <option value="Lock">Secure Lock</option>
                        <option value="RotateCcw">Easy Returns</option>
                        <option value="CheckCircle2">Verified Check</option>
                      </select>
                      <input
                        value={item.title}
                        onChange={(e) =>
                          setTrustHighlights((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, title: e.target.value } : row)),
                          )
                        }
                        placeholder="Heading"
                        className="w-full h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-semibold"
                      />
                      <input
                        value={item.subtitle}
                        onChange={(e) =>
                          setTrustHighlights((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, subtitle: e.target.value } : row)),
                          )
                        }
                        placeholder="Subtext"
                        className="w-full h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                      />
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
                  {saving ? 'Saving...' : 'Save General Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
