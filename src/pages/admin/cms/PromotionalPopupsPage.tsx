import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BellRing, Plus, Save, Trash2 } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { CloudinaryImageField } from '../../../components/admin/CloudinaryImageField';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import { toLocalDateTimeInputValue } from '../../../lib/dateTime';
import { useSeoMeta } from '../../../lib/useSeoMeta';

interface PromoPopupItem {
  title: string;
  subtitle: string;
  imageUrl?: string;
  ctaLabel: string;
  ctaUrl: string;
  couponCode?: string;
  delaySeconds: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
}

export function PromotionalPopupsPage() {
  useSeoMeta({ title: 'Promotional Popups | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [popups, setPopups] = useState<PromoPopupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; config: { promotionalPopups?: PromoPopupItem[] } }>('/api/admin/cms/homepage');
      setPopups(
        (res.config?.promotionalPopups || []).map((p) => ({
          title: p.title || '',
          subtitle: p.subtitle || '',
          imageUrl: p.imageUrl || '',
          ctaLabel: p.ctaLabel || 'Claim Offer',
          ctaUrl: p.ctaUrl || '/offers',
          couponCode: p.couponCode || '',
          delaySeconds: Number(p.delaySeconds ?? 5),
          isActive: Boolean(p.isActive),
          startsAt: toLocalDateTimeInputValue(p.startsAt),
          endsAt: toLocalDateTimeInputValue(p.endsAt),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load promotional popups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addPopup = () => {
    setPopups((prev) => [
      ...prev,
      {
        title: 'Unlock 10% Off Your First Order',
        subtitle: 'Use voucher NOVARA10 at checkout on orders above ৳1,500.',
        imageUrl: '',
        ctaLabel: 'Shop Offers',
        ctaUrl: '/offers',
        couponCode: 'NOVARA10',
        delaySeconds: 6,
        isActive: false,
        startsAt: '',
        endsAt: '',
      },
    ]);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = popups.map((p) => ({
        title: p.title.trim(),
        subtitle: p.subtitle.trim(),
        imageUrl: p.imageUrl?.trim() || '',
        ctaLabel: p.ctaLabel.trim(),
        ctaUrl: p.ctaUrl.trim(),
        couponCode: p.couponCode?.trim() || '',
        delaySeconds: Number(p.delaySeconds || 0),
        isActive: Boolean(p.isActive),
        startsAt: p.startsAt ? new Date(p.startsAt).toISOString() : null,
        endsAt: p.endsAt ? new Date(p.endsAt).toISOString() : null,
      }));
      await apiRequest('/api/admin/cms/homepage', {
        method: 'PUT',
        body: JSON.stringify({ promotionalPopups: payload }),
      });
      dispatch(showToast({ variant: 'success', message: 'Promotional popups saved.' }));
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Save failed.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="cms.manage">
        <div className="space-y-5 max-w-[1040px] mx-auto">
          <AdminPageHeader
            title="Promotional Popups"
            subtitle="Configure timed storefront promotional modals with voucher codes and Cloudinary campaign artwork."
            breadcrumbs={[{ label: 'Marketing' }, { label: 'Promotional Popups' }]}
            actions={
              <button
                type="button"
                onClick={addPopup}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <Plus className="h-4 w-4" /> Add Popup
              </button>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {popups.length === 0 ? (
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-10 text-center text-xs text-[#64748B]">
                  <BellRing className="mx-auto mb-2 h-6 w-6 text-[#145CFF]" />
                  No promotional popups configured. Click "Add Popup" to create a conversion overlay.
                </div>
              ) : (
                popups.map((popup, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold">Popup #{idx + 1}</span>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={popup.isActive}
                            onChange={(e) =>
                              setPopups((prev) => prev.map((r, i) => (i === idx ? { ...r, isActive: e.target.checked } : r)))
                            }
                            className="h-4 w-4 rounded text-[#145CFF]"
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          onClick={() => setPopups((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold">Headline *</label>
                        <input
                          required
                          value={popup.title}
                          onChange={(e) =>
                            setPopups((prev) => prev.map((r, i) => (i === idx ? { ...r, title: e.target.value } : r)))
                          }
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold">Coupon Code (optional)</label>
                        <input
                          value={popup.couponCode || ''}
                          onChange={(e) =>
                            setPopups((prev) => prev.map((r, i) => (i === idx ? { ...r, couponCode: e.target.value } : r)))
                          }
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold">Subtitle</label>
                        <input
                          value={popup.subtitle}
                          onChange={(e) =>
                            setPopups((prev) => prev.map((r, i) => (i === idx ? { ...r, subtitle: e.target.value } : r)))
                          }
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold">CTA Label *</label>
                        <input
                          required
                          value={popup.ctaLabel}
                          onChange={(e) =>
                            setPopups((prev) => prev.map((r, i) => (i === idx ? { ...r, ctaLabel: e.target.value } : r)))
                          }
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold">CTA URL *</label>
                          <input
                            required
                            value={popup.ctaUrl}
                            onChange={(e) =>
                              setPopups((prev) => prev.map((r, i) => (i === idx ? { ...r, ctaUrl: e.target.value } : r)))
                            }
                            className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold">Delay (sec)</label>
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={popup.delaySeconds}
                            onChange={(e) =>
                              setPopups((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, delaySeconds: Number(e.target.value) } : r)),
                              )
                            }
                            className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold">Starts At (Optional)</label>
                        <input
                          type="datetime-local"
                          value={popup.startsAt || ''}
                          onChange={(e) =>
                            setPopups((prev) => prev.map((r, i) => (i === idx ? { ...r, startsAt: e.target.value } : r)))
                          }
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold">Ends At (Optional)</label>
                        <input
                          type="datetime-local"
                          value={popup.endsAt || ''}
                          onChange={(e) =>
                            setPopups((prev) => prev.map((r, i) => (i === idx ? { ...r, endsAt: e.target.value } : r)))
                          }
                          className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                      </div>
                    </div>

                    <CloudinaryImageField
                      label="Popup Artwork"
                      folder="novara/popups"
                      value={popup.imageUrl || ''}
                      onChange={(url) =>
                        setPopups((prev) => prev.map((r, i) => (i === idx ? { ...r, imageUrl: url } : r)))
                      }
                    />
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
                  {saving ? 'Saving...' : 'Save Popups'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
