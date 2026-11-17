import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Database,
  ExternalLink,
  Globe,
  LogOut,
  Menu,
  Moon,
  Package,
  Search,
  ShoppingCart,
  Sun,
  User,
} from 'lucide-react';
import type { UserProfile } from '../../types/commerce';
import { apiRequest } from '../../services/api';
import { useAppDispatch } from '../../app/hooks';
import { logoutUser } from '../../features/auth/authSlice';
import { useAdminContext } from './AdminContext';

interface SearchResultsPayload {
  products: Array<{ id: string; name: string; sku: string; status: string; price: number }>;
  orders: Array<{ id: string; orderNumber: string; customerName: string; total: number; status: string }>;
  customers: Array<{ id: string; name: string; email: string; phone: string; status: string }>;
}

export const AdminTopbar: React.FC<{ user: UserProfile }> = ({ user }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { theme, toggleTheme, lang, toggleLang, t, setMobileSidebarOpen, notifications, unreadCount, refreshNotifications } =
    useAdminContext();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultsPayload | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await apiRequest<{ ok: true; results: SearchResultsPayload }>(
          `/api/admin/search?q=${encodeURIComponent(trimmed)}`,
        );
        setSearchResults(res.results);
        setSearchOpen(true);
      } catch {
        setSearchResults(null);
      } finally {
        setSearchLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchOpen(true);
    }
  };

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'AD';

  const roleLabel = user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <header className="h-[68px] bg-white dark:bg-[#0B1730] border-b border-[#E4EAF5] dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 transition-colors">
      {/* Left: Mobile Menu + Global Search Input matching reference */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl" ref={searchBoxRef}>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open admin sidebar"
          className="lg:hidden p-2 rounded-xl border border-[#E4EAF5] dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="search"
            value={query}
            onFocus={() => query.trim().length >= 2 && setSearchOpen(true)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label="Search admin products, orders, and customers"
            className="w-full h-10 pl-10 pr-14 rounded-xl bg-[#F4F7FF] dark:bg-slate-900 border border-[#E4EAF5] dark:border-slate-700 text-sm text-[#101B35] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#145CFF]"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="absolute right-1 top-1 bottom-1 px-3.5 rounded-lg bg-[#145CFF] hover:bg-[#0E47D9] text-white flex items-center justify-center transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Search Results Popover */}
          {searchOpen && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-12 bg-white dark:bg-slate-900 border border-[#E4EAF5] dark:border-slate-700 rounded-2xl shadow-xl p-3 z-50 max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="py-4 text-center text-xs text-slate-500">Searching database...</div>
              ) : searchResults &&
                (searchResults.products.length > 0 || searchResults.orders.length > 0 || searchResults.customers.length > 0) ? (
                <div className="space-y-3 text-xs">
                  {searchResults.products.length > 0 && (
                    <div>
                      <div className="px-2 py-1 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Products</div>
                      {searchResults.products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            navigate(`/admin/products/${p.id}`);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#EAF1FF] dark:hover:bg-slate-800 text-left"
                        >
                          <span className="flex items-center gap-2 font-medium text-[#101B35] dark:text-slate-100">
                            <Package className="w-3.5 h-3.5 text-[#145CFF]" />
                            {p.name}
                          </span>
                          <span className="font-mono-tabular text-slate-500">{p.sku} · ৳{p.price.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.orders.length > 0 && (
                    <div>
                      <div className="px-2 py-1 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Orders</div>
                      {searchResults.orders.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            navigate(`/admin/orders/${o.id}`);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#EAF1FF] dark:hover:bg-slate-800 text-left"
                        >
                          <span className="flex items-center gap-2 font-medium text-[#101B35] dark:text-slate-100">
                            <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                            #{o.orderNumber} · {o.customerName}
                          </span>
                          <span className="font-mono-tabular text-slate-500">৳{o.total.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.customers.length > 0 && (
                    <div>
                      <div className="px-2 py-1 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Customers</div>
                      {searchResults.customers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            navigate(`/admin/customers/${c.id}`);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#EAF1FF] dark:hover:bg-slate-800 text-left"
                        >
                          <span className="flex items-center gap-2 font-medium text-[#101B35] dark:text-slate-100">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            {c.name}
                          </span>
                          <span className="text-slate-500">{c.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">No matches found for "{query}".</div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Right Action Cluster matching reference */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((o) => !o);
              refreshNotifications();
            }}
            aria-label={`Notifications (${unreadCount} alerts)`}
            className="relative w-9 h-9 rounded-full bg-[#F4F7FF] dark:bg-slate-800 border border-[#E4EAF5] dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:border-[#145CFF]/50 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center font-mono-tabular">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-[#E4EAF5] dark:border-slate-700 rounded-2xl shadow-xl p-3 z-50">
              <div className="flex items-center justify-between px-2 pb-2 border-b border-[#E4EAF5] dark:border-slate-800">
                <span className="text-xs font-bold text-[#101B35] dark:text-slate-100">Store Alerts</span>
                <span className="text-[11px] font-medium text-[#145CFF]">{unreadCount} active</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">All clear — no pending alerts.</p>
                ) : (
                  notifications.map((item) => (
                    <Link
                      key={item.id}
                      to={item.link}
                      onClick={() => setNotifOpen(false)}
                      className="block px-2 py-2.5 hover:bg-[#F4F7FF] dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <div className="text-xs font-semibold text-[#101B35] dark:text-slate-100">{item.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.subtitle}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Language Toggle (EN/BN) */}
        <button
          type="button"
          onClick={toggleLang}
          aria-label="Toggle dashboard language"
          title={`Switch to ${lang === 'en' ? 'Bangla' : 'English'}`}
          className="h-9 px-2.5 rounded-full bg-[#F4F7FF] dark:bg-slate-800 border border-[#E4EAF5] dark:border-slate-700 flex items-center gap-1.5 text-slate-600 dark:text-slate-200 hover:border-[#145CFF]/50 text-xs font-semibold transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-[#145CFF]" />
          <span className="uppercase">{lang}</span>
        </button>

        {/* Dark / Light Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          className="w-9 h-9 rounded-full bg-[#F4F7FF] dark:bg-slate-800 border border-[#E4EAF5] dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:border-[#145CFF]/50 transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Admin User Pill */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-[#F4F7FF] dark:hover:bg-slate-800 transition-colors"
          >
            <span className="w-9 h-9 rounded-full bg-[#145CFF] text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {initials}
            </span>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-[13px] font-bold text-[#101B35] dark:text-slate-100 max-w-[120px] truncate">{user.name}</div>
              <div className="text-[11px] text-[#64748B] dark:text-slate-400">{roleLabel}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-[#E4EAF5] dark:border-slate-700 rounded-2xl shadow-xl py-1.5 z-50 text-xs">
              <div className="px-3.5 py-2 border-b border-[#E4EAF5] dark:border-slate-800">
                <div className="font-bold text-[#101B35] dark:text-slate-100 truncate">{user.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
              </div>
              <Link
                to="/"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-[#F4F7FF] dark:hover:bg-slate-800"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#145CFF]" /> View Live Storefront
              </Link>
              <Link
                to="/admin/system-health"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-[#F4F7FF] dark:hover:bg-slate-800"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" /> Database & Health
              </Link>
              <Link
                to="/account"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-[#F4F7FF] dark:hover:bg-slate-800"
              >
                <User className="w-3.5 h-3.5 text-slate-500" /> My Account
              </Link>
              <button
                type="button"
                onClick={() => dispatch(logoutUser())}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-left"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
