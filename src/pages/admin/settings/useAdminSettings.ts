import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';

import type { ProductTrustHighlightItem } from '../../../types/commerce';

export interface AdminSettingsConfig {
  storeInfo?: {
    storeName?: string;
    tagline?: string;
    description?: string;
    logoUrl?: string;
    faviconUrl?: string;
    supportPhone?: string;
    supportEmail?: string;
  };
  currencySettings?: {
    code?: string;
    symbol?: string;
    position?: 'prefix' | 'suffix';
  };
  announcementBar?: {
    enabled?: boolean;
    text?: string;
    linkText?: string;
    linkUrl?: string;
  };
  headerSettings?: {
    showSearch?: boolean;
    showWishlist?: boolean;
    showCategoryMenu?: boolean;
    stickyHeader?: boolean;
    specialOfferLabel?: string;
    specialOfferUrl?: string;
  };
  footerSettings?: {
    description?: string;
    tagline?: string;
    copyrightText?: string;
    storeStatus?: 'live' | 'maintenance';
    columns?: Array<{ title: string; links: Array<{ label: string; url: string }> }>;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
    whatsappUrl?: string;
    messengerUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
    facebookUrl?: string;
    youtubeUrl?: string;
    xUrl?: string;
    tiktokUrl?: string;
  };
  seoDefaults?: {
    siteName?: string;
    defaultTitle?: string;
    defaultDescription?: string;
  };
  paymentMethods?: {
    codEnabled?: boolean;
    sslcommerzEnabled?: boolean;
    bkashEnabled?: boolean;
    nagadEnabled?: boolean;
    cardEnabled?: boolean;
    codMaxAmount?: number;
    codInstructions?: string;
  };
  shippingSettings?: {
    dhakaMetroCharge?: number;
    dhakaSuburbCharge?: number;
    nationwideCharge?: number;
    freeShippingThreshold?: number;
    expressSurcharge?: number;
  };
  deliveryZones?: Array<{
    name: string;
    divisions: string[];
    charge: number;
    freeAbove: number;
    estimatedDays: string;
    isActive: boolean;
  }>;
  deliveryOptions?: Array<{
    code: string;
    name: string;
    description: string;
    estimatedTime: string;
    methodType: 'standard' | 'express';
    surcharge: number;
    freeShippingEligible: boolean;
    isActive: boolean;
    sortOrder: number;
    divisions?: string[];
  }>;
  taxSettings?: {
    enabled?: boolean;
    label?: string;
    ratePercent?: number;
    inclusive?: boolean;
  };
  emailSettings?: {
    senderName?: string;
    senderEmail?: string;
    replyTo?: string;
    orderConfirmationSubject?: string;
    shippingUpdateSubject?: string;
  };
  notificationSettings?: {
    lowStockAlert?: boolean;
    newOrderAlert?: boolean;
    newReviewAlert?: boolean;
    newEnquiryAlert?: boolean;
    lowStockThresholdDefault?: number;
  };
  securitySettings?: {
    requireEmailVerification?: boolean;
    sessionTimeoutHours?: number;
    maxLoginAttempts?: number;
    maintenanceBypassAdmin?: boolean;
  };
  maintenanceMode?: {
    enabled?: boolean;
    title?: string;
    message?: string;
  };
  productTrustHighlights?: ProductTrustHighlightItem[];
}

export function useAdminSettings() {
  const dispatch = useAppDispatch();
  const [config, setConfig] = useState<AdminSettingsConfig | null>(null);
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{
        ok: true;
        config: AdminSettingsConfig;
        integrations?: Record<string, boolean>;
      }>('/api/admin/settings');
      setConfig(res.config || {});
      setIntegrations(res.integrations || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load store settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savePatch = async (patch: Partial<AdminSettingsConfig>, successMessage = 'Settings saved successfully.') => {
    setSaving(true);
    try {
      const res = await apiRequest<{ ok: true; config: AdminSettingsConfig }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      setConfig(res.config);
      dispatch(showToast({ variant: 'success', message: successMessage }));
      return true;
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Save failed.' }));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { config, integrations, loading, saving, error, load, savePatch };
}
