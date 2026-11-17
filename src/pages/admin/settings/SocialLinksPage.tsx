import { useEffect, useState, type FormEvent } from 'react';
import { Globe, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { useAdminSettings } from './useAdminSettings';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function SocialLinksPage() {
  useSeoMeta({ title: 'Social Media & Contact Links | NOVARA Admin', noIndex: true });
  const { config, loading, saving, error, load, savePatch } = useAdminSettings();

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [xUrl, setXUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [messengerUrl, setMessengerUrl] = useState('');

  useEffect(() => {
    const c = config?.contactInfo;
    if (!c) return;
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setFacebookUrl(c.facebookUrl || '');
    setYoutubeUrl(c.youtubeUrl || '');
    setInstagramUrl(c.instagramUrl || '');
    setLinkedinUrl(c.linkedinUrl || '');
    setXUrl(c.xUrl || '');
    setTiktokUrl(c.tiktokUrl || '');
    setWhatsappUrl(c.whatsappUrl || '');
    setMessengerUrl(c.messengerUrl || '');
  }, [config]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await savePatch(
      {
        contactInfo: {
          phone,
          email,
          address,
          facebookUrl,
          youtubeUrl,
          instagramUrl,
          linkedinUrl,
          xUrl,
          tiktokUrl,
          whatsappUrl,
          messengerUrl,
        },
      },
      'Contact & social links updated.',
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-5 max-w-[960px] mx-auto">
          <AdminPageHeader
            title="Social Media & Contact Links"
            subtitle="Manage storefront contact channels, Dhaka showroom address, and official social network URLs."
            breadcrumbs={[{ label: 'Website Management' }, { label: 'Social Media Links' }]}
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-5"
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                <Globe className="h-4 w-4 text-[#145CFF]" /> Public Contact & Social Channels
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Hotline Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1700-000000"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Public Support Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="support@novara.bd"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold">Showroom / Office Address</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>

                {[
                  { label: 'Facebook URL', val: facebookUrl, set: setFacebookUrl },
                  { label: 'YouTube URL', val: youtubeUrl, set: setYoutubeUrl },
                  { label: 'Instagram URL', val: instagramUrl, set: setInstagramUrl },
                  { label: 'LinkedIn URL', val: linkedinUrl, set: setLinkedinUrl },
                  { label: 'X (Twitter) URL', val: xUrl, set: setXUrl },
                  { label: 'TikTok URL', val: tiktokUrl, set: setTiktokUrl },
                  { label: 'WhatsApp Chat URL', val: whatsappUrl, set: setWhatsappUrl },
                  { label: 'Messenger Chat URL', val: messengerUrl, set: setMessengerUrl },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="mb-1 block text-xs font-semibold">{f.label}</label>
                    <input
                      value={f.val}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Social Links'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
