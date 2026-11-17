import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Headphones,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Settings,
  ShieldCheck,
  Star,
  TicketPercent,
  Wallet,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logoutUser, openAuthModal } from '../../features/auth/authSlice';
import { selectWishlistCount } from '../../features/wishlist/wishlistSlice';
import { showToast } from '../../features/notifications/toastSlice';
import { ResilientImage } from '../ui/ResilientImage';

export type AccountNavKey =
  | 'dashboard'
  | 'orders'
  | 'wishlist'
  | 'reviews'
  | 'coupons'
  | 'wallet'
  | 'addresses'
  | 'settings'
  | 'security';

interface AccountLayoutProps {
  activeKey?: AccountNavKey;
  children: ReactNode;
}

const ACCOUNT_NAV_ITEMS: Array<{
  key: AccountNavKey;
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}> = [
  { key: 'dashboard', label: 'Dashboard', to: '/account/dashboard', icon: LayoutDashboard },
  { key: 'orders', label: 'My Orders', to: '/account/orders', icon: ClipboardList },
  { key: 'wishlist', label: 'My Wishlist', to: '/wishlist', icon: Heart },
  { key: 'reviews', label: 'My Reviews', to: '/account/reviews', icon: Star },
  { key: 'coupons', label: 'My Coupons', to: '/account/coupons', icon: TicketPercent },
  { key: 'wallet', label: 'My Wallet', to: '/account/wallet', icon: Wallet },
  { key: 'addresses', label: 'Address Book', to: '/account/addresses', icon: MapPin },
  { key: 'settings', label: 'Account Settings', to: '/account', icon: Settings },
  { key: 'security', label: 'Security', to: '/account/security', icon: ShieldCheck },
];

function getInitials(name?: string): string {
  if (!name) return 'N';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function AccountLayout({ activeKey, children }: AccountLayoutProps) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { user } = useAppSelector((s) => s.auth);
  const wishlistCount = useAppSelector(selectWishlistCount);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const resolvedActive: AccountNavKey =
    activeKey ||
    (location.pathname.startsWith('/wishlist')
      ? 'wishlist'
      : location.pathname.startsWith('/account/orders')
        ? 'orders'
        : location.pathname.startsWith('/account/reviews')
          ? 'reviews'
          : location.pathname.startsWith('/account/coupons')
            ? 'coupons'
            : location.pathname.startsWith('/account/wallet')
              ? 'wallet'
              : location.pathname.startsWith('/account/addresses')
                ? 'addresses'
                : location.pathname.startsWith('/account/security')
                  ? 'security'
                  : location.pathname.startsWith('/account/dashboard')
                    ? 'dashboard'
                    : 'settings');

  const handleLogout = async () => {
    await dispatch(logoutUser());
    dispatch(showToast({ variant: 'info', message: 'You have been signed out.' }));
  };

  const renderSidebarCards = (compactMobile = false) => (
    <div className="space-y-5">
      {/* Main Account Card */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE6F7] bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-[#EBF1FC] bg-[#F7FAFF] px-5 py-3.5">
          <span className="font-display text-base font-extrabold text-[#0B1730]">My Account</span>
          {compactMobile && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close account navigation"
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Profile Avatar & Verification Block */}
        <div className="flex flex-col items-center border-b border-[#EBF1FC] px-5 py-5 text-center">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#DCE9FF] bg-[#EDF4FF] shadow-xs">
            {user?.avatarUrl ? (
              <ResilientImage src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1155EE] to-[#3B82F6] font-display text-xl font-extrabold text-white">
                {getInitials(user?.name || 'Guest User')}
              </div>
            )}
          </div>

          <h2 className="font-display mt-3 text-base font-bold text-[#0B1730]">
            {user?.name || 'Guest Shopper'}
          </h2>
          <p className="mt-0.5 max-w-full truncate text-xs text-slate-500">
            {user?.email || 'Sign in to sync across devices'}
          </p>

          {user ? (
            user.isVerified ? (
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3 w-3 fill-emerald-600 text-white" />
                Verified
              </span>
            ) : (
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-[11px] font-semibold text-amber-700">
                Pending Verification
              </span>
            )
          ) : (
            <button
              type="button"
              onClick={() => dispatch(openAuthModal({ tab: 'login', returnUrl: location.pathname }))}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#EEF4FF] px-3.5 py-1 text-[11px] font-bold text-[#1155EE] hover:bg-[#DCE9FF]"
            >
              <LogIn className="h-3 w-3" /> Sign In / Sync
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav aria-label="Customer account navigation" className="py-1.5">
          {ACCOUNT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = resolvedActive === item.key;
            const isWishlist = item.key === 'wishlist';

            return (
              <Link
                key={item.key}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between border-l-[3px] px-4 py-2.5 text-[13.5px] transition-colors ${
                  isActive
                    ? 'border-l-[#1155EE] bg-[#EEF4FF] font-bold text-[#1155EE]'
                    : 'border-l-transparent font-medium text-[#24324D] hover:bg-[#F7FAFF] hover:text-[#1155EE]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? isWishlist
                          ? 'fill-[#1155EE] text-[#1155EE]'
                          : 'text-[#1155EE]'
                        : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {isWishlist && wishlistCount > 0 && (
                  <span className="font-mono-tabular flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1155EE] px-1.5 text-[11px] font-bold text-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="mt-1 border-t border-[#EBF1FC] pt-1">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 border-l-[3px] border-l-transparent px-4 py-2.5 text-left text-[13.5px] font-medium text-[#24324D] transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4 shrink-0 text-slate-500" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => dispatch(openAuthModal({ tab: 'login', returnUrl: location.pathname }))}
                className="flex w-full items-center gap-3 border-l-[3px] border-l-transparent px-4 py-2.5 text-left text-[13.5px] font-semibold text-[#1155EE] transition-colors hover:bg-[#F7FAFF]"
              >
                <LogIn className="h-4 w-4 shrink-0" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Need Help? Support Card matching Reference */}
      <div className="rounded-2xl border border-[#DCE6F7] bg-gradient-to-br from-[#F2F7FF] via-white to-[#EAF2FF] p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1155EE] shadow-xs ring-4 ring-[#DCE9FF]/70">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-extrabold text-[#0B1730]">Need Help?</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Our support team is ready to assist you.
            </p>
          </div>
        </div>
        <Link
          to="/contact"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1155EE] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0B44CC]"
        >
          <span>Contact Support</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );

  const activeNavObj = ACCOUNT_NAV_ITEMS.find((i) => i.key === resolvedActive) || ACCOUNT_NAV_ITEMS[2];

  return (
    <div className="mx-auto max-w-[1380px] px-4">
      {/* Compact Mobile Account Bar */}
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#DCE6F7] bg-white px-4 py-3 shadow-xs lg:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1155EE] shrink-0">
            <activeNavObj.icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">My Account</p>
            <p className="truncate text-sm font-bold text-[#0B1730]">{activeNavObj.label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6F7] bg-[#F7FAFF] px-3 py-1.5 text-xs font-semibold text-[#1155EE]"
        >
          <Menu className="h-3.5 w-3.5" />
          <span>Menu</span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mb-5 lg:hidden">{renderSidebarCards(true)}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <aside className="hidden lg:block lg:col-span-3 sticky top-24">
          {renderSidebarCards(false)}
        </aside>
        <div className="lg:col-span-9 min-w-0">{children}</div>
      </div>
    </div>
  );
}
