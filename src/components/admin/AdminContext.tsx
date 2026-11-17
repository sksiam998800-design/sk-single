import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import { useAppSelector } from '../../app/hooks';
import { isStaffRole } from '../../lib/rbac';

export type AdminTheme = 'light' | 'dark';
export type AdminLang = 'en' | 'bn';

export interface AdminNotificationItem {
  id: string;
  type: 'order' | 'stock' | 'review' | 'support';
  title: string;
  subtitle: string;
  link: string;
  createdAt: string;
}

const LABELS = {
  en: {
    dashboard: 'Dashboard',
    welcomeBack: 'Welcome Back',
    welcomeSubtitle: "Here's what's happening with your store today.",
    searchPlaceholder: 'Search anything... (products, orders, users)',
    addProduct: 'Add Product',
    createCoupon: 'Create Coupon',
    addBanner: 'Add Banner',
    manageOrders: 'Manage Orders',
    viewReviews: 'View Reviews',
    settings: 'Settings',
    totalOrders: 'Total Orders',
    totalCustomers: 'Total Customers',
    totalRevenue: 'Total Revenue',
    activeProducts: 'Active Products',
    visitors30d: 'Visitors (30d)',
    pendingReviews: 'Pending Reviews',
    salesOverview: 'Sales Overview',
    orderStatus: 'Order Status',
    recentOrders: 'Recent Orders',
    revenueOverview: 'Revenue Overview',
    topProducts: 'Top Products',
    quickStats: 'Quick Stats',
    footerSocial: 'Footer Links & Social Media',
    viewAll: 'View All',
    edit: 'Edit',
    liveStore: 'Live Store',
    maintenance: 'Maintenance',
  },
  bn: {
    dashboard: 'ড্যাশবোর্ড',
    welcomeBack: 'স্বাগতম',
    welcomeSubtitle: 'আপনার স্টোরের আজকের সম্পূর্ণ বিবরণ নিচে দেখুন।',
    searchPlaceholder: 'খুঁজুন... (পণ্য, অর্ডার, গ্রাহক)',
    addProduct: 'পণ্য যোগ করুন',
    createCoupon: 'কুপন তৈরি',
    addBanner: 'ব্যানার যোগ',
    manageOrders: 'অর্ডার দেখুন',
    viewReviews: 'রিভিউ দেখুন',
    settings: 'সেটিংস',
    totalOrders: 'মোট অর্ডার',
    totalCustomers: 'মোট গ্রাহক',
    totalRevenue: 'মোট আয়',
    activeProducts: 'সক্রিয় পণ্য',
    visitors30d: 'ভিজিটর (৩০ দিন)',
    pendingReviews: 'অপেক্ষমাণ রিভিউ',
    salesOverview: 'বিক্রয়ের সারসংক্ষেপ',
    orderStatus: 'অর্ডার অবস্থা',
    recentOrders: 'সাম্প্রতিক অর্ডার',
    revenueOverview: 'আয়ের সারসংক্ষেপ',
    topProducts: 'সেরা পণ্যসমূহ',
    quickStats: 'দ্রুত পরিসংখ্যান',
    footerSocial: 'ফুটার ও সোশ্যাল মিডিয়া',
    viewAll: 'সব দেখুন',
    edit: 'সম্পাদনা',
    liveStore: 'লাইভ স্টোর',
    maintenance: 'রক্ষণাবেক্ষণ',
  },
};

export type AdminLabelKey = keyof typeof LABELS.en;

interface AdminContextValue {
  theme: AdminTheme;
  toggleTheme: () => void;
  lang: AdminLang;
  toggleLang: () => void;
  t: (key: AdminLabelKey) => string;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  notifications: AdminNotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<AdminTheme>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('novara_admin_theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });
  const [lang, setLang] = useState<AdminLang>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('novara_admin_lang') === 'bn' ? 'bn' : 'en';
    }
    return 'en';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('novara_admin_theme', theme);
    return () => {
      root.classList.remove('dark');
    };
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('novara_admin_lang', lang);
  }, [lang]);

  const { user } = useAppSelector((s) => s.auth);

  const refreshNotifications = async () => {
    if (!user || !isStaffRole(user.role)) return;
    try {
      const res = await apiRequest<{ ok: true; unreadCount: number; items: AdminNotificationItem[] }>('/api/admin/notifications');
      setNotifications(res.items || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Ignore if unauthenticated or DB unavailable
    }
  };

  useEffect(() => {
    if (!user || !isStaffRole(user.role)) return;
    refreshNotifications();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshNotifications();
      }
    }, 15000);

    const handleFocus = () => {
      refreshNotifications();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  return (
    <AdminContext.Provider
      value={{
        theme,
        toggleTheme: () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light')),
        lang,
        toggleLang: () => setLang((prev) => (prev === 'en' ? 'bn' : 'en')),
        t: (key) => LABELS[lang][key] || LABELS.en[key],
        mobileSidebarOpen,
        setMobileSidebarOpen,
        notifications,
        unreadCount,
        refreshNotifications,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export function useAdminContext(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdminContext must be used inside AdminProvider');
  }
  return ctx;
}
