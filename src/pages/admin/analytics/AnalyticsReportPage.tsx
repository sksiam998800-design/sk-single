import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { OrderStatusDonutChart, SalesOverviewChart } from '../../../components/admin/AdminCharts';
import { apiRequest, downloadAuthenticatedFile } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export type AnalyticsMetric = 'sales' | 'revenue' | 'products' | 'customers' | 'inventory';

const METRIC_META: Record<AnalyticsMetric, { title: string; subtitle: string }> = {
  sales: { title: 'Sales Analytics', subtitle: 'Order velocity, conversion breakdown by payment method, and regional demand.' },
  revenue: { title: 'Revenue Analytics', subtitle: 'Daily net revenue trajectory, discounts applied, and division revenue share.' },
  products: { title: 'Product Performance', subtitle: 'Top-performing SKUs ranked by units sold, ratings, and estimated gross revenue.' },
  customers: { title: 'Customer Analytics', subtitle: 'Highest lifetime-value buyers, repeat order frequency, and spend cohorts.' },
  inventory: { title: 'Inventory Reports', subtitle: 'Catalog stock valuation by publish status and warehouse unit counts.' },
};

interface AnalyticsData {
  days: number;
  ordersByPayment: Array<{ _id: string; count: number; total: number }>;
  ordersByDivision: Array<{ _id: string; count: number; total: number }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    soldCount: number;
    availableStock: number;
    revenueEstimate: number;
    ratingAverage: number;
  }>;
  topCustomers: Array<{
    _id: string;
    customerName: string;
    customerEmail: string;
    orderCount: number;
    totalSpent: number;
  }>;
  inventorySummary: Array<{ _id: string; count: number; totalUnits: number; stockValue: number }>;
  dailyRevenue: Array<{ _id: string; orders: number; revenue: number; discount: number }>;
  wishlistSummary?: {
    totalActiveWishlists: number;
    totalSavedItems: number;
    topWishlistedProducts: Array<{
      id: string;
      name: string;
      slug: string;
      sku: string;
      wishlistCount: number;
      price: number;
      availableStock: number;
      imageUrl?: string;
    }>;
  };
}

export function AnalyticsReportPage({ metric = 'sales' }: { metric?: AnalyticsMetric }) {
  const meta = METRIC_META[metric] || METRIC_META.sales;
  useSeoMeta({ title: `${meta.title} | NOVARA Admin`, noIndex: true });
  const dispatch = useAppDispatch();

  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true } & AnalyticsData>(`/api/admin/reports/analytics?days=${days}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics report.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const series = (data?.dailyRevenue || []).map((d) => ({
    date: d._id,
    label: d._id.slice(5),
    revenue: d.revenue,
    orders: d.orders,
  }));

  const paymentColors = ['#145CFF', '#10B981', '#F59E0B', '#6366F1'];
  const paymentTotal = Math.max(1, (data?.ordersByPayment || []).reduce((s, p) => s + p.count, 0));

  return (
    <AdminLayout>
      <PermissionGuard permission="reports.view">
        <div className="space-y-5 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title={meta.title}
            subtitle={meta.subtitle}
            breadcrumbs={[{ label: 'Reports & Analytics' }, { label: meta.title }]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  aria-label="Analytics period"
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3 text-xs font-semibold"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadAuthenticatedFile('/api/admin/reports/sales-csv', 'novara-sales-report.csv');
                    } catch (err) {
                      dispatch(
                        showToast({
                          variant: 'error',
                          message: err instanceof Error ? err.message : 'Unable to export sales CSV.',
                        }),
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                >
                  <Download className="h-3.5 w-3.5" /> Export Sales CSV
                </button>
              </div>
            }
          />

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { to: '/admin/analytics/sales', key: 'sales', label: 'Sales Analytics' },
                { to: '/admin/analytics/revenue', key: 'revenue', label: 'Revenue Analytics' },
                { to: '/admin/analytics/products', key: 'products', label: 'Product Performance' },
                { to: '/admin/analytics/customers', key: 'customers', label: 'Customer Analytics' },
                { to: '/admin/analytics/inventory', key: 'inventory', label: 'Inventory Reports' },
              ] as const
            ).map((t) => (
              <Link
                key={t.key}
                to={t.to}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  metric === t.key
                    ? 'bg-[#145CFF] text-white'
                    : 'border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] text-[#64748B] dark:text-slate-300'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={3} />
          ) : data ? (
            <div className="space-y-5">
              {(metric === 'sales' || metric === 'revenue') && (
                <div className="grid gap-5 lg:grid-cols-3">
                  <div className="lg:col-span-2 rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs">
                    <h3 className="font-display text-sm font-bold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-[#145CFF]" /> Daily Revenue Trend ({days}d)
                    </h3>
                    <SalesOverviewChart series={series} />
                  </div>
                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs">
                    <h3 className="font-display text-sm font-bold mb-3">Payment Channel Mix</h3>
                    <OrderStatusDonutChart
                      totalOrders={data.ordersByPayment.reduce((s, p) => s + p.count, 0)}
                      segments={data.ordersByPayment.map((p, idx) => ({
                        key: p._id || 'other',
                        label: (p._id || 'Other').toUpperCase(),
                        count: p.count,
                        percent: Number(((p.count / paymentTotal) * 100).toFixed(1)),
                        color: paymentColors[idx % paymentColors.length],
                      }))}
                    />
                  </div>
                </div>
              )}

              {metric === 'sales' && (
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <h3 className="font-display text-sm font-bold">Revenue by Bangladesh Division</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E4EAF5] dark:border-slate-800 text-[#64748B]">
                        <tr>
                          <th className="py-2 pr-3">Division</th>
                          <th className="py-2 pr-3 text-center">Orders</th>
                          <th className="py-2 text-right">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.ordersByDivision.map((d) => (
                          <tr key={d._id || 'unknown'}>
                            <td className="py-2.5 pr-3 font-semibold">{d._id || 'Unspecified'}</td>
                            <td className="py-2.5 pr-3 text-center font-mono-tabular">{d.count}</td>
                            <td className="py-2.5 text-right font-mono-tabular font-bold">
                              ৳{d.total.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {metric === 'products' && (
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <h3 className="font-display text-sm font-bold">Top Performing Products</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E4EAF5] dark:border-slate-800 text-[#64748B]">
                        <tr>
                          <th className="py-2 pr-3">Product & SKU</th>
                          <th className="py-2 pr-3 text-center">Units Sold</th>
                          <th className="py-2 pr-3 text-center">Available Stock</th>
                          <th className="py-2 pr-3 text-center">Rating</th>
                          <th className="py-2 text-right">Est. Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.topProducts.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2.5 pr-3">
                              <Link to={`/admin/products/${p.id}`} className="font-semibold text-[#145CFF] hover:underline">
                                {p.name}
                              </Link>
                              <div className="font-mono-tabular text-[11px] text-[#64748B]">{p.sku}</div>
                            </td>
                            <td className="py-2.5 pr-3 text-center font-mono-tabular font-semibold">{p.soldCount}</td>
                            <td className="py-2.5 pr-3 text-center font-mono-tabular">{p.availableStock}</td>
                            <td className="py-2.5 pr-3 text-center font-mono-tabular">{p.ratingAverage.toFixed(1)}</td>
                            <td className="py-2.5 text-right font-mono-tabular font-bold">
                              ৳{p.revenueEstimate.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {data.wishlistSummary && (
                    <div className="mt-5 border-t border-[#E4EAF5] dark:border-slate-800 pt-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-display text-sm font-bold text-[#101B35] dark:text-white">
                          Top Wishlisted Products
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-[#64748B]">
                          <span>
                            Active Wishlists:{' '}
                            <strong className="font-mono-tabular text-[#101B35] dark:text-white">
                              {data.wishlistSummary.totalActiveWishlists}
                            </strong>
                          </span>
                          <span>
                            Saved Items:{' '}
                            <strong className="font-mono-tabular text-[#145CFF]">
                              {data.wishlistSummary.totalSavedItems}
                            </strong>
                          </span>
                        </div>
                      </div>
                      {data.wishlistSummary.topWishlistedProducts.length === 0 ? (
                        <p className="text-xs text-[#64748B]">No saved wishlist items recorded yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-[#E4EAF5] dark:border-slate-800 text-[#64748B]">
                              <tr>
                                <th className="py-2 pr-3">Product &amp; SKU</th>
                                <th className="py-2 pr-3 text-center">Saved Count</th>
                                <th className="py-2 pr-3 text-center">Available Stock</th>
                                <th className="py-2 text-right">Current Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {data.wishlistSummary.topWishlistedProducts.map((w) => (
                                <tr key={w.id}>
                                  <td className="py-2.5 pr-3">
                                    <Link to={`/admin/products/${w.id}`} className="font-semibold text-[#145CFF] hover:underline">
                                      {w.name}
                                    </Link>
                                    <div className="font-mono-tabular text-[11px] text-[#64748B]">{w.sku}</div>
                                  </td>
                                  <td className="py-2.5 pr-3 text-center font-mono-tabular font-bold text-rose-600">
                                    {w.wishlistCount}
                                  </td>
                                  <td className="py-2.5 pr-3 text-center font-mono-tabular">{w.availableStock}</td>
                                  <td className="py-2.5 text-right font-mono-tabular font-bold">
                                    ৳{w.price.toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {metric === 'customers' && (
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <h3 className="font-display text-sm font-bold">Top Customers by Lifetime Value</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E4EAF5] dark:border-slate-800 text-[#64748B]">
                        <tr>
                          <th className="py-2 pr-3">Customer</th>
                          <th className="py-2 pr-3 text-center">Orders</th>
                          <th className="py-2 text-right">Total Spent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.topCustomers.map((c, idx) => (
                          <tr key={c._id || idx}>
                            <td className="py-2.5 pr-3">
                              <div className="font-semibold">{c.customerName}</div>
                              <div className="text-[11px] text-[#64748B]">{c.customerEmail}</div>
                            </td>
                            <td className="py-2.5 pr-3 text-center font-mono-tabular">{c.orderCount}</td>
                            <td className="py-2.5 text-right font-mono-tabular font-bold">
                              ৳{c.totalSpent.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {metric === 'inventory' && (
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <h3 className="font-display text-sm font-bold">Inventory Valuation Summary</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {data.inventorySummary.map((row) => (
                      <div key={row._id} className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/60 p-4">
                        <div className="text-xs font-semibold uppercase text-[#64748B]">{row._id} SKUs</div>
                        <div className="font-mono-tabular mt-1 text-xl font-bold text-[#101B35] dark:text-white">
                          ৳{row.stockValue.toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-xs text-[#64748B]">
                          {row.count} products · {row.totalUnits.toLocaleString('en-IN')} total units
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
