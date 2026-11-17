import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Package,
  RefreshCw,
  ShoppingCart,
  Truck,
  XCircle,
} from 'lucide-react';
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
import { Modal } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { OrderRecord } from '../../../types/commerce';
import { ORDER_TRANSITIONS, type OrderStatus } from '../../../lib/orderStateMachine';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export type OrderStatusGroup = '' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const GROUP_TITLES: Record<OrderStatusGroup, string> = {
  '': 'All Orders',
  pending: 'Pending Orders',
  processing: 'Processing & Packed Orders',
  shipped: 'Shipped Orders',
  delivered: 'Delivered Orders',
  cancelled: 'Cancelled & Returned Orders',
};

interface OrderStatsPayload {
  totalOrders: number;
  newTodayCount: number;
  pending: number;
  confirmed: number;
  processing: number;
  packed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  return_requested: number;
  returned: number;
  pendingCancellationRequests?: number;
  totalSales: number;
  paidOrders: number;
  pendingPayments: number;
  unpaidOrders: number;
}

export function OrdersListPage({ initialStatusGroup = '' }: { initialStatusGroup?: OrderStatusGroup }) {
  const pageTitle = GROUP_TITLES[initialStatusGroup] || 'Orders';
  useSeoMeta({ title: `${pageTitle} | NOVARA Admin`, noIndex: true });
  const dispatch = useAppDispatch();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [stats, setStats] = useState<OrderStatsPayload | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'total_desc' | 'total_asc'>('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusTarget, setStatusTarget] = useState<OrderRecord | null>(null);
  const [nextStatus, setNextStatus] = useState<'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled'>('confirmed');
  const [courierName, setCourierName] = useState('Steadfast Courier');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatusFilter('');
    setPage(1);
  }, [initialStatusGroup]);

  const loadOrders = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (search.trim()) qs.set('q', search.trim());
        if (statusFilter) qs.set('status', statusFilter);
        else if (initialStatusGroup) qs.set('statusGroup', initialStatusGroup);
        if (paymentFilter) qs.set('paymentStatus', paymentFilter);
        if (fulfillmentFilter) qs.set('fulfillmentStatus', fulfillmentFilter);
        if (dateFrom) qs.set('dateFrom', dateFrom);
        if (dateTo) qs.set('dateTo', dateTo);

        if (sortOption === 'oldest') {
          qs.set('sortBy', 'createdAt');
          qs.set('sortOrder', 'asc');
        } else if (sortOption === 'total_desc') {
          qs.set('sortBy', 'total');
          qs.set('sortOrder', 'desc');
        } else if (sortOption === 'total_asc') {
          qs.set('sortBy', 'total');
          qs.set('sortOrder', 'asc');
        }

        qs.set('page', String(page));
        qs.set('limit', '25');

        const [ordersRes, statsRes] = await Promise.all([
          apiRequest<{
            ok: true;
            orders: OrderRecord[];
            pagination: { page: number; limit: number; total: number; totalPages: number };
          }>(`/api/admin/orders?${qs.toString()}`),
          apiRequest<{ ok: true; stats: OrderStatsPayload }>('/api/admin/orders/stats').catch(() => null),
        ]);

        setOrders(ordersRes.orders || []);
        if (ordersRes.pagination) setPagination(ordersRes.pagination);
        if (statsRes?.stats) setStats(statsRes.stats);
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Unable to load orders.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, initialStatusGroup, paymentFilter, fulfillmentFilter, dateFrom, dateTo, sortOption, page],
  );

  useEffect(() => {
    loadOrders(false);

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadOrders(true);
      }
    }, 15000);

    const handleFocus = () => loadOrders(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadOrders]);

  const handleStatusUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!statusTarget) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ ok: true; order: OrderRecord }>(`/api/admin/orders/${statusTarget.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          nextStatus,
          courierName: nextStatus === 'shipped' ? courierName : undefined,
          trackingNumber: nextStatus === 'shipped' ? trackingNumber : undefined,
          reason: statusReason || undefined,
        }),
      });
      dispatch(showToast({ variant: 'success', message: `Order ${res.order.orderNumber} updated to ${nextStatus}.` }));
      setStatusTarget(null);
      setStatusReason('');
      setTrackingNumber('');
      loadOrders(false);
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Transition failed.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="orders.view">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title={pageTitle}
            subtitle="Monitor live checkout orders, verify COD & digital payments, assign couriers, and transition fulfillment stages."
            breadcrumbs={[{ label: 'Sales & Orders' }, { label: pageTitle }]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadOrders(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-[#145CFF] ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'Syncing...' : 'Sync Orders'}</span>
                </button>
                <Link
                  to="/admin/orders/cancellation-requests"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                >
                  <span>Cancellation Requests</span>
                  {typeof stats?.pendingCancellationRequests === 'number' && stats.pendingCancellationRequests > 0 && (
                    <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {stats.pendingCancellationRequests}
                    </span>
                  )}
                </Link>
                <Link
                  to="/admin/returns"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
                >
                  Returns &amp; Refunds
                </Link>
              </div>
            }
          />

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                label: 'Total Orders',
                value: stats ? stats.totalOrders.toLocaleString() : '—',
                sub: stats ? `${stats.newTodayCount} today` : 'Loading...',
                icon: ShoppingCart,
                tone: 'bg-blue-50 text-[#145CFF]',
              },
              {
                label: 'Pending / Confirmed',
                value: stats ? (stats.pending + stats.confirmed).toLocaleString() : '—',
                sub: stats ? `${stats.pending} pending` : '',
                icon: Clock,
                tone: 'bg-amber-50 text-amber-600',
              },
              {
                label: 'Processing / Packed',
                value: stats ? (stats.processing + stats.packed).toLocaleString() : '—',
                sub: stats ? `${stats.shipped} shipped` : '',
                icon: Package,
                tone: 'bg-indigo-50 text-indigo-600',
              },
              {
                label: 'Delivered',
                value: stats ? stats.delivered.toLocaleString() : '—',
                sub: stats ? `${stats.cancelled + stats.returned} cancelled/ret.` : '',
                icon: CheckCircle2,
                tone: 'bg-emerald-50 text-emerald-600',
              },
              {
                label: 'Total Sales',
                value: stats ? `৳${stats.totalSales.toLocaleString('en-IN')}` : '—',
                sub: 'Excl. cancelled',
                icon: CreditCard,
                tone: 'bg-sky-50 text-sky-600',
              },
              {
                label: 'Payments',
                value: stats ? `${stats.paidOrders} paid` : '—',
                sub: stats ? `${stats.pendingPayments} pending/unpaid` : '',
                icon: XCircle,
                tone: 'bg-slate-100 text-slate-700',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-3.5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#64748B] truncate">{card.label}</span>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-1.5 font-display text-lg font-bold text-[#101B35] dark:text-white font-mono-tabular truncate">
                    {card.value}
                  </div>
                  {card.sub && <div className="text-[11px] text-[#64748B] truncate">{card.sub}</div>}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { to: '/admin/orders', key: '', label: 'All Orders' },
              { to: '/admin/orders/pending', key: 'pending', label: 'Pending' },
              { to: '/admin/orders/processing', key: 'processing', label: 'Processing' },
              { to: '/admin/orders/shipped', key: 'shipped', label: 'Shipped' },
              { to: '/admin/orders/delivered', key: 'delivered', label: 'Delivered' },
              { to: '/admin/orders/cancelled', key: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  initialStatusGroup === tab.key
                    ? 'bg-[#145CFF] text-white'
                    : 'border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] text-[#64748B] dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </Link>
            ))}
            <Link
              to="/admin/orders/cancellation-requests"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 px-3.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100"
            >
              <span>Cancellation Requests</span>
              {typeof stats?.pendingCancellationRequests === 'number' && stats.pendingCancellationRequests > 0 && (
                <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {stats.pendingCancellationRequests}
                </span>
              )}
            </Link>
          </div>

          <SearchFilterBar
            searchValue={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            searchPlaceholder="Search order #, customer name, email, or phone..."
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter exact order status"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                >
                  <option value="">All Exact Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="return_requested">Return Requested</option>
                  <option value="returned">Returned</option>
                </select>

                <select
                  value={paymentFilter}
                  onChange={(e) => {
                    setPaymentFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter payment status"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                >
                  <option value="">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="unpaid">Unpaid (COD)</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>

                <select
                  value={fulfillmentFilter}
                  onChange={(e) => {
                    setFulfillmentFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter delivery status"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                >
                  <option value="">All Delivery</option>
                  <option value="unfulfilled">Unfulfilled</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="returned">Returned</option>
                </select>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter orders from date"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                />

                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter orders to date"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                />

                <select
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value as typeof sortOption);
                    setPage(1);
                  }}
                  aria-label="Sort orders"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="total_desc">Amount: High to Low</option>
                  <option value="total_asc">Amount: Low to High</option>
                </select>
              </div>
            }
          />

          {error && <ErrorBanner message={error} onRetry={() => loadOrders(false)} />}

          <DataTable<OrderRecord>
            rows={orders}
            rowKey={(o) => o.id}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            emptyState={
              <EmptyStateCard
                icon={<ShoppingCart className="h-6 w-6" />}
                title="No orders match this view"
                description="Incoming customer checkouts and payment-verified orders will appear here automatically."
              />
            }
            columns={[
              {
                key: 'order',
                header: 'Order #',
                render: (o) => (
                  <div>
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="font-mono-tabular font-bold text-[#145CFF] hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <div className="text-[11px] text-[#64748B]">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                ),
              },
              {
                key: 'customer',
                header: 'Customer & Zone',
                render: (o) => (
                  <div>
                    <div className="font-semibold text-[#101B35] dark:text-white">{o.customerName}</div>
                    <div className="text-[11px] text-[#64748B]">
                      {o.shippingAddress.district}, {o.shippingAddress.division} · {o.customerPhone}
                    </div>
                  </div>
                ),
              },
              {
                key: 'items',
                header: 'Items',
                render: (o) => {
                  const qty = (o.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                  return (
                    <div className="text-xs">
                      <span className="font-mono-tabular font-bold text-[#101B35] dark:text-white">{qty} qty</span>
                      <div className="text-[11px] text-[#64748B]">
                        {(o.items || []).length} product{(o.items || []).length === 1 ? '' : 's'}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'payment',
                header: 'Payment',
                render: (o) => (
                  <div className="flex flex-col gap-1">
                    <span className="uppercase font-semibold text-xs">{o.paymentMethod}</span>
                    <StatusBadge label={o.paymentStatus} tone={statusToTone(o.paymentStatus)} />
                  </div>
                ),
              },
              {
                key: 'delivery',
                header: 'Delivery',
                render: (o) => (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-[#101B35] dark:text-slate-200 truncate max-w-[130px]">
                      {o.deliveryMethodName || (o.deliveryMethod === 'express' ? 'Priority Express' : 'Standard Delivery')}
                    </span>
                    <StatusBadge
                      label={o.fulfillmentStatus || 'unfulfilled'}
                      tone={statusToTone(o.fulfillmentStatus || 'unfulfilled')}
                    />
                  </div>
                ),
              },
              {
                key: 'total',
                header: 'Amount',
                render: (o) => (
                  <span className="font-mono-tabular font-bold text-[#101B35] dark:text-white">
                    ৳{o.total.toLocaleString('en-IN')}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Order Status',
                render: (o) => (
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge label={o.orderStatus.replace(/_/g, ' ')} tone={statusToTone(o.orderStatus)} />
                    {o.cancellationRequest?.status === 'pending' && (
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 hover:underline"
                      >
                        Cancel Requested
                      </Link>
                    )}
                  </div>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (o) => {
                  const allowedNext = (ORDER_TRANSITIONS[o.orderStatus as OrderStatus] || []).filter((s) =>
                    ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'].includes(s),
                  );
                  return (
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#145CFF]" /> Details
                      </Link>
                      {allowedNext.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatusTarget(o);
                            setNextStatus(allowedNext[0] as typeof nextStatus);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#145CFF] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                        >
                          <Truck className="h-3.5 w-3.5" /> Fulfill
                        </button>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />

          <Modal
            open={Boolean(statusTarget)}
            onClose={() => setStatusTarget(null)}
            title={`Update Fulfillment · ${statusTarget?.orderNumber || ''}`}
            size="md"
          >
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold">Next Order Status</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as typeof nextStatus)}
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                >
                  {(
                    statusTarget
                      ? (ORDER_TRANSITIONS[statusTarget.orderStatus as OrderStatus] || []).filter((s) =>
                          ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'].includes(s),
                        )
                      : ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled']
                  ).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'shipped'
                        ? 'Shipped (Dispatches Stock)'
                        : opt === 'cancelled'
                          ? 'Cancelled (Restores Reserved Stock)'
                          : opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              {nextStatus === 'shipped' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Courier Partner</label>
                    <select
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="Steadfast Courier">Steadfast Courier</option>
                      <option value="RedX Logistics">RedX Logistics</option>
                      <option value="Pathao Courier">Pathao Courier</option>
                      <option value="SA Paribahan">SA Paribahan</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Tracking Number *</label>
                    <input
                      required
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="TRK-BD-..."
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold">Transition Reason / Note</label>
                <input
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Optional reason saved to timeline"
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusTarget(null)}
                  className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Apply Status'}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
