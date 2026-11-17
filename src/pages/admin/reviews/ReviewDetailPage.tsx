import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles, Star, Trash2, X } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  ErrorBanner,
  LoadingCards,
  StatusBadge,
  statusToTone,
} from '../../../components/admin/ui';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { ReviewItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  useSeoMeta({ title: 'Review Detail | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [review, setReview] = useState<ReviewItem | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; review: ReviewItem }>(`/api/admin/reviews/${id}`);
      setReview(res.review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load review.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (nextStatus: 'approved' | 'rejected') => {
    if (!id) return;
    try {
      const res = await apiRequest<{ ok: true; review: ReviewItem }>(`/api/admin/reviews/${id}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, reason: reason.trim() || undefined }),
      });
      setReview(res.review);
      dispatch(showToast({ variant: 'success', message: `Review ${nextStatus}.` }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Action failed.' }));
    }
  };

  const toggleFeatured = async () => {
    if (!id || !review) return;
    try {
      const res = await apiRequest<{ ok: true; review: ReviewItem }>(`/api/admin/reviews/${id}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ isFeatured: !review.isFeatured }),
      });
      setReview(res.review);
      dispatch(showToast({ variant: 'success', message: res.review.isFeatured ? 'Marked as featured.' : 'Unfeatured.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Update failed.' }));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await apiRequest(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Review deleted.' }));
      navigate('/admin/reviews');
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="reviews.moderate">
        <div className="space-y-5 max-w-[900px] mx-auto">
          <AdminPageHeader
            title="Review Moderation Detail"
            subtitle="Inspect customer rating, verified purchase status, and publish or reject review visibility."
            breadcrumbs={[
              { label: 'Customer' },
              { label: 'Reviews & Ratings', to: '/admin/reviews' },
              { label: 'Inspect' },
            ]}
            actions={
              <Link
                to="/admin/reviews"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Reviews
              </Link>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : review ? (
            <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4EAF5] dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-bold text-[#101B35] dark:text-white">{review.userName}</span>
                    {review.isVerifiedPurchase && <StatusBadge label="Verified Buyer" tone="emerald" />}
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">{new Date(review.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={review.status} tone={statusToTone(review.status)} />
                  {review.isFeatured && <StatusBadge label="Featured Testimonial" tone="indigo" />}
                </div>
              </div>

              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                ))}
                <span className="ml-2 text-xs font-bold text-[#101B35] dark:text-white">{review.rating} / 5</span>
              </div>

              <div>
                {review.title && <h3 className="font-display text-base font-bold text-[#101B35] dark:text-white">{review.title}</h3>}
                <p className="mt-2 text-sm leading-relaxed text-[#64748B] dark:text-slate-300">{review.comment}</p>
              </div>

              <div className="border-t border-[#E4EAF5] dark:border-slate-800 pt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Moderation Note / Rejection Reason</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Optional note saved in audit trail"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => moderate('approved')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Check className="h-4 w-4" /> Approve Review
                    </button>
                    <button
                      type="button"
                      onClick={() => moderate('rejected')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                    >
                      <X className="h-4 w-4" /> Reject Review
                    </button>
                    <button
                      type="button"
                      onClick={toggleFeatured}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                    >
                      <Sparkles className="h-4 w-4 text-[#145CFF]" />
                      {review.isFeatured ? 'Unfeature' : 'Feature on Storefront'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <ConfirmDialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={handleDelete}
            title="Delete Review"
            message="Permanently delete this customer review?"
            confirmLabel="Delete"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
