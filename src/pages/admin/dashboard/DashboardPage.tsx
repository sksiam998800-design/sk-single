import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CreditCard,
  Eye,
  FileText,
  FolderTree,
  Heart,
  ImagePlus,
  Layout,
  Mail,
  MessageSquare,
  MoreVertical,
  Navigation,
  Package,
  PackagePlus,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tag,
  TicketPercent,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { AdminLayout } from '../../../layouts/AdminLayout';
import { apiRequest } from '../../../services/api';
import { useAppSelector } from '../../../app/hooks';
import { isStaffRole } from '../../../lib/rbac';
import { useAdminContext } from '../../../components/admin/AdminContext';
import {
  KpiSparkline,
  OrderStatusDonutChart,
  RevenueOverviewChart,
  SalesOverviewChart,
} from '../../../components/admin/AdminCharts';
import { ResilientImage } from '../../../components/ui/ResilientImage';
import { useSeoMeta } from '../../../lib/useSeoMeta';

interface OverviewPayload {
  periodDays: number;
  userStats?: {
    totalUsers: number;
    totalCustomers: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    activeUsers: number;
    disabledUsers: number;
  };
  metrics: {
    grossSales: number;
    netSales: number;
    orderCount: number;
    totalOrdersAllTime: number;
    ordersTrendPct: number;
    totalCustomers: number;
    customersTrendPct: number;
    revenueTrendPct: number;
    activeProducts: number;
    visitors30d: number;
    visitorsTrendPct: number;
    pendingReviews: number;
    totalReviews: number;
    activeOrderCount: number;
    avgOrderValue: number;
    pendingOrders: number;
    lowStockCount: number;
    outOfStockCount: number;
    cancelledCount: number;
    returnedCount: number;
    paidTotal: number;
    codPendingTotal: number;
    openEnquiriesCount: number;
  };
  sparklines: {
    orders: number[];
    customers: number[];
    revenue: number[];
    products: number[];
    visitors: number[];
    reviews: number[];
  };
  salesSeries: Array<{ date: string; label: string; revenue: number; orders: number }>;
  orderStatusBreakdown: {
    totalOrders: number;
    segments: Array<{ key: string; label: string; count: number; percent: number; color: string }>;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  revenueOverview: {
    total: number;
    trendPct: number;
    range: string;
    series: Array<{ label: string; revenue: number; orders: number }>;
  };
  topProducts: Array<{
    id: string;
    name: string;
    slug: string;
    sku: string;
    soldCount: number;
    availableStock: number;
    price: number;
    imageUrl: string;
  }>;
  footerSummary: {
    contactInfo: {
      facebookUrl?: string;
      youtubeUrl?: string;
      xUrl?: string;
      linkedinUrl?: string;
      instagramUrl?: string;
      tiktokUrl?: string;
    };
    copyrightText: string;
    storeStatus: 'live' | 'maintenance';
  };
}

const STATUS_BADGE_MAP: Record<string, string> = {
  delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  confirmed: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  processing: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  packed: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  shipped: 'bg-blue-50 text-[#145CFF] dark:bg-blue-950/50 dark:text-blue-300',
  cancelled: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
  returned: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  return_requested: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
};

const MANAGEMENT_SHORTCUTS = [
  { title: 'Product Management', sub: 'Manage Products', to: '/admin/products', icon: Package, bg: 'bg-blue-50 dark:bg-blue-950/50 text-[#145CFF]' },
  { title: 'Category Management', sub: 'Manage Categories', to: '/admin/categories', icon: FolderTree, bg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-600' },
  { title: 'Brand Management', sub: 'Manage Brands', to: '/admin/brands', icon: Tag, bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600' },
  { title: 'Coupon Management', sub: 'Create Coupons', to: '/admin/coupons', icon: TicketPercent, bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600' },
  { title: 'Banner Management', sub: 'Manage Banners', to: '/admin/banners', icon: ImagePlus, bg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600' },
  { title: 'Navigation Management', sub: 'Edit Navigation', to: '/admin/navigation', icon: Navigation, bg: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600' },
  { title: 'Payment Settings', sub: 'Configure Payments', to: '/admin/payments/methods', icon: CreditCard, bg: 'bg-blue-50 dark:bg-blue-950/50 text-[#145CFF]' },
  { title: 'Email Settings', sub: 'Manage Emails', to: '/admin/settings/email', icon: Mail, bg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-600' },
  { title: 'Social Links', sub: 'Update Social Media', to: '/admin/settings/social-links', icon: Share2, bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600' },
  { title: 'Footer Settings', sub: 'Manage Footer', to: '/admin/settings/footer', icon: Layout, bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600' },
  { title: 'Audit Logs', sub: 'View Activity Logs', to: '/admin/audit-logs', icon: FileText, bg: 'bg-violet-50 dark:bg-violet-950/50 text-violet-600' },
  { title: 'System Settings', sub: 'General Configuration', to: '/admin/settings/general', icon: Settings, bg: 'bg-blue-50 dark:bg-blue-950/50 text-[#145CFF]' },
];

export function DashboardPage() {
  useSeoMeta({ title: 'Admin Dashboard | NOVARA COMMERCE', noIndex: true });
  const { user } = useAppSelector((s) => s.auth);
  const { t } = useAdminContext();

  const [days, setDays] = useState(30);
  const [revRange, setRevRange] = useState<'week' | 'month' | 'year'>('month');
  const [heroDot, setHeroDot] = useState(0);
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [wishlistInsights, setWishlistInsights] = useState<{
    totalActiveWishlists: number;
    totalSavedItems: number;
    topWishlistedProducts: Array<{
      id: string;
      name: string;
      wishlistCount: number;
      price: number;
      imageUrl: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(
    (silent = false) => {
      if (!user || !isStaffRole(user.role)) {
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      Promise.all([
        apiRequest<{ ok: true } & OverviewPayload>(`/api/admin/overview?days=${days}&revRange=${revRange}`),
        apiRequest<{
          ok: true;
          totalActiveWishlists: number;
          totalSavedItems: number;
          topWishlistedProducts: Array<{
            id: string;
            name: string;
            wishlistCount: number;
            price: number;
            imageUrl: string;
          }>;
        }>('/api/admin/analytics/wishlist').catch(() => null),
      ])
        .then(([overviewRes, wlRes]) => {
          setData(overviewRes);
          if (wlRes?.ok) {
            setWishlistInsights({
              totalActiveWishlists: wlRes.totalActiveWishlists || 0,
              totalSavedItems: wlRes.totalSavedItems || 0,
              topWishlistedProducts: wlRes.topWishlistedProducts || [],
            });
          }
        })
        .catch((err) => {
          if (!silent) {
            setError(err instanceof Error ? err.message : 'Unable to load dashboard analytics');
          }
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [days, revRange, user],
  );

  useEffect(() => {
    loadOverview(false);

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadOverview(true);
      }
    }, 15000);

    const handleFocus = () => loadOverview(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadOverview]);

  const nowFormatted =
    new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }) +
    ' · ' +
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const heroAnnouncements = [
    {
      title: `${t('welcomeBack')}, ${user?.name || 'Admin'}!`,
      subtitle: t('welcomeSubtitle'),
    },
    {
      title: `${data?.metrics.pendingOrders ?? 0} Orders Ready for Fulfillment`,
      subtitle: 'Review pending & confirmed orders or assign courier tracking numbers.',
    },
    {
      title: `${data?.metrics.lowStockCount ?? 0} Low Stock SKU Alerts`,
      subtitle: 'Keep inventory balanced across Bangladesh warehouses and flagship gadgets.',
    },
  ];

  const activeHero = heroAnnouncements[heroDot] || heroAnnouncements[0];
  const topMaxSold = Math.max(1, ...(data?.topProducts.map((p) => p.soldCount) || [1]));

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-[1600px] mx-auto">
        {error && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadOverview(false)}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* ROW 1: Welcome Banner (8 cols) + Quick Actions 3x2 (4 cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          <div className="xl:col-span-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#DCE8FF] via-[#EAF1FF] to-[#D4E3FF] dark:from-[#0E2247] dark:via-[#112A56] dark:to-[#0A1D3D] border border-[#D3E0FA] dark:border-slate-700/80 p-6 sm:p-7 flex flex-col justify-between min-h-[212px]">
            <div className="relative z-10 max-w-md space-y-3">
              <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-[#071B3A] dark:text-white leading-tight">
                {activeHero.title}
              </h1>
              <p className="text-sm text-[#43567A] dark:text-blue-100/80">{activeHero.subtitle}</p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 font-mono-tabular">
                  <Calendar className="w-3.5 h-3.5" />
                  {nowFormatted}
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-end pointer-events-none absolute right-0 top-0 bottom-0 w-[44%]">
              <img
                src="/src/assets/images/hero_smart_tech_1794832024388.jpg"
                alt="NOVARA Smart Tech Showcase"
                className="h-full w-full object-cover object-center opacity-90"
                style={{
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 38%)',
                  maskImage: 'linear-gradient(to right, transparent 0%, black 38%)',
                }}
              />
            </div>

            <div className="relative z-10 flex items-center justify-center gap-1.5 pt-4">
              {heroAnnouncements.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setHeroDot(idx)}
                  aria-label={`Dashboard banner slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    heroDot === idx ? 'w-5 bg-[#145CFF]' : 'w-2 bg-[#145CFF]/30 hover:bg-[#145CFF]/60'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="xl:col-span-4 grid grid-cols-3 gap-3">
            {[
              { label: t('addProduct'), to: '/admin/products/new', icon: PackagePlus },
              { label: t('createCoupon'), to: '/admin/coupons/new', icon: TicketPercent },
              { label: t('addBanner'), to: '/admin/banners/new', icon: ImagePlus },
              { label: t('manageOrders'), to: '/admin/orders', icon: ShoppingCart },
              { label: t('viewReviews'), to: '/admin/reviews', icon: Star },
              { label: t('settings'), to: '/admin/settings/general', icon: Settings },
            ].map((qa) => {
              const Icon = qa.icon;
              return (
                <Link
                  key={qa.label}
                  to={qa.to}
                  className="rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-3.5 flex flex-col items-center justify-center text-center gap-2 hover:border-[#145CFF]/50 hover:shadow-md hover:shadow-blue-900/5 transition-all group"
                >
                  <span className="w-10 h-10 rounded-xl bg-[#EAF1FF] dark:bg-blue-950/60 text-[#145CFF] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-[12px] font-semibold text-[#101B35] dark:text-slate-200 leading-tight">
                    {qa.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ROW 2: 6 KPI Sparkline Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            {
              label: t('totalOrders'),
              value: loading ? '...' : (data?.metrics.totalOrdersAllTime ?? 0).toLocaleString(),
              trend: data?.metrics.ordersTrendPct ?? 0,
              icon: ShoppingCart,
              iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-[#145CFF]',
              stroke: '#145CFF',
              fill: '#3B82F6',
              spark: data?.sparklines.orders || [],
              id: 'orders',
            },
            {
              label: t('totalCustomers'),
              value: loading ? '...' : (data?.metrics.totalCustomers ?? 0).toLocaleString(),
              trend: data?.metrics.customersTrendPct ?? 0,
              icon: Users,
              iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600',
              stroke: '#10B981',
              fill: '#10B981',
              spark: data?.sparklines.customers || [],
              id: 'customers',
            },
            {
              label: t('totalRevenue'),
              value: loading ? '...' : `৳${(data?.metrics.netSales ?? 0).toLocaleString()}`,
              trend: data?.metrics.revenueTrendPct ?? 0,
              icon: ShoppingBag,
              iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600',
              stroke: '#6366F1',
              fill: '#818CF8',
              spark: data?.sparklines.revenue || [],
              id: 'revenue',
            },
            {
              label: t('activeProducts'),
              value: loading ? '...' : (data?.metrics.activeProducts ?? 0).toLocaleString(),
              trend: null,
              subText: `${data?.metrics.lowStockCount ?? 0} low stock`,
              icon: Package,
              iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-500',
              stroke: '#F59E0B',
              fill: '#FBBF24',
              spark: data?.sparklines.products || [],
              id: 'products',
            },
            {
              label: t('visitors30d'),
              value: loading ? '...' : (data?.metrics.visitors30d ?? 0).toLocaleString(),
              trend: data?.metrics.visitorsTrendPct ?? 0,
              icon: Eye,
              iconBg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-600',
              stroke: '#14B8A6',
              fill: '#2DD4BF',
              spark: data?.sparklines.visitors || [],
              id: 'visitors',
            },
            {
              label: t('pendingReviews'),
              value: loading ? '...' : (data?.metrics.pendingReviews ?? 0).toLocaleString(),
              trend: null,
              subText: `${data?.metrics.totalReviews ?? 0} total`,
              icon: MessageSquare,
              iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-500',
              stroke: '#EF4444',
              fill: '#F87171',
              spark: data?.sparklines.reviews || [],
              id: 'reviews',
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            const isPositive = (kpi.trend ?? 0) >= 0;
            return (
              <div
                key={kpi.id}
                className="rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 truncate">
                      {kpi.label}
                    </div>
                    <div className="font-display text-[20px] font-bold text-[#101B35] dark:text-white font-mono-tabular leading-tight mt-0.5 truncate">
                      {kpi.value}
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  {kpi.trend !== null ? (
                    <span
                      className={`text-[12px] font-semibold font-mono-tabular ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isPositive ? '↑' : '↓'} {Math.abs(kpi.trend).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-[11.5px] font-medium text-[#64748B] dark:text-slate-400">
                      {kpi.subText}
                    </span>
                  )}
                  <KpiSparkline data={kpi.spark} stroke={kpi.stroke} fill={kpi.fill} id={kpi.id} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ROW 2B: Database-Driven User Account Statistics */}
        <div className="rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#145CFF]" />
              <h2 className="font-display text-[15px] font-bold text-[#101B35] dark:text-white">
                Registered User Statistics
              </h2>
            </div>
            <Link
              to="/admin/customers"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#145CFF] hover:underline"
            >
              Manage Users <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Total Users', value: data?.userStats?.totalUsers ?? 0, tone: 'text-[#101B35] dark:text-white' },
              { label: 'New Today', value: data?.userStats?.newToday ?? 0, tone: 'text-[#145CFF]' },
              { label: 'This Week', value: data?.userStats?.newThisWeek ?? 0, tone: 'text-[#145CFF]' },
              { label: 'This Month', value: data?.userStats?.newThisMonth ?? 0, tone: 'text-[#145CFF]' },
              { label: 'Verified', value: data?.userStats?.verifiedUsers ?? 0, tone: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Unverified', value: data?.userStats?.unverifiedUsers ?? 0, tone: 'text-amber-600 dark:text-amber-400' },
              { label: 'Active', value: data?.userStats?.activeUsers ?? 0, tone: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Disabled', value: data?.userStats?.disabledUsers ?? 0, tone: 'text-rose-600 dark:text-rose-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-[#F4F7FF] dark:bg-slate-900/70 border border-[#E4EAF5] dark:border-slate-800 px-3 py-2.5"
              >
                <div className="text-[11px] font-medium text-[#64748B] dark:text-slate-400 truncate">
                  {stat.label}
                </div>
                <div className={`font-display text-lg font-bold font-mono-tabular mt-0.5 ${stat.tone}`}>
                  {loading ? '...' : stat.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 3: Sales Overview (4 cols) + Order Status Donut (3 cols) + Recent Orders Table (5 cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-4 rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#145CFF]" />
                <h2 className="font-display text-[15px] font-bold text-[#101B35] dark:text-white">
                  {t('salesOverview')}
                </h2>
              </div>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                aria-label="Sales overview date range"
                className="rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-[#101B35] dark:text-slate-200 focus:outline-none focus:border-[#145CFF]"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
            </div>
            <SalesOverviewChart series={data?.salesSeries || []} />
          </div>

          <div className="xl:col-span-3 rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-4 h-4 text-[#145CFF]" />
              <h2 className="font-display text-[15px] font-bold text-[#101B35] dark:text-white">
                {t('orderStatus')}
              </h2>
            </div>
            <div className="flex-1 flex items-center">
              <OrderStatusDonutChart
                totalOrders={data?.orderStatusBreakdown.totalOrders ?? 0}
                segments={
                  data?.orderStatusBreakdown.segments || [
                    { key: 'completed', label: 'Completed', count: 0, percent: 0, color: '#145CFF' },
                    { key: 'pending', label: 'Pending', count: 0, percent: 0, color: '#F59E0B' },
                    { key: 'cancelled', label: 'Cancelled', count: 0, percent: 0, color: '#EF4444' },
                    { key: 'refunded', label: 'Refunded', count: 0, percent: 0, color: '#CBD5E1' },
                  ]
                }
              />
            </div>
          </div>

          <div className="xl:col-span-5 rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#145CFF]" />
                <h2 className="font-display text-[15px] font-bold text-[#101B35] dark:text-white">
                  {t('recentOrders')}
                </h2>
              </div>
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#145CFF] hover:underline"
              >
                {t('viewAll')} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E4EAF5] dark:border-slate-800 text-[#64748B] dark:text-slate-400">
                    <th className="py-2 font-semibold">#</th>
                    <th className="py-2 font-semibold">Customer</th>
                    <th className="py-2 font-semibold">Amount</th>
                    <th className="py-2 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Date</th>
                    <th className="py-2 text-right font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Loading recent orders...
                      </td>
                    </tr>
                  ) : !data?.recentOrders.length ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No orders recorded yet. Orders placed on the storefront will appear here.
                      </td>
                    </tr>
                  ) : (
                    data.recentOrders.slice(0, 5).map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#F4F7FF]/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 font-mono-tabular font-semibold text-[#145CFF]">
                          <Link to={`/admin/orders/${ord.id}`} className="hover:underline">
                            #{ord.orderNumber}
                          </Link>
                        </td>
                        <td className="py-2.5 font-medium text-[#101B35] dark:text-slate-200 max-w-[120px] truncate">
                          {ord.customerName}
                        </td>
                        <td className="py-2.5 font-mono-tabular font-semibold text-[#101B35] dark:text-slate-100">
                          ৳{ord.total.toLocaleString()}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${
                              STATUS_BADGE_MAP[ord.orderStatus] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ord.orderStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 text-[#64748B] dark:text-slate-400 whitespace-nowrap font-mono-tabular">
                          {new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-2.5 text-right">
                          <Link
                            to={`/admin/orders/${ord.id}`}
                            aria-label={`Manage order ${ord.orderNumber}`}
                            className="inline-flex p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#145CFF]"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ROW 4: 2x6 Management Shortcut Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {MANAGEMENT_SHORTCUTS.map((sc) => {
            const Icon = sc.icon;
            return (
              <Link
                key={sc.title}
                to={sc.to}
                className="rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 px-3.5 py-3 flex items-center justify-between gap-2.5 hover:border-[#145CFF]/50 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sc.bg}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-bold text-[#101B35] dark:text-slate-100 truncate">
                      {sc.title}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">{sc.sub}</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#145CFF] group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            );
          })}
        </div>

        {/* ROW 5: Bottom 4-Panel Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-3 rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-[15px] font-bold text-[#101B35] dark:text-white">
                  {t('revenueOverview')}
                </h2>
                <select
                  value={revRange}
                  onChange={(e) => setRevRange(e.target.value as 'week' | 'month' | 'year')}
                  aria-label="Revenue overview period"
                  className="rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-[#101B35] dark:text-slate-200 focus:outline-none"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="font-display text-2xl font-bold text-[#101B35] dark:text-white font-mono-tabular">
                  ৳{(data?.revenueOverview.total ?? 0).toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono-tabular">
                  <TrendingUp className="w-3 h-3" />
                  {(data?.revenueOverview.trendPct ?? 0) >= 0 ? '+' : ''}
                  {(data?.revenueOverview.trendPct ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="mt-3">
              <RevenueOverviewChart series={data?.revenueOverview.series || []} />
            </div>
          </div>

          <div className="xl:col-span-3 rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-[15px] font-bold text-[#101B35] dark:text-white">
                {t('topProducts')}
              </h2>
              <Link
                to="/admin/products"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#145CFF] hover:underline"
              >
                {t('viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3 flex-1">
              {!data?.topProducts.length ? (
                <p className="py-6 text-center text-xs text-slate-500">No published products yet.</p>
              ) : (
                data.topProducts.slice(0, 4).map((prod) => {
                  const pct = Math.max(8, Math.round((prod.soldCount / topMaxSold) * 100));
                  return (
                    <Link key={prod.id} to={`/admin/products/${prod.id}`} className="flex items-center gap-3 group">
                      <div className="w-9 h-9 rounded-lg bg-[#F4F7FF] dark:bg-slate-800 border border-[#E4EAF5] dark:border-slate-700 overflow-hidden shrink-0">
                        <ResilientImage
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#101B35] dark:text-slate-100 truncate group-hover:text-[#145CFF]">
                            {prod.name}
                          </span>
                          <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono-tabular whitespace-nowrap">
                            {prod.soldCount} sold
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#145CFF] to-[#60A5FA]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="xl:col-span-3 rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-[15px] font-bold text-[#101B35] dark:text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>{t('quickStats')}</span>
              </h2>
              <Link
                to="/admin/analytics/products"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#145CFF] hover:underline"
              >
                Insights <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1">
              {[
                { label: 'Active Wishlists', value: wishlistInsights?.totalActiveWishlists ?? 0, icon: Heart, bg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-500', to: '/admin/analytics/products' },
                { label: 'Saved Items', value: wishlistInsights?.totalSavedItems ?? 0, icon: ShoppingBag, bg: 'bg-blue-50 dark:bg-blue-950/50 text-[#145CFF]', to: '/admin/wishlist-hero-slider' },
                { label: 'Orders', value: data?.metrics.totalOrdersAllTime ?? 0, icon: ShoppingCart, bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600', to: '/admin/orders' },
                { label: 'Reviews', value: data?.metrics.totalReviews ?? 0, icon: Star, bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-500', to: '/admin/reviews' },
              ].map((qs) => {
                const Icon = qs.icon;
                return (
                  <Link
                    key={qs.label}
                    to={qs.to}
                    className="rounded-xl bg-[#F4F7FF] dark:bg-slate-900/70 border border-[#E4EAF5] dark:border-slate-800 p-3 flex flex-col items-center justify-center text-center hover:border-[#145CFF]/40 transition-colors"
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 ${qs.bg}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-display text-base font-bold text-[#101B35] dark:text-white font-mono-tabular">
                      {qs.value.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#64748B] dark:text-slate-400">{qs.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="xl:col-span-3 rounded-2xl bg-white dark:bg-[#0B1730] border border-[#E4EAF5] dark:border-slate-800 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="font-display text-[15px] font-bold text-[#101B35] dark:text-white">
                  {t('footerSocial')}
                </h2>
                <Link
                  to="/admin/settings/social-links"
                  className="px-2.5 py-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 text-[11px] font-semibold text-[#145CFF] hover:bg-[#EAF1FF] dark:hover:bg-slate-800"
                >
                  {t('edit')}
                </Link>
              </div>

              <div className="grid grid-cols-6 gap-2 py-2">
                {[
                  { label: 'Facebook', url: data?.footerSummary.contactInfo.facebookUrl, bg: 'bg-[#1877F2]', glyph: 'f' },
                  { label: 'YouTube', url: data?.footerSummary.contactInfo.youtubeUrl, bg: 'bg-[#EF4444]', glyph: '▶' },
                  { label: 'X', url: data?.footerSummary.contactInfo.xUrl, bg: 'bg-[#0F172A]', glyph: '𝕏' },
                  { label: 'LinkedIn', url: data?.footerSummary.contactInfo.linkedinUrl, bg: 'bg-[#0A66C2]', glyph: 'in' },
                  { label: 'Instagram', url: data?.footerSummary.contactInfo.instagramUrl, bg: 'bg-gradient-to-tr from-[#F59E0B] via-[#EC4899] to-[#8B5CF6]', glyph: '◎' },
                  { label: 'TikTok', url: data?.footerSummary.contactInfo.tiktokUrl, bg: 'bg-[#111827]', glyph: '♪' },
                ].map((soc) => (
                  <a
                    key={soc.label}
                    href={soc.url || '/admin/settings/social-links'}
                    target={soc.url ? '_blank' : undefined}
                    rel={soc.url ? 'noreferrer' : undefined}
                    title={soc.label}
                    aria-label={soc.label}
                    className={`w-9 h-9 rounded-full ${soc.bg} text-white text-xs font-bold flex items-center justify-center shadow-sm hover:scale-105 transition-transform mx-auto`}
                  >
                    {soc.glyph}
                  </a>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#E4EAF5] dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-[#64748B] dark:text-slate-400 truncate">
                {data?.footerSummary.copyrightText || '© 2026 NOVARA. All Rights Reserved.'}
              </span>
              <Link
                to="/admin/system-health"
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold shrink-0 ${
                  data?.footerSummary.storeStatus === 'maintenance'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                {data?.footerSummary.storeStatus === 'maintenance' ? t('maintenance') : t('liveStore')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
