import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { fetchCurrentUser, setUserProfile } from './features/auth/authSlice';
import { fetchServerCart, resetToGuestCart } from './features/cart/cartSlice';
import {
  hydrateGuestWishlist,
  mergeGuestWishlistAsync,
  resetToGuestWishlist,
} from './features/wishlist/wishlistSlice';
import { registerUnauthorizedHandler } from './services/api';
import { StorefrontLayout } from './layouts/StorefrontLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { AdminProvider } from './components/admin/AdminContext';
import { AuthModal } from './features/auth/AuthModal';
import { CartDrawer } from './features/cart/CartDrawer';
import { ToastContainer } from './components/feedback/ToastContainer';

import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage, VerifyEmailPage } from './pages/AuthUtilityPages';
import { WishlistPage } from './pages/WishlistPage';
import {
  AccountProfilePage,
  OrderDetailPage as CustomerOrderDetailPage,
  OrderHistoryPage,
  SavedAddressesPage,
} from './pages/AccountPages';
import {
  AccountDashboardPage,
  AccountSecurityPage,
  MyCouponsPage,
  MyReviewsPage,
  MyWalletPage,
} from './pages/account/CustomerAccountModules';
import {
  AboutPage,
  BlogDetailPage,
  BlogListPage,
  CmsStaticPage,
  ContactPage,
  FaqPublicPage,
  NotFoundPage,
  OffersPage,
  TrackOrderPage,
} from './pages/SupportAndInfoPages';

// Separated Modular Admin Pages
import { DashboardPage } from './pages/admin/dashboard/DashboardPage';

import { ProductsListPage } from './pages/admin/products/ProductsListPage';
import { ProductFormPage } from './pages/admin/products/ProductFormPage';
import { ProductDetailPage as AdminProductDetailPage } from './pages/admin/products/ProductDetailPage';
import { AttributesPage } from './pages/admin/products/AttributesPage';

import { CategoriesListPage } from './pages/admin/categories/CategoriesListPage';
import { CategoryFormPage } from './pages/admin/categories/CategoryFormPage';
import { BrandsListPage } from './pages/admin/brands/BrandsListPage';
import { BrandFormPage } from './pages/admin/brands/BrandFormPage';

import { InventoryListPage } from './pages/admin/inventory/InventoryListPage';
import { InventoryAdjustmentsPage } from './pages/admin/inventory/InventoryAdjustmentsPage';
import { InventoryHistoryPage } from './pages/admin/inventory/InventoryHistoryPage';

import { HeroSlidesListPage } from './pages/admin/hero-slides/HeroSlidesListPage';
import { HeroSlideFormPage } from './pages/admin/hero-slides/HeroSlideFormPage';
import { CartHeroSliderPage } from './pages/admin/hero-slides/CartHeroSliderPage';
import { CheckoutHeroSliderPage } from './pages/admin/hero-slides/CheckoutHeroSliderPage';
import { WishlistHeroSliderPage } from './pages/admin/hero-slides/WishlistHeroSliderPage';
import { BannersListPage } from './pages/admin/banners/BannersListPage';
import { BannerFormPage } from './pages/admin/banners/BannerFormPage';
import { AdvertisementsListPage } from './pages/admin/advertisements/AdvertisementsListPage';
import { AdvertisementFormPage } from './pages/admin/advertisements/AdvertisementFormPage';

import { OrdersListPage } from './pages/admin/orders/OrdersListPage';
import { OrderDetailPage as AdminOrderDetailPage } from './pages/admin/orders/OrderDetailPage';
import { CancellationRequestsPage } from './pages/admin/orders/CancellationRequestsPage';
import { ReturnsRefundsPage } from './pages/admin/orders/ReturnsRefundsPage';
import { PaymentTransactionsPage } from './pages/admin/settings/PaymentTransactionsPage';

import { CustomersListPage } from './pages/admin/customers/CustomersListPage';
import { CustomerDetailPage } from './pages/admin/customers/CustomerDetailPage';
import { CustomerGroupsPage } from './pages/admin/customers/CustomerGroupsPage';
import { ReviewsListPage } from './pages/admin/reviews/ReviewsListPage';
import { ReviewDetailPage } from './pages/admin/reviews/ReviewDetailPage';

import { CouponsListPage } from './pages/admin/coupons/CouponsListPage';
import { CouponFormPage } from './pages/admin/coupons/CouponFormPage';
import { DiscountRulesPage } from './pages/admin/coupons/DiscountRulesPage';
import { CampaignsPage } from './pages/admin/coupons/CampaignsPage';

import { NavigationManagerPage } from './pages/admin/cms/NavigationManagerPage';
import { HomepageCmsPage } from './pages/admin/cms/HomepageCmsPage';
import { HomepageSectionsPage } from './pages/admin/cms/HomepageSectionsPage';
import { PromotionalPopupsPage } from './pages/admin/cms/PromotionalPopupsPage';
import { StaticPagesPage } from './pages/admin/cms/StaticPagesPage';
import { FaqManagementPage } from './pages/admin/cms/FaqManagementPage';
import { BlogManagementPage } from './pages/admin/cms/BlogManagementPage';
import { SupportEnquiriesPage } from './pages/admin/cms/SupportEnquiriesPage';

import { GeneralSettingsPage } from './pages/admin/settings/GeneralSettingsPage';
import { HeaderSettingsPage } from './pages/admin/settings/HeaderSettingsPage';
import { FooterSettingsPage } from './pages/admin/settings/FooterSettingsPage';
import { SocialLinksPage } from './pages/admin/settings/SocialLinksPage';
import { AnnouncementSettingsPage } from './pages/admin/settings/AnnouncementSettingsPage';
import { SeoSettingsPage } from './pages/admin/settings/SeoSettingsPage';
import { PaymentMethodsPage } from './pages/admin/settings/PaymentMethodsPage';
import { ShippingSettingsPage } from './pages/admin/settings/ShippingSettingsPage';
import { DeliveryZonesPage } from './pages/admin/settings/DeliveryZonesPage';
import { TaxSettingsPage } from './pages/admin/settings/TaxSettingsPage';
import { EmailSettingsPage } from './pages/admin/settings/EmailSettingsPage';
import { NotificationsSettingsPage } from './pages/admin/settings/NotificationsSettingsPage';
import { SecuritySettingsPage } from './pages/admin/settings/SecuritySettingsPage';

import { AnalyticsReportPage } from './pages/admin/analytics/AnalyticsReportPage';

import { AdminUsersPage } from './pages/admin/system/AdminUsersPage';
import { RolesPage } from './pages/admin/system/RolesPage';
import { PermissionsPage } from './pages/admin/system/PermissionsPage';
import { AuditLogsPage } from './pages/admin/system/AuditLogsPage';
import { SystemLogsPage } from './pages/admin/system/SystemLogsPage';
import { SystemHealthPage } from './pages/admin/system/SystemHealthPage';

function AppBootstrap() {
  const dispatch = useAppDispatch();
  const { user, initialized } = useAppSelector((s) => s.auth);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      dispatch(setUserProfile(null));
      dispatch(resetToGuestCart());
      dispatch(resetToGuestWishlist());
    });
    return () => registerUnauthorizedHandler(null);
  }, [dispatch]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('resetToken');
    const resetEmail = params.get('email');
    if (resetToken && resetEmail) {
      window.history.replaceState(
        null,
        '',
        `/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(resetEmail)}`,
      );
    } else if (params.get('oauth') === 'success') {
      params.delete('oauth');
      const cleaned = params.toString();
      window.history.replaceState(null, '', cleaned ? `${window.location.pathname}?${cleaned}` : window.location.pathname);
    }
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      dispatch(fetchServerCart());
      dispatch(mergeGuestWishlistAsync());
    } else if (initialized) {
      dispatch(hydrateGuestWishlist());
    }
  }, [dispatch, user, initialized]);

  return null;
}

function AdminRouteScope() {
  return (
    <AdminProvider>
      <Outlet />
    </AdminProvider>
  );
}

const STANDALONE_AUTH_PATHS = new Set([
  '/login',
  '/signin',
  '/register',
  '/signup',
  '/forgot-password',
  '/verify-email',
  '/reset-password',
]);

function GlobalOverlays() {
  const location = useLocation();
  const isStandaloneAuthRoute = STANDALONE_AUTH_PATHS.has(location.pathname.toLowerCase());
  return (
    <>
      {!isStandaloneAuthRoute && <AuthModal />}
      {!isStandaloneAuthRoute && <CartDrawer />}
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppBootstrap />
        <Routes>
          {/* Storefront Customer Routes */}
          <Route
            path="/"
            element={
              <StorefrontLayout>
                <HomePage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/shop"
            element={
              <StorefrontLayout>
                <ShopPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/category/:slug"
            element={
              <StorefrontLayout>
                <ShopPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/product/:slug"
            element={
              <StorefrontLayout>
                <ProductDetailPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/offers"
            element={
              <StorefrontLayout>
                <OffersPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/blog"
            element={
              <StorefrontLayout>
                <BlogListPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/blog/:slug"
            element={
              <StorefrontLayout>
                <BlogDetailPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/faqs"
            element={
              <StorefrontLayout>
                <FaqPublicPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/about"
            element={
              <StorefrontLayout>
                <AboutPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/cart"
            element={
              <StorefrontLayout>
                <CartPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/checkout"
            element={
              <StorefrontLayout>
                <CheckoutPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/order-success/:id"
            element={
              <StorefrontLayout>
                <OrderSuccessPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/checkout/success/:id"
            element={
              <StorefrontLayout>
                <OrderSuccessPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/wishlist"
            element={
              <StorefrontLayout>
                <WishlistPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/track-order"
            element={
              <StorefrontLayout>
                <TrackOrderPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/contact"
            element={
              <StorefrontLayout>
                <ContactPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/pages/:slug"
            element={
              <StorefrontLayout>
                <CmsStaticPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account"
            element={
              <StorefrontLayout>
                <AccountProfilePage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account/orders"
            element={
              <StorefrontLayout>
                <OrderHistoryPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account/orders/:id"
            element={
              <StorefrontLayout>
                <CustomerOrderDetailPage />
              </StorefrontLayout>
            }
          />
          {/* Isolated Full-Screen Authentication Routes (No Storefront Header / Footer) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage initialMode="login" />} />
            <Route path="/signin" element={<LoginPage initialMode="login" />} />
            <Route path="/forgot-password" element={<LoginPage initialMode="forgot" />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/signup" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
          <Route
            path="/account/addresses"
            element={
              <StorefrontLayout>
                <SavedAddressesPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account/dashboard"
            element={
              <StorefrontLayout>
                <AccountDashboardPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account/reviews"
            element={
              <StorefrontLayout>
                <MyReviewsPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account/coupons"
            element={
              <StorefrontLayout>
                <MyCouponsPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account/wallet"
            element={
              <StorefrontLayout>
                <MyWalletPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account/security"
            element={
              <StorefrontLayout>
                <AccountSecurityPage />
              </StorefrontLayout>
            }
          />
          <Route path="/account/profile" element={<Navigate to="/account" replace />} />
          <Route path="/account/settings" element={<Navigate to="/account" replace />} />

          {/* Admin Operations Portal Routes */}
          <Route element={<AdminRouteScope />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<DashboardPage />} />

            {/* Products, Categories, Brands & Attributes */}
            <Route path="/admin/products" element={<ProductsListPage />} />
            <Route path="/admin/products/new" element={<ProductFormPage />} />
            <Route path="/admin/products/:id" element={<AdminProductDetailPage />} />
            <Route path="/admin/products/:id/edit" element={<ProductFormPage />} />

            <Route path="/admin/categories" element={<CategoriesListPage />} />
            <Route path="/admin/categories/new" element={<CategoryFormPage />} />
            <Route path="/admin/categories/:id/edit" element={<CategoryFormPage />} />

            <Route path="/admin/brands" element={<BrandsListPage />} />
            <Route path="/admin/brands/new" element={<BrandFormPage />} />
            <Route path="/admin/brands/:id/edit" element={<BrandFormPage />} />

            <Route path="/admin/attributes" element={<AttributesPage />} />
            <Route path="/admin/attribute-groups" element={<AttributesPage defaultTab="groups" />} />

            {/* Inventory Management */}
            <Route path="/admin/inventory" element={<InventoryListPage />} />
            <Route path="/admin/inventory/adjustments" element={<InventoryAdjustmentsPage />} />
            <Route path="/admin/inventory/history" element={<InventoryHistoryPage />} />

            {/* Marketing & Merchandising */}
            <Route path="/admin/hero-slides" element={<HeroSlidesListPage />} />
            <Route path="/admin/hero-slides/new" element={<HeroSlideFormPage />} />
            <Route path="/admin/hero-slides/:id/edit" element={<HeroSlideFormPage />} />
            <Route path="/admin/cart-hero-slider" element={<CartHeroSliderPage />} />
            <Route path="/admin/checkout-hero-slider" element={<CheckoutHeroSliderPage />} />
            <Route path="/admin/wishlist-hero-slider" element={<WishlistHeroSliderPage />} />
            <Route path="/admin/banners" element={<BannersListPage />} />
            <Route path="/admin/banners/new" element={<BannerFormPage />} />
            <Route path="/admin/banners/:id/edit" element={<BannerFormPage />} />

            <Route path="/admin/advertisements" element={<AdvertisementsListPage />} />
            <Route path="/admin/advertisements/new" element={<AdvertisementFormPage />} />
            <Route path="/admin/advertisements/:id/edit" element={<AdvertisementFormPage />} />

            <Route path="/admin/marketing/campaigns" element={<CampaignsPage />} />
            <Route path="/admin/navigation" element={<NavigationManagerPage />} />
            <Route path="/admin/cms/popups" element={<PromotionalPopupsPage />} />

            {/* Sales, Orders, Returns & Payments */}
            <Route path="/admin/orders" element={<OrdersListPage />} />
            <Route path="/admin/orders/pending" element={<OrdersListPage initialStatusGroup="pending" />} />
            <Route path="/admin/orders/processing" element={<OrdersListPage initialStatusGroup="processing" />} />
            <Route path="/admin/orders/shipped" element={<OrdersListPage initialStatusGroup="shipped" />} />
            <Route path="/admin/orders/delivered" element={<OrdersListPage initialStatusGroup="delivered" />} />
            <Route path="/admin/orders/cancelled" element={<OrdersListPage initialStatusGroup="cancelled" />} />
            <Route path="/admin/orders/cancellation-requests" element={<CancellationRequestsPage />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
            <Route path="/admin/returns" element={<ReturnsRefundsPage />} />
            <Route path="/admin/payments" element={<PaymentTransactionsPage />} />

            {/* Customers, Reviews & Support */}
            <Route path="/admin/customers" element={<CustomersListPage />} />
            <Route path="/admin/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/admin/customer-groups" element={<CustomerGroupsPage />} />
            <Route path="/admin/reviews" element={<ReviewsListPage />} />
            <Route path="/admin/reviews/:id" element={<ReviewDetailPage />} />
            <Route path="/admin/support" element={<SupportEnquiriesPage />} />

            {/* Coupons & Offers */}
            <Route path="/admin/coupons" element={<CouponsListPage />} />
            <Route path="/admin/coupons/new" element={<CouponFormPage />} />
            <Route path="/admin/coupons/:id/edit" element={<CouponFormPage />} />
            <Route path="/admin/discount-rules" element={<DiscountRulesPage />} />
            <Route path="/admin/special-offers" element={<CampaignsPage defaultType="special_offer" />} />
            <Route path="/admin/flash-sales" element={<CampaignsPage defaultType="flash_sale" />} />

            {/* Content & Website Settings */}
            <Route path="/admin/homepage-layout" element={<HomepageSectionsPage />} />
            <Route path="/admin/cms/homepage" element={<HomepageCmsPage />} />
            <Route path="/admin/cms/sections" element={<HomepageSectionsPage />} />
            <Route path="/admin/cms/pages" element={<StaticPagesPage />} />
            <Route path="/admin/cms/faqs" element={<FaqManagementPage />} />
            <Route path="/admin/cms/blogs" element={<BlogManagementPage />} />

            <Route path="/admin/settings/header" element={<HeaderSettingsPage />} />
            <Route path="/admin/settings/footer" element={<FooterSettingsPage />} />
            <Route path="/admin/settings/announcement" element={<AnnouncementSettingsPage />} />
            <Route path="/admin/settings/social-links" element={<SocialLinksPage />} />

            {/* Payments, Shipping, Tax & System Settings */}
            <Route path="/admin/payments/methods" element={<PaymentMethodsPage />} />
            <Route path="/admin/shipping" element={<ShippingSettingsPage />} />
            <Route path="/admin/shipping/zones" element={<DeliveryZonesPage />} />
            <Route path="/admin/settings/tax" element={<TaxSettingsPage />} />
            <Route path="/admin/settings/general" element={<GeneralSettingsPage />} />
            <Route path="/admin/settings/email" element={<EmailSettingsPage />} />
            <Route path="/admin/settings/notifications" element={<NotificationsSettingsPage />} />
            <Route path="/admin/settings/seo" element={<SeoSettingsPage />} />
            <Route path="/admin/settings/security" element={<SecuritySettingsPage />} />

            {/* Reports & Analytics */}
            <Route path="/admin/analytics/sales" element={<AnalyticsReportPage metric="sales" />} />
            <Route path="/admin/analytics/revenue" element={<AnalyticsReportPage metric="revenue" />} />
            <Route path="/admin/analytics/products" element={<AnalyticsReportPage metric="products" />} />
            <Route path="/admin/analytics/customers" element={<AnalyticsReportPage metric="customers" />} />
            <Route path="/admin/analytics/inventory" element={<AnalyticsReportPage metric="inventory" />} />

            {/* Admin Users, RBAC, Logs & System Health */}
            <Route path="/admin/admin-users" element={<AdminUsersPage />} />
            <Route path="/admin/roles" element={<RolesPage />} />
            <Route path="/admin/permissions" element={<PermissionsPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
            <Route path="/admin/system-logs" element={<SystemLogsPage />} />
            <Route path="/admin/system-health" element={<SystemHealthPage />} />

            {/* Legacy Route Redirects */}
            <Route path="/admin/stock" element={<Navigate to="/admin/inventory/adjustments" replace />} />
            <Route path="/admin/marketing/hero" element={<Navigate to="/admin/hero-slides" replace />} />
            <Route path="/admin/marketing/banners" element={<Navigate to="/admin/banners" replace />} />
            <Route path="/admin/ads" element={<Navigate to="/admin/advertisements" replace />} />
            <Route path="/admin/marketing/navigation" element={<Navigate to="/admin/navigation" replace />} />
            <Route path="/admin/marketing/popups" element={<Navigate to="/admin/cms/popups" replace />} />
            <Route path="/admin/cms" element={<Navigate to="/admin/cms/sections" replace />} />
            <Route path="/admin/cms/about" element={<Navigate to="/admin/cms/pages" replace />} />
            <Route path="/admin/cms/contact" element={<Navigate to="/admin/settings/social-links" replace />} />
            <Route path="/admin/website/header" element={<Navigate to="/admin/settings/header" replace />} />
            <Route path="/admin/website/footer" element={<Navigate to="/admin/settings/footer" replace />} />
            <Route path="/admin/website/navigation" element={<Navigate to="/admin/navigation" replace />} />
            <Route path="/admin/website/announcement" element={<Navigate to="/admin/settings/announcement" replace />} />
            <Route path="/admin/website/social" element={<Navigate to="/admin/settings/social-links" replace />} />
            <Route path="/admin/shipping/methods" element={<Navigate to="/admin/shipping" replace />} />
            <Route path="/admin/shipping/charges" element={<Navigate to="/admin/shipping" replace />} />
            <Route path="/admin/tax" element={<Navigate to="/admin/settings/tax" replace />} />
            <Route path="/admin/reports" element={<Navigate to="/admin/analytics/sales" replace />} />
            <Route path="/admin/reports/revenue" element={<Navigate to="/admin/analytics/revenue" replace />} />
            <Route path="/admin/reports/products" element={<Navigate to="/admin/analytics/products" replace />} />
            <Route path="/admin/reports/customers" element={<Navigate to="/admin/analytics/customers" replace />} />
            <Route path="/admin/reports/inventory" element={<Navigate to="/admin/analytics/inventory" replace />} />
            <Route path="/admin/settings" element={<Navigate to="/admin/settings/general" replace />} />
            <Route path="/admin/settings/store" element={<Navigate to="/admin/settings/general" replace />} />
            <Route path="/admin/settings/currency" element={<Navigate to="/admin/settings/general" replace />} />
            <Route path="/admin/staff" element={<Navigate to="/admin/admin-users" replace />} />
            <Route path="/admin/audit" element={<Navigate to="/admin/audit-logs" replace />} />
            <Route path="/admin/logs" element={<Navigate to="/admin/system-logs" replace />} />
          </Route>

          {/* 404 Fallback */}
          <Route
            path="*"
            element={
              <StorefrontLayout>
                <NotFoundPage />
              </StorefrontLayout>
            }
          />
        </Routes>

        {/* Global Overlays */}
        <GlobalOverlays />
      </BrowserRouter>
    </Provider>
  );
}
