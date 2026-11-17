import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, MessageSquare, Sparkles, Star, Trash2, X } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  SearchFilterBar,
  StatusBadge,
  statusToTone,
} from '../../../components/admin/ui';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { ReviewItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function ReviewsListPage() {
  useSeoMeta({ title: 'Reviews & Ratings | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReviewItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (ratingFilter) qs.set('rating', ratingFilter);
      if (search.trim()) qs.set('q', search.trim());
      const res = await apiRequest<{ ok: true; reviews: ReviewItem[] }>(`/api/admin/reviews?${qs.toString()}`);
      setReviews(res.reviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load product reviews.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, ratingFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const reviewId = (r: ReviewItem) => r.id || r._id;

  const moderate = async (r: ReviewItem, nextStatus: 'approved' | 'rejected') => {
    try {
      await apiRequest(`/api/admin/reviews/${reviewId(r)}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      dispatch(showToast({ variant: 'success', message: `Review ${nextStatus}.` }));
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Moderation failed.' }));
    }
  };

  const toggleFeatured = async (r: ReviewItem) => {
    try {
      await apiRequest(`/api/admin/reviews/${reviewId(r)}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ isFeatured: !r.isFeatured }),
      });
      dispatch(showToast({ variant: 'success', message: !r.isFeatured ? 'Review featured on homepage.' : 'Removed from featured reviews.' }));
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Update failed.' }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/admin/reviews/${reviewId(deleteTarget)}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Review deleted.' }));
      setDeleteTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="reviews.moderate">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Reviews & Ratings"
            subtitle="Moderate verified buyer feedback, highlight featured testimonials, and remove spam."
            breadcrumbs={[{ label: 'Customer' }, { label: 'Reviews & Ratings' }]}
          />

          <SearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search reviewer, headline, or comment..."
            filters={
              <>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by moderation status"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  aria-label="Filter by star rating"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}

          <DataTable<ReviewItem>
            rows={reviews}
            rowKey={(r) => reviewId(r)}
            loading={loading}
            emptyState={
              <EmptyStateCard
                icon={<MessageSquare className="h-6 w-6" />}
                title="No reviews match this filter"
                description="Customer ratings and reviews submitted on product pages appear here for moderation."
              />
            }
            columns={[
              {
                key: 'reviewer',
                header: 'Reviewer & Rating',
                render: (r) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-white flex items-center gap-1.5">
                      {r.userName}
                      {r.isVerifiedPurchase && <StatusBadge label="Verified" tone="emerald" />}
                    </div>
                    <div className="mt-1 flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: 'comment',
                header: 'Review Content',
                render: (r) => (
                  <div className="max-w-md">
                    {r.title && <div className="font-semibold text-[#101B35] dark:text-white">{r.title}</div>}
                    <p className="text-xs text-[#64748B] dark:text-slate-300 line-clamp-2">{r.comment}</p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <div className="flex flex-col gap-1 items-start">
                    <StatusBadge label={r.status} tone={statusToTone(r.status)} />
                    {r.isFeatured && <StatusBadge label="Featured" tone="indigo" />}
                  </div>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (r) => (
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/admin/reviews/${reviewId(r)}`}
                      className="rounded-lg border border-[#E4EAF5] dark:border-slate-700 p-1.5 text-slate-600 hover:bg-slate-50"
                      title="Inspect review"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => moderate(r, 'approved')}
                      title="Approve review"
                      className="rounded-lg border border-emerald-200 p-1.5 text-emerald-600 hover:bg-emerald-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moderate(r, 'rejected')}
                      title="Reject review"
                      className="rounded-lg border border-amber-200 p-1.5 text-amber-600 hover:bg-amber-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFeatured(r)}
                      title="Toggle featured testimonial"
                      className={`rounded-lg border p-1.5 ${
                        r.isFeatured ? 'border-[#145CFF] bg-[#EAF1FF] text-[#145CFF]' : 'border-[#E4EAF5] text-slate-500'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(r)}
                      title="Delete review"
                      className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
          />

          <ConfirmDialog
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete Review"
            message={`Permanently remove review by "${deleteTarget?.userName}"? Product average rating will recalculate automatically.`}
            confirmLabel="Delete Review"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
