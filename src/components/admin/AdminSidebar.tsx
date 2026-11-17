import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Database,
  FileText,
  Globe,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Users,
  X,
} from 'lucide-react';
import type { UserProfile } from '../../types/commerce';
import { hasPermission, type Permission } from '../../lib/rbac';
import { useAdminContext } from './AdminContext';

interface SidebarSubItem {
  label: string;
  to: string;
  permission?: Permission;
}

interface SidebarGroup {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  permission?: Permission;
  items: SidebarSubItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: 'products',
    label: 'Product Management',
    icon: Package,
    permission: 'catalog.view',
    items: [
      { label: 'All Products', to: '/admin/products', permission: 'catalog.view' },
      { label: 'Add Product', to: '/admin/products/new', permission: 'catalog.manage' },
      { label: 'Categories', to: '/admin/categories', permission: 'catalog.view' },
      { label: 'Brands', to: '/admin/brands', permission: 'catalog.view' },
      { label: 'Product Attributes', to: '/admin/attributes', permission: 'catalog.view' },
      { label: 'Attribute Groups', to: '/admin/attribute-groups', permission: 'catalog.view' },
      { label: 'Inventory', to: '/admin/inventory', permission: 'inventory.view' },
      { label: 'Stock Adjustments', to: '/admin/inventory/adjustments', permission: 'inventory.adjust' },
      { label: 'Stock History', to: '/admin/inventory/history', permission: 'inventory.view' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    permission: 'cms.manage',
    items: [
      { label: 'Hero Slides', to: '/admin/hero-slides', permission: 'cms.manage' },
      { label: 'Cart Hero Slider', to: '/admin/cart-hero-slider', permission: 'cms.manage' },
      { label: 'Checkout Hero Slider', to: '/admin/checkout-hero-slider', permission: 'cms.manage' },
      { label: 'Wishlist Hero Slider', to: '/admin/wishlist-hero-slider', permission: 'cms.manage' },
      { label: 'Dynamic Banners', to: '/admin/banners', permission: 'cms.manage' },
      { label: 'Advertisements', to: '/admin/advertisements', permission: 'ads.manage' },
      { label: 'Promotional Campaigns', to: '/admin/marketing/campaigns', permission: 'marketing.manage' },
      { label: 'Navigation Menu', to: '/admin/navigation', permission: 'cms.manage' },
      { label: 'Promotional Popups', to: '/admin/cms/popups', permission: 'cms.manage' },
    ],
  },
  {
    id: 'orders',
    label: 'Sales & Orders',
    icon: ShoppingCart,
    permission: 'orders.view',
    items: [
      { label: 'All Orders', to: '/admin/orders' },
      { label: 'Pending Orders', to: '/admin/orders/pending' },
      { label: 'Processing Orders', to: '/admin/orders/processing' },
      { label: 'Shipped Orders', to: '/admin/orders/shipped' },
      { label: 'Delivered Orders', to: '/admin/orders/delivered' },
      { label: 'Cancelled Orders', to: '/admin/orders/cancelled' },
      { label: 'Cancellation Requests', to: '/admin/orders/cancellation-requests' },
      { label: 'Returns & Refunds', to: '/admin/returns', permission: 'refunds.manage' },
      { label: 'Payment Transactions', to: '/admin/payments', permission: 'payments.view' },
    ],
  },
  {
    id: 'customers',
    label: 'Customer',
    icon: Users,
    permission: 'customers.view',
    items: [
      { label: 'All Customers', to: '/admin/customers', permission: 'customers.view' },
      { label: 'Customer Groups', to: '/admin/customer-groups', permission: 'customers.view' },
      { label: 'Reviews & Ratings', to: '/admin/reviews', permission: 'reviews.moderate' },
      { label: 'Support Enquiries', to: '/admin/support', permission: 'support.manage' },
    ],
  },
  {
    id: 'coupons',
    label: 'Coupons & Offers',
    icon: Tag,
    permission: 'marketing.manage',
    items: [
      { label: 'Coupons', to: '/admin/coupons' },
      { label: 'Discount Rules', to: '/admin/discount-rules' },
      { label: 'Special Offers', to: '/admin/special-offers' },
      { label: 'Flash Sales', to: '/admin/flash-sales' },
    ],
  },
  {
    id: 'content',
    label: 'Content Management',
    icon: FileText,
    permission: 'cms.manage',
    items: [
      { label: 'Homepage Layout', to: '/admin/homepage-layout' },
      { label: 'Homepage CMS', to: '/admin/cms/homepage' },
      { label: 'Homepage Sections', to: '/admin/cms/sections' },
      { label: 'Static Pages', to: '/admin/cms/pages' },
      { label: 'FAQ Management', to: '/admin/cms/faqs' },
      { label: 'Blog Management', to: '/admin/cms/blogs' },
    ],
  },
  {
    id: 'website',
    label: 'Website Management',
    icon: Globe,
    permission: 'cms.manage',
    items: [
      { label: 'Header Settings', to: '/admin/settings/header' },
      { label: 'Footer Settings', to: '/admin/settings/footer' },
      { label: 'Announcement Bar', to: '/admin/settings/announcement' },
      { label: 'Social Media Links', to: '/admin/settings/social-links' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments & Shipping',
    icon: CreditCard,
    permission: 'settings.manage',
    items: [
      { label: 'Payment Methods', to: '/admin/payments/methods', permission: 'settings.manage' },
      { label: 'Shipping Settings', to: '/admin/shipping', permission: 'settings.manage' },
      { label: 'Delivery Zones', to: '/admin/shipping/zones', permission: 'settings.manage' },
      { label: 'Tax Configuration', to: '/admin/settings/tax', permission: 'settings.manage' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: BarChart3,
    permission: 'reports.view',
    items: [
      { label: 'Sales Analytics', to: '/admin/analytics/sales' },
      { label: 'Revenue Analytics', to: '/admin/analytics/revenue' },
      { label: 'Product Performance', to: '/admin/analytics/products' },
      { label: 'Customer Analytics', to: '/admin/analytics/customers' },
      { label: 'Inventory Reports', to: '/admin/analytics/inventory' },
    ],
  },
  {
    id: 'settings',
    label: 'System Settings',
    icon: Settings,
    permission: 'settings.manage',
    items: [
      { label: 'General & Store', to: '/admin/settings/general' },
      { label: 'Email Settings', to: '/admin/settings/email' },
      { label: 'Notification Settings', to: '/admin/settings/notifications' },
      { label: 'SEO Settings', to: '/admin/settings/seo' },
      { label: 'Security Settings', to: '/admin/settings/security' },
    ],
  },
  {
    id: 'staff',
    label: 'Admin & Roles',
    icon: ShieldCheck,
    permission: 'audit.view',
    items: [
      { label: 'Admin Users', to: '/admin/admin-users', permission: 'staff.manage' },
      { label: 'Roles', to: '/admin/roles', permission: 'staff.manage' },
      { label: 'Permissions', to: '/admin/permissions', permission: 'staff.manage' },
      { label: 'Audit Logs', to: '/admin/audit-logs', permission: 'audit.view' },
      { label: 'System Logs', to: '/admin/system-logs', permission: 'logs.view' },
    ],
  },
  {
    id: 'health',
    label: 'Database & Health',
    icon: Database,
    permission: 'system.view',
    items: [
      { label: 'System Health', to: '/admin/system-health' },
    ],
  },
];

interface AdminSidebarProps {
  user: UserProfile;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ user }) => {
  const location = useLocation();
  const { mobileSidebarOpen, setMobileSidebarOpen, t } = useAdminContext();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    products: true,
    marketing: true,
    orders: true,
    customers: true,
    coupons: true,
    settings: true,
    staff: true,
  });

  const isItemActive = (to: string) => {
    if (location.pathname === to) return true;
    // Prevent '/admin/products' from staying active when on '/admin/products/new'
    if (to === '/admin/products' && location.pathname === '/admin/products/new') return false;
    if (to === '/admin/inventory' && location.pathname.startsWith('/admin/inventory/')) return false;
    if (to === '/admin/shipping' && location.pathname.startsWith('/admin/shipping/')) return false;
    if (to === '/admin/orders' && /^\/admin\/orders\/(pending|processing|shipped|delivered|cancelled|cancellation-requests)/.test(location.pathname)) {
      return false;
    }
    return location.pathname.startsWith(`${to}/`);
  };

  useEffect(() => {
    const matched = SIDEBAR_GROUPS.find((g) => g.items.some((item) => isItemActive(item.to)));
    if (matched) {
      setOpenGroups((prev) => ({ ...prev, [matched.id]: true }));
    }
  }, [location.pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isDashboardActive = location.pathname === '/admin' || location.pathname === '/admin/dashboard';

  const renderSidebarBody = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#071B3A] via-[#0A1E40] to-[#061632] text-white select-none">
      {/* Brand Lockup */}
      <div className="h-[68px] px-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <Link
          to="/admin/dashboard"
          onClick={() => setMobileSidebarOpen(false)}
          className="flex items-center gap-3 group"
        >
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B68FF] to-[#145CFF] flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <ShoppingBag className="w-5 h-5 text-white" />
          </span>
          <div className="leading-tight">
            <div className="font-display font-bold text-[18px] tracking-tight text-white">NOVARA</div>
            <div className="text-[11px] font-medium text-blue-200/75">Commerce Admin</div>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Admin sidebar navigation" className="flex-1 overflow-y-auto admin-sidebar-scroll px-3 py-4 space-y-1">
        <Link
          to="/admin/dashboard"
          onClick={() => setMobileSidebarOpen(false)}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all ${
            isDashboardActive
              ? 'bg-[#145CFF] text-white shadow-md shadow-blue-600/35'
              : 'text-slate-200 hover:bg-white/8 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>{t('dashboard')}</span>
        </Link>

        <div className="pt-1 space-y-1">
          {SIDEBAR_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || hasPermission(user.role, item.permission, user.customPermissions),
            );
            if (visibleItems.length === 0) return null;

            const isExpanded = Boolean(openGroups[group.id]);
            const hasActiveChild = visibleItems.some((item) => isItemActive(item.to));
            const Icon = group.icon;

            return (
              <div key={group.id} className="pt-0.5">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                    hasActiveChild
                      ? 'text-white bg-white/10'
                      : 'text-slate-200/90 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 text-blue-300/90 shrink-0" />
                    <span className="truncate">{group.label}</span>
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-0.5 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                    {visibleItems.map((item) => {
                      const active = isItemActive(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12.5px] transition-colors ${
                            active
                              ? 'bg-[#145CFF]/25 text-white font-semibold'
                              : 'text-slate-300/85 hover:text-white hover:bg-white/6'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`text-[10px] leading-none ${active ? 'text-[#60A5FA]' : 'text-slate-400/80'}`}
                          >
                            ◇
                          </span>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom Brand Footer */}
      <div className="p-3.5 border-t border-white/10 shrink-0">
        <Link
          to="/admin/system-health"
          onClick={() => setMobileSidebarOpen(false)}
          className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-[#0E2B5C]/90 to-[#145CFF]/30 border border-white/10 hover:border-blue-400/40 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg bg-[#145CFF] flex items-center justify-center shadow-inner shrink-0">
            <Activity className="w-4 h-4 text-white" />
          </span>
          <div className="min-w-0">
            <div className="text-[12.5px] font-bold text-white truncate">NOVARA Commerce</div>
            <div className="text-[11px] text-blue-200/80 truncate">Build. Sell. Grow.</div>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-[256px] shrink-0 h-screen sticky top-0 z-30 shadow-xl shadow-slate-900/10">
        {renderSidebarBody()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative w-[272px] max-w-[85vw] h-full z-10 shadow-2xl">
            {renderSidebarBody()}
          </aside>
        </div>
      )}
    </>
  );
};
