import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Sparkles, Wrench, X } from 'lucide-react';
import { StoreHeader } from '../components/layout/StoreHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { ResilientImage } from '../components/ui/ResilientImage';
import { ApiError, apiRequest, isAbortError } from '../services/api';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { setStorefrontMetadata } from '../features/storefront/storefrontSlice';
import { isStaffRole } from '../lib/rbac';
import { isWithinScheduleWindow } from '../lib/dateTime';
import type {
  BannerRecord,
  BrandItem,
  CategoryItem,
  HomepageConfigData,
  NavigationMenuConfig,
  PromotionalAdData,
} from '../types/commerce';

interface StorefrontLayoutProps {
  children: ReactNode;
}

export function StorefrontLayout({ children }: StorefrontLayoutProps) {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [settings, setSettings] = useState<Partial<HomepageConfigData> | null>(null);
  const [megaMenus, setMegaMenus] = useState<NavigationMenuConfig[]>([]);
  const [serviceNotice, setServiceNotice] = useState<{
    kind: 'db' | 'api';
    message: string;
  } | null>(null);
  const [popupDismissed, setPopupDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem('novara_popup_dismissed') === '1',
  );
  const [popupVisible, setPopupVisible] = useState(false);

  const loadNavigation = useCallback(async (signal?: AbortSignal, allowRetry = true) => {
    try {
      const res = await apiRequest<{
        ok: true;
        categories: CategoryItem[];
        brands?: BrandItem[];
        settings: Partial<HomepageConfigData> | null;
        megaMenus?: NavigationMenuConfig[];
        banners?: BannerRecord[];
        promotionalAds?: PromotionalAdData[];
      }>('/api/storefront/navigation', { signal });
      const nextCategories = Array.isArray(res?.categories) ? res.categories : [];
      const nextSettings = res?.settings ?? null;
      const nextMegaMenus = Array.isArray(res?.megaMenus) ? res.megaMenus : [];
      setCategories(nextCategories);
      setSettings(nextSettings);
      setMegaMenus(nextMegaMenus);
      dispatch(
        setStorefrontMetadata({
          categories: nextCategories,
          brands: Array.isArray(res?.brands) ? res.brands : [],
          settings: nextSettings,
          megaMenus: nextMegaMenus,
          banners: Array.isArray(res?.banners) ? res.banners : [],
          promotionalAds: Array.isArray(res?.promotionalAds) ? res.promotionalAds : [],
        }),
      );
      setServiceNotice(null);
    } catch (err) {
      if (isAbortError(err)) return;

      if (err instanceof ApiError && err.code === 'DATABASE_UNAVAILABLE') {
        setServiceNotice({
          kind: 'db',
          message:
            'MongoDB Atlas Connection Required: Persistent catalog, accounts, and orders require MONGODB_URI to be configured in server environment variables.',
        });
        return;
      }

      if (
        allowRetry &&
        err instanceof ApiError &&
        (err.code === 'INVALID_API_RESPONSE' || err.code === 'NETWORK_ERROR' || err.status === 502 || err.status === 504)
      ) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        if (!signal?.aborted) {
          await loadNavigation(signal, false);
        }
        return;
      }

      try {
        const healthResp = await fetch('/api/health', { cache: 'no-store', signal });
        const contentType = (healthResp.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/json')) {
          const healthData = (await healthResp.json().catch(() => null)) as {
            ok?: boolean;
            database?: string;
          } | null;
          if (
            healthResp.status === 503 ||
            healthResp.status === 424 ||
            healthData?.database === 'disconnected' ||
            healthData?.database === 'connecting' ||
            healthData?.ok === false
          ) {
            setServiceNotice({
              kind: 'db',
              message:
                'MongoDB Atlas Connection Required: Persistent catalog, accounts, and orders require MONGODB_URI to be configured in server environment variables.',
            });
            return;
          }
        }
        if (!contentType.includes('application/json')) {
          const bodySnippet = await healthResp.text().catch(() => '');
          setServiceNotice({
            kind: 'api',
            message: bodySnippet.includes('Starting Server...')
              ? 'Backend Express server is warming up. Please click Retry in a few seconds.'
              : 'Backend API returned a non-JSON response. Start the full-stack Express server (npm run dev / npm start) so /api/* routes resolve to JSON.',
          });
          return;
        }
      } catch (probeErr) {
        if (isAbortError(probeErr)) return;
      }

      if (err instanceof Error && err.message) {
        setServiceNotice({ kind: 'api', message: err.message });
      }
    }
  }, [dispatch]);

  useEffect(() => {
    const controller = new AbortController();
    loadNavigation(controller.signal);

    const handleNavUpdate = () => loadNavigation(controller.signal);
    window.addEventListener('novara:navigation-updated', handleNavUpdate);
    return () => {
      controller.abort();
      window.removeEventListener('novara:navigation-updated', handleNavUpdate);
    };
  }, [loadNavigation]);

  // Real session analytics tracking for Visitors (30d) dashboard KPI
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('novara_visit_sent')) return;
    let sessionKey = localStorage.getItem('novara_session_key');
    if (!sessionKey) {
      sessionKey = `vis-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('novara_session_key', sessionKey);
    }
    sessionStorage.setItem('novara_visit_sent', '1');
    fetch('/api/storefront/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionKey,
        path: location.pathname,
        referrer: document.referrer || undefined,
      }),
    }).catch(() => undefined);
  }, [location.pathname]);

  const activePopup = (settings?.promotionalPopups || []).find(
    (p) => p.isActive && isWithinScheduleWindow(p.startsAt, p.endsAt),
  );
  useEffect(() => {
    if (!activePopup || popupDismissed) return;
    const delayMs = Math.max(1000, Number(activePopup.delaySeconds ?? 5) * 1000);
    const timer = window.setTimeout(() => setPopupVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [activePopup, popupDismissed]);

  const maintenanceActive =
    Boolean(settings?.maintenanceMode?.enabled) &&
    !(settings?.securitySettings?.maintenanceBypassAdmin !== false && user && isStaffRole(user.role));

  if (maintenanceActive) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F8FC] px-4 text-center text-[#0F1D3A]">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E9F0FD] text-[#1155EE]">
            <Wrench className="h-6 w-6" />
          </div>
          <h1 className="font-display mt-4 text-2xl font-bold">
            {settings?.maintenanceMode?.title || 'Scheduled Store Maintenance'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {settings?.maintenanceMode?.message || 'We are performing scheduled upgrades and will be back shortly.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8FC] text-[#0F1D3A]">
      {serviceNotice && (
        <div role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-950">
          <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
              <span>{serviceNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => loadNavigation()}
              className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      <StoreHeader
        categories={categories}
        announcement={settings?.announcementBar}
        storeInfo={settings?.storeInfo}
        headerSettings={settings?.headerSettings}
        navigationMenu={settings?.navigationMenu}
        megaMenus={megaMenus}
        currencySettings={settings?.currencySettings}
      />
      <main className="flex-1">{children}</main>
      <StoreFooter
        contactInfo={settings?.contactInfo}
        footerSettings={settings?.footerSettings}
        storeInfo={settings?.storeInfo}
        paymentMethods={settings?.paymentMethods}
      />

      {activePopup && popupVisible && !popupDismissed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activePopup.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <button
              type="button"
              aria-label="Dismiss promotion"
              onClick={() => {
                setPopupDismissed(true);
                sessionStorage.setItem('novara_popup_dismissed', '1');
              }}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F0FD] px-3 py-1 text-xs font-bold text-[#1155EE]">
              <Sparkles className="h-3.5 w-3.5" /> Exclusive Offer
            </span>
            {activePopup.imageUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                <ResilientImage
                  src={activePopup.imageUrl}
                  alt={activePopup.title}
                  className="h-40 w-full object-cover"
                />
              </div>
            )}
            <h2 className="font-display mt-3 text-xl font-extrabold text-[#0F1D3A]">{activePopup.title}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{activePopup.subtitle}</p>
            {activePopup.couponCode && (
              <div className="mt-4 rounded-xl border border-dashed border-blue-300 bg-[#F6F8FC] px-4 py-2.5 text-center">
                <span className="text-xs text-slate-500">Use Promo Code: </span>
                <span className="font-mono-tabular font-extrabold text-[#1155EE]">{activePopup.couponCode}</span>
              </div>
            )}
            <Link
              to={activePopup.ctaUrl || '/offers'}
              onClick={() => {
                setPopupDismissed(true);
                sessionStorage.setItem('novara_popup_dismissed', '1');
              }}
              className="mt-5 block w-full rounded-xl bg-[#1155EE] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#0B44CC]"
            >
              {activePopup.ctaLabel || 'Claim Offer'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
