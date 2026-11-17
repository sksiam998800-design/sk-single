import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Edit3, Flame, Plus, Trash2 } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  StatusBadge,
} from '../../../components/admin/ui';
import { CloudinaryImageField } from '../../../components/admin/CloudinaryImageField';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { ResilientImage } from '../../../components/ui/ResilientImage';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import { toLocalDateTimeInputValue } from '../../../lib/dateTime';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export type CampaignType = 'special_offer' | 'flash_sale' | 'seasonal';

interface CampaignRecord {
  id: string;
  title: string;
  subtitle?: string;
  campaignType: CampaignType;
  discountLabel: string;
  badgeText?: string;
  bannerImageUrl?: string;
  ctaUrl: string;
  productIds: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}

const TITLES: Record<CampaignType, string> = {
  special_offer: 'Special Offers',
  flash_sale: 'Flash Sales',
  seasonal: 'Promotional Campaigns',
};

export function CampaignsPage({ defaultType }: { defaultType?: CampaignType }) {
  const title = defaultType ? TITLES[defaultType] : 'Promotional Campaigns';
  useSeoMeta({ title: `${title} | NOVARA Admin`, noIndex: true });
  const dispatch = useAppDispatch();

  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignType>(defaultType || 'special_offer');
  const [discountLabel, setDiscountLabel] = useState('Up to 40% OFF');
  const [badgeText, setBadgeText] = useState('LIMITED DEAL');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [ctaUrl, setCtaUrl] = useState('/offers');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CampaignRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = defaultType ? `?type=${defaultType}` : '';
      const res = await apiRequest<{ ok: true; campaigns: CampaignRecord[] }>(`/api/admin/promotions/campaigns${qs}`);
      setCampaigns(res.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load promotional campaigns.');
    } finally {
      setLoading(false);
    }
  }, [defaultType]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setFormTitle('');
    setSubtitle('');
    setCampaignType(defaultType || 'special_offer');
    setDiscountLabel('Up to 35% OFF');
    setBadgeText('HOT DEAL');
    setBannerImageUrl('');
    setCtaUrl('/offers');
    setStartsAt('');
    setEndsAt('');
    setProductIds([]);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (c: CampaignRecord) => {
    setEditingId(c.id);
    setFormTitle(c.title);
    setSubtitle(c.subtitle || '');
    setCampaignType(c.campaignType);
    setDiscountLabel(c.discountLabel);
    setBadgeText(c.badgeText || '');
    setBannerImageUrl(c.bannerImageUrl || '');
    setCtaUrl(c.ctaUrl || '/offers');
    setStartsAt(toLocalDateTimeInputValue(c.startsAt));
    setEndsAt(toLocalDateTimeInputValue(c.endsAt));
    setProductIds(c.productIds || []);
    setIsActive(c.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        subtitle: subtitle.trim(),
        campaignType,
        discountLabel: discountLabel.trim(),
        badgeText: badgeText.trim(),
        bannerImageUrl: bannerImageUrl.trim(),
        ctaUrl: ctaUrl.trim() || '/shop',
        productIds,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        isActive,
      };
      if (editingId) {
        await apiRequest(`/api/admin/promotions/campaigns/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Campaign updated.' }));
      } else {
        await apiRequest('/api/admin/promotions/campaigns', { method: 'POST', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Campaign created.' }));
      }
      setModalOpen(false);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Save failed.' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/admin/promotions/campaigns/${deleteTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Campaign deleted.' }));
      setDeleteTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="marketing.manage">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title={title}
            subtitle="Manage scheduled flash deals, seasonal specials, and curated storefront offer showcases."
            breadcrumbs={[{ label: 'Coupons & Offers' }, { label: title }]}
            actions={
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Create Campaign
              </button>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<CampaignRecord>
            rows={campaigns}
            rowKey={(c) => c.id}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<Flame className="h-6 w-6" />}
                title={`No ${title.toLowerCase()} active`}
                description="Launch flash sales or special offer campaigns to power the storefront /offers showcase."
                action={
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> New Campaign
                  </button>
                }
              />
            }
            columns={[
              {
                key: 'campaign',
                header: 'Campaign',
                render: (c) => (
                  <div className="flex items-center gap-3">
                    {c.bannerImageUrl && (
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E4EAF5] bg-[#F4F7FF]">
                        <ResilientImage src={c.bannerImageUrl} alt={c.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-[#101B35] dark:text-white">{c.title}</div>
                      <div className="text-[11px] text-[#64748B]">{c.subtitle || c.ctaUrl}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                render: (c) => <StatusBadge label={c.campaignType.replace(/_/g, ' ')} tone="blue" />,
              },
              {
                key: 'label',
                header: 'Highlight',
                render: (c) => <StatusBadge label={c.discountLabel} tone="amber" />,
              },
              {
                key: 'status',
                header: 'Status',
                render: (c) => (
                  <StatusBadge label={c.isActive ? 'Active' : 'Inactive'} tone={c.isActive ? 'emerald' : 'slate'} />
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (c) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editingId ? 'Edit Campaign' : 'Create Promotional Campaign'}
            size="lg"
          >
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Campaign Title *</label>
                  <input
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Campaign Type</label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value as CampaignType)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="special_offer">Special Offer</option>
                    <option value="flash_sale">Flash Sale</option>
                    <option value="seasonal">Seasonal Campaign</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Discount Highlight *</label>
                  <input
                    required
                    value={discountLabel}
                    onChange={(e) => setDiscountLabel(e.target.value)}
                    placeholder="Up to 40% OFF"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Badge Text</label>
                  <input
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">CTA Destination URL</label>
                  <input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Subtitle</label>
                  <input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Starts At</label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Ends At</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>

              <CloudinaryImageField
                label="Campaign Banner Image"
                folder="novara/campaigns"
                value={bannerImageUrl}
                onChange={(url) => setBannerImageUrl(url)}
              />

              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-[#145CFF]"
                />
                Campaign Active
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Campaign'}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete Campaign"
            message={`Delete "${deleteTarget?.title}"?`}
            confirmLabel="Delete"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
