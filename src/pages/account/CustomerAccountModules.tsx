import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Copy,
  Heart,
  Lock,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  TicketPercent,
  Wallet,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logoutUser, openAuthModal } from '../../features/auth/authSlice';
import { showToast } from '../../features/notifications/toastSlice';
import { selectWishlistCount } from '../../features/wishlist/wishlistSlice';
import { AccountLayout, type AccountNavKey } from '../../components/account/AccountLayout';
import { apiRequest } from '../../services/api';
import { formatStoreCurrency } from '../../lib/dateTime';
import { useSeoMeta } from '../../lib/useSeoMeta';
import type {
  CouponItem,
  OrderRecord,
  SavedAddress,
  WalletTransactionItem,
} from '../../types/commerce';

interface AccountDashboardResponse {
  summary: {
    totalOrders: number;
    activeOrders: number;
    deliveredOrders: number;
    wishlistCount: number;
    reviewCount: number;
    addressCount: number;
    activeCouponsCount: number;
    walletBalance: number;
    walletTransactionsCount: number;
    totalSpent: number;
  };
  recentOrders: OrderRecord[];
}

interface AccountReviewItem {
  id: string;
  rating: number;
  title: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  isVerifiedPurchase: boolean;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
  } | null;
}

function CustomerAuthRequired({
  activeKey,
  title,
  subtitle,
}: {
  activeKey: AccountNavKey;
  title: string;
  subtitle: string;
}) {
  const dispatch = useAppDispatch();
  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey={activeKey}>
        <div className="rounded-2xl border border-[#DCE6F7] bg-white p-10 text-center shadow-xs">
          <Lock className="mx-auto h-12 w-12 text-[#1155EE]" />
          <h1 className="font-display mt-4 text-2xl font-extrabold text-[#0B1730]">{title}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => dispatch(openAuthModal({ tab: 'login', returnUrl: window.location.pathname }))}
              className="rounded-full bg-[#1155EE] px-7 py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC]"
            >
              Sign In
            </button>
            <Link
              to="/register"
              className="rounded-full border border-[#C7DAFF] bg-[#F2F7FF] px-7 py-2.5 text-sm font-semibold text-[#1155EE] hover:bg-[#E5EFFF]"
            >
              Create Account
            </Link>
          </div>
        </div>
      </AccountLayout>
    </div>
  );
}

export function AccountDashboardPage() {
  useSeoMeta({ title: 'My Dashboard | NOVARA COMMERCE', noIndex: true });
  const { user } = useAppSelector((s) => s.auth);
  const currencyCfg = useAppSelector((s) => s.storefront.settings?.currencySettings);
  const wishlistCount = useAppSelector(selectWishlistCount);
  const [data, setData] = useState<AccountDashboardResponse | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<SavedAddress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      apiRequest<{ ok: true } & AccountDashboardResponse>('/api/account/dashboard'),
      apiRequest<{ ok: true; addresses: SavedAddress[] }>('/api/account/addresses').catch(() => null),
    ])
      .then(([dashRes, addrRes]) => {
        setData(dashRes);
        const addrs = addrRes?.addresses || [];
        setDefaultAddress(addrs.find((a) => a.isDefault) || addrs[0] || null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <CustomerAuthRequired
        activeKey="dashboard"
        title="My Account Dashboard"
        subtitle="Sign in to view your recent orders, wallet balance, saved addresses, and personalized activity."
      />
    );
  }

  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey="dashboard">
        <div className="space-y-5">
          {/* Welcome Banner */}
          <div className="rounded-2xl border border-[#DCE6F7] bg-gradient-to-r from-[#EEF4FF] via-white to-[#DCE9FF] p-6 shadow-xs">
            <h1 className="font-display text-2xl font-extrabold text-[#0B1730]">
              Welcome back, {user.name.split(' ')[0]}!
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage your orders, wishlist favorites, wallet balance, coupons, and account security in one place.
            </p>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: 'Total Orders',
                value: loading ? '...' : (data?.summary.totalOrders ?? 0).toLocaleString(),
                to: '/account/orders',
                icon: ClipboardList,
                tone: 'bg-blue-50 text-[#1155EE]',
              },
              {
                label: 'Saved Wishlist',
                value: wishlistCount.toLocaleString(),
                to: '/wishlist',
                icon: Heart,
                tone: 'bg-rose-50 text-rose-500',
              },
              {
                label: 'Wallet Balance',
                value: loading ? '...' : formatStoreCurrency(data?.summary.walletBalance ?? user.walletBalance ?? 0, currencyCfg),
                to: '/account/wallet',
                icon: Wallet,
                tone: 'bg-emerald-50 text-emerald-600',
              },
              {
                label: 'Active Coupons',
                value: loading ? '...' : (data?.summary.activeCouponsCount ?? 0).toLocaleString(),
                to: '/account/coupons',
                icon: TicketPercent,
                tone: 'bg-amber-50 text-amber-600',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  to={card.to}
                  className="rounded-2xl border border-[#DCE6F7] bg-white p-4 shadow-xs transition hover:border-[#1155EE]/50 hover:shadow-sm"
                >
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="font-mono-tabular mt-3 text-xl font-extrabold text-[#0B1730]">
                    {card.value}
                  </div>
                  <div className="text-xs font-medium text-slate-500">{card.label}</div>
                </Link>
              );
            })}
          </div>

          {/* Recent Orders & Default Address */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8 rounded-2xl border border-[#DCE6F7] bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#0B1730]">Recent Orders</h2>
                <Link to="/account/orders" className="text-xs font-semibold text-[#1155EE] hover:underline">
                  View All →
                </Link>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : !data?.recentOrders.length ? (
                <div className="py-8 text-center">
                  <Package className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">You have not placed any orders yet.</p>
                  <Link
                    to="/shop"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#1155EE] px-5 py-2 text-xs font-semibold text-white"
                  >
                    Start Shopping <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.recentOrders.map((ord) => {
                    const itemCount = (ord.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
                    return (
                      <div key={ord.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                        <div>
                          <Link to={`/account/orders/${ord.id}`} className="font-mono-tabular font-bold text-[#1155EE] hover:underline">
                            #{ord.orderNumber}
                          </Link>
                          <div className="text-slate-500">
                            {new Date(ord.createdAt).toLocaleDateString()} · {itemCount} item{itemCount === 1 ? '' : 's'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-md bg-[#EEF4FF] px-2.5 py-1 font-semibold uppercase text-[#1155EE]">
                            {ord.orderStatus.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono-tabular font-bold text-[#0B1730]">
                            {formatStoreCurrency(ord.total, currencyCfg)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-4 rounded-2xl border border-[#DCE6F7] bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#0B1730]">Default Address</h2>
                <Link to="/account/addresses" className="text-xs font-semibold text-[#1155EE] hover:underline">
                  Manage
                </Link>
              </div>
              {defaultAddress ? (
                <div className="rounded-xl border border-[#EBF1FC] bg-[#F8FAFF] p-3.5 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#0B1730]">
                    <MapPin className="h-3.5 w-3.5 text-[#1155EE]" />
                    <span>{defaultAddress.label}</span>
                  </div>
                  <p className="font-semibold text-slate-700">{defaultAddress.recipientName}</p>
                  <p className="text-slate-500">{defaultAddress.phone}</p>
                  <p className="text-slate-500">
                    {defaultAddress.house}, {defaultAddress.area}, {defaultAddress.upazila},{' '}
                    {defaultAddress.district}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No default shipping address saved yet.</p>
              )}
            </div>
          </div>
        </div>
      </AccountLayout>
    </div>
  );
}

export function MyReviewsPage() {
  useSeoMeta({ title: 'My Reviews | NOVARA COMMERCE', noIndex: true });
  const { user } = useAppSelector((s) => s.auth);
  const [reviews, setReviews] = useState<AccountReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiRequest<{ ok: true; reviews: AccountReviewItem[] }>('/api/account/reviews')
      .then((res) => setReviews(res.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <CustomerAuthRequired
        activeKey="reviews"
        title="My Product Reviews"
        subtitle="Sign in to view all product ratings and reviews you have submitted."
      />
    );
  }

  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey="reviews">
        <div className="rounded-2xl border border-[#DCE6F7] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="font-display text-xl font-extrabold text-[#0B1730]">My Reviews</h1>
              <p className="text-xs text-slate-500">Product reviews you have posted after verified deliveries.</p>
            </div>
            <Link to="/account/orders" className="text-xs font-semibold text-[#1155EE] hover:underline">
              Review an Order →
            </Link>
          </div>

          {loading ? (
            <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center">
              <Star className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 font-display text-base font-bold text-[#0B1730]">No reviews submitted yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Once your order is delivered, visit the product page to leave a verified review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="rounded-xl border border-[#E6EEF9] bg-[#FBFCFF] p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {rev.product?.slug ? (
                        <Link to={`/product/${rev.product.slug}`} className="text-sm font-bold text-[#0B1730] hover:text-[#1155EE]">
                          {rev.product.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-bold text-[#0B1730]">{rev.title}</span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          rev.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : rev.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {rev.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    ))}
                    <span className="ml-1 text-xs font-bold text-[#0B1730]">{rev.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </AccountLayout>
    </div>
  );
}

export function MyCouponsPage() {
  useSeoMeta({ title: 'My Coupons | NOVARA COMMERCE', noIndex: true });
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const currencyCfg = useAppSelector((s) => s.storefront.settings?.currencySettings);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiRequest<{ ok: true; coupons: CouponItem[] }>('/api/account/coupons')
      .then((res) => setCoupons(res.coupons || []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <CustomerAuthRequired
        activeKey="coupons"
        title="My Coupons & Offers"
        subtitle="Sign in to view available promo codes and personalized discount coupons."
      />
    );
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      dispatch(showToast({ variant: 'success', message: `Coupon code "${code}" copied!` }));
    } catch {
      dispatch(showToast({ variant: 'info', message: `Use code ${code} in your cart.` }));
    }
  };

  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey="coupons">
        <div className="rounded-2xl border border-[#DCE6F7] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="font-display text-xl font-extrabold text-[#0B1730]">My Coupons</h1>
              <p className="text-xs text-slate-500">Active promo codes ready to apply at checkout.</p>
            </div>
            <Link to="/cart" className="text-xs font-semibold text-[#1155EE] hover:underline">
              Apply in Cart →
            </Link>
          </div>

          {loading ? (
            <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
          ) : coupons.length === 0 ? (
            <div className="py-12 text-center">
              <TicketPercent className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 font-display text-base font-bold text-[#0B1730]">No active coupons right now</p>
              <Link to="/offers" className="mt-3 inline-block text-xs font-semibold text-[#1155EE] hover:underline">
                Browse Current Offers →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {coupons.map((cp) => (
                <div
                  key={cp.id}
                  className="flex flex-col justify-between rounded-2xl border border-dashed border-[#A9C6FA] bg-[#F7FAFF] p-4 space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular rounded-lg bg-[#1155EE] px-3 py-1 text-xs font-bold text-white">
                        {cp.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyCode(cp.code)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#DCE6F7] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0B1730] hover:text-[#1155EE]"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#0B1730]">
                      {cp.discountType === 'percentage'
                        ? `${cp.discountValue}% OFF`
                        : `${formatStoreCurrency(cp.discountValue, currencyCfg)} OFF`}
                    </p>
                    {cp.description && <p className="mt-0.5 text-xs text-slate-600">{cp.description}</p>}
                  </div>
                  <div className="flex items-center justify-between border-t border-[#DCE6F7] pt-2 text-[11px] text-slate-500">
                    <span>
                      Min order: {formatStoreCurrency(cp.minOrderAmount || 0, currencyCfg)}
                    </span>
                    {cp.endsAt && <span>Ends {new Date(cp.endsAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AccountLayout>
    </div>
  );
}

export function MyWalletPage() {
  useSeoMeta({ title: 'My Wallet | NOVARA COMMERCE', noIndex: true });
  const { user } = useAppSelector((s) => s.auth);
  const currencyCfg = useAppSelector((s) => s.storefront.settings?.currencySettings);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiRequest<{ ok: true; balance: number; transactions: WalletTransactionItem[] }>('/api/account/wallet')
      .then((res) => {
        setBalance(res.balance || 0);
        setTransactions(res.transactions || []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <CustomerAuthRequired
        activeKey="wallet"
        title="My NOVARA Wallet"
        subtitle="Sign in to view your store credit balance, cashback rewards, and refund history."
      />
    );
  }

  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey="wallet">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#DCE6F7] bg-gradient-to-r from-[#0B1730] to-[#1155EE] p-6 text-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                  Available Wallet Balance
                </p>
                <p className="font-mono-tabular mt-1 text-3xl font-extrabold">
                  {loading ? '...' : formatStoreCurrency(balance, currencyCfg)}
                </p>
              </div>
              <Wallet className="h-10 w-10 text-blue-200/80" />
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCE6F7] bg-white p-6 shadow-xs">
            <h2 className="font-display mb-4 text-base font-bold text-[#0B1730]">Transaction Ledger</h2>
            {loading ? (
              <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No wallet transactions yet. Refunds or loyalty credits will appear here automatically.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Description</th>
                      <th className="py-2 pr-3">Source</th>
                      <th className="py-2 pr-3 text-right">Amount</th>
                      <th className="py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-2.5 pr-3 text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5 pr-3 font-medium text-[#0B1730]">{tx.description}</td>
                        <td className="py-2.5 pr-3 uppercase text-slate-500">{tx.referenceId || tx.type}</td>
                        <td
                          className={`py-2.5 pr-3 text-right font-mono-tabular font-bold ${
                            tx.type === 'credit' || tx.type === 'refund' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {tx.type === 'credit' || tx.type === 'refund' ? '+' : '-'}
                          {formatStoreCurrency(tx.amount, currencyCfg)}
                        </td>
                        <td className="py-2.5 text-right font-mono-tabular">
                          {formatStoreCurrency(tx.balanceAfter, currencyCfg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AccountLayout>
    </div>
  );
}

export function AccountSecurityPage() {
  useSeoMeta({ title: 'Account Security | NOVARA COMMERCE', noIndex: true });
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <CustomerAuthRequired
        activeKey="security"
        title="Security & Password"
        subtitle="Sign in to manage your password and account security settings."
      />
    );
  }

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest<{ ok: true; message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      dispatch(showToast({ variant: 'success', message: res.message }));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Password update failed' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#F4F7FF] py-7 sm:py-9 min-h-[70vh]">
      <AccountLayout activeKey="security">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <form onSubmit={handlePasswordChange} className="rounded-2xl border border-[#DCE6F7] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#1155EE]" />
              <h1 className="font-display text-lg font-bold text-[#0B1730]">Change Password</h1>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                New Password (8+ chars, upper, lower, number)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#1155EE] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC] disabled:opacity-60"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="rounded-2xl border border-[#DCE6F7] bg-white p-6 shadow-xs space-y-4 self-start">
            <h2 className="font-display text-base font-bold text-[#0B1730]">Account Verification &amp; Session</h2>
            <div className="rounded-xl border border-[#EBF1FC] bg-[#F8FAFF] p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Email Verification</span>
                {user.isVerified ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  <span className="font-semibold text-amber-700">Unverified</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Account Email</span>
                <span className="font-semibold text-[#0B1730]">{user.email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dispatch(logoutUser())}
              className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              Sign Out of Current Session
            </button>
          </div>
        </div>
      </AccountLayout>
    </div>
  );
}
