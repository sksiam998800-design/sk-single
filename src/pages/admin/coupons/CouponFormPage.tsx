import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { CategoryItem, CouponItem } from '../../../types/commerce';
import { toLocalDateTimeInputValue } from '../../../lib/dateTime';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function CouponFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  useSeoMeta({ title: `${isEdit ? 'Edit' : 'Create'} Coupon | NOVARA Admin`, noIndex: true });

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('1000');
  const [usageLimit, setUsageLimit] = useState('');
  const [perCustomerLimit, setPerCustomerLimit] = useState('1');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [eligibleCategoryIds, setEligibleCategoryIds] = useState<string[]>([]);
  const [eligibleProductIds, setEligibleProductIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const catRes = await apiRequest<{ ok: true; categories: CategoryItem[] }>('/api/admin/categories');
        if (cancelled) return;
        setCategories(catRes.categories || []);

        if (id) {
          const res = await apiRequest<{ ok: true; coupon: CouponItem }>(`/api/admin/coupons/${id}`);
          if (cancelled) return;
          const c = res.coupon;
          setCode(c.code);
          setDescription(c.description || '');
          setDiscountType(c.discountType);
          setDiscountValue(String(c.discountValue));
          setMaxDiscountAmount(c.maxDiscountAmount != null ? String(c.maxDiscountAmount) : '');
          setMinOrderAmount(String(c.minOrderAmount ?? 0));
          setUsageLimit(c.usageLimit != null ? String(c.usageLimit) : '');
          setPerCustomerLimit(c.perCustomerLimit != null ? String(c.perCustomerLimit) : '');
          setStartsAt(toLocalDateTimeInputValue(c.startsAt));
          setEndsAt(toLocalDateTimeInputValue(c.endsAt));
          setEligibleCategoryIds(c.eligibleCategoryIds || []);
          setEligibleProductIds(c.eligibleProductIds || []);
          setIsActive(Boolean(c.isActive));
        } else {
          setCode('');
          setDescription('');
          setDiscountType('percentage');
          setDiscountValue('10');
          setMaxDiscountAmount('');
          setMinOrderAmount('1000');
          setUsageLimit('');
          setPerCustomerLimit('1');
          setStartsAt('');
          setEndsAt('');
          setEligibleCategoryIds([]);
          setEligibleProductIds([]);
          setIsActive(true);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load coupon.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleCat = (catId: string) => {
    setEligibleCategoryIds((prev) => (prev.includes(catId) ? prev.filter((x) => x !== catId) : [...prev, catId]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        description: description.trim(),
        discountType,
        discountValue: Number(discountValue),
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        minOrderAmount: Number(minOrderAmount || 0),
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perCustomerLimit: perCustomerLimit ? Number(perCustomerLimit) : null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        eligibleCategoryIds,
        eligibleProductIds,
        isActive,
      };
      if (isEdit && id) {
        await apiRequest(`/api/admin/coupons/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: `Coupon ${payload.code} updated.` }));
      } else {
        await apiRequest('/api/admin/coupons', { method: 'POST', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: `Coupon ${payload.code} created.` }));
      }
      navigate('/admin/coupons');
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Save failed.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="marketing.manage">
        <div className="space-y-5 max-w-[920px] mx-auto">
          <AdminPageHeader
            title={isEdit ? 'Edit Coupon' : 'Create Coupon'}
            subtitle="Configure promotional voucher codes, maximum caps, usage quotas, and eligible categories."
            breadcrumbs={[
              { label: 'Coupons & Offers' },
              { label: 'Coupons', to: '/admin/coupons' },
              { label: isEdit ? 'Edit Coupon' : 'Create Coupon' },
            ]}
            actions={
              <Link
                to="/admin/coupons"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Link>
            }
          />

          {error && <ErrorBanner message={error} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Coupon Code *</label>
                    <input
                      required
                      minLength={3}
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="NOVARA10"
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Taka (৳)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">
                      Discount Value ({discountType === 'percentage' ? '%' : '৳'}) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={discountType === 'percentage' ? 100 : undefined}
                      required
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Max Discount Cap (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                      placeholder="Optional"
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Min Order Amount (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Total Redemption Limit</label>
                    <input
                      type="number"
                      min={1}
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                      placeholder="Unlimited if blank"
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Per-Customer Limit</label>
                    <input
                      type="number"
                      min={1}
                      value={perCustomerLimit}
                      onChange={(e) => setPerCustomerLimit(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Description</label>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="10% welcome discount on electronics"
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

                <div className="pt-2 border-t border-[#E4EAF5] dark:border-slate-800">
                  <div className="mb-2 text-xs font-semibold">Eligible Categories (leave empty for storewide)</div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const selected = eligibleCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCat(cat.id)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors ${
                            selected
                              ? 'bg-[#145CFF] text-white border-[#145CFF]'
                              : 'border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 text-[#64748B]'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-semibold pt-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded text-[#145CFF]"
                  />
                  Coupon Active
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <Link
                  to="/admin/coupons"
                  className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-5 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : isEdit ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
