import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Headphones,
  Loader2,
  Mail,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { openAuthModal } from '../features/auth/authSlice';
import { clearCartAfterOrder } from '../features/cart/cartSlice';
import { showToast } from '../features/notifications/toastSlice';
import { apiRequest } from '../services/api';
import { formatStoreCurrency } from '../lib/dateTime';
import { canRetryOrderPayment } from '../lib/orderStateMachine';
import { useSeoMeta } from '../lib/useSeoMeta';
import { ResilientImage } from '../components/ui/ResilientImage';
import type { OrderRecord } from '../types/commerce';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
] as const;

function getStepIndex(orderStatus: OrderRecord['orderStatus']): number {
  if (orderStatus === 'packed') return 2;
  const idx = STATUS_STEPS.findIndex((s) => s.key === orderStatus);
  return idx >= 0 ? idx : 0;
}

function formatPaymentMethodLabel(method: OrderRecord['paymentMethod']): string {
  switch (method) {
    case 'cod':
      return 'Cash on Delivery (COD)';
    case 'bkash':
      return 'bKash';
    case 'nagad':
      return 'নগদ (Nagad)';
    case 'sslcommerz':
      return 'SSLCommerz Online Gateway';
    case 'card':
      return 'Visa / Mastercard';
    default:
      return String(method).toUpperCase();
  }
}

export function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, initialized } = useAppSelector((s) => s.auth);
  const { settings } = useAppSelector((s) => s.storefront);
  const currencyCfg = settings?.currencySettings;

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [retryMethod, setRetryMethod] = useState<'bkash' | 'nagad' | 'card' | 'sslcommerz'>('bkash');
  const [retryingPayment, setRetryingPayment] = useState(false);
  const cartClearedRef = useRef(false);

  const paymentCallbackStatus = searchParams.get('payment');
  const fromCheckout = Boolean((location.state as { fromCheckout?: boolean } | null)?.fromCheckout);

  useSeoMeta({
    title: order ? `Order ${order.orderNumber} | NOVARA COMMERCE` : 'Order Confirmation | NOVARA COMMERCE',
    noIndex: true,
  });

  const loadOrder = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ ok: true; order: OrderRecord }>(`/api/orders/${encodeURIComponent(id)}`);
      setOrder(res.order);
      if (res.order.paymentMethod !== 'cod') {
        setRetryMethod(res.order.paymentMethod);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load order details.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      setLoading(false);
      return;
    }
    if (!id) {
      setErrorMsg('Order ID is missing.');
      setLoading(false);
      return;
    }
    loadOrder();
  }, [id, user, initialized, loadOrder]);

  // Clear local cart once verified online payment succeeds
  useEffect(() => {
    if (!order || cartClearedRef.current) return;
    if (order.paymentMethod !== 'cod' && order.paymentStatus === 'paid') {
      cartClearedRef.current = true;
      dispatch(clearCartAfterOrder());
    }
  }, [order, dispatch]);

  const latestTx = order?.paymentTransactions?.find((t) => t.status === 'paid') || order?.paymentTransactions?.[0];

  const handleRefreshPaymentStatus = useCallback(async () => {
    if (!order) return;
    setRefreshingStatus(true);
    try {
      if (latestTx?.transactionId) {
        const res = await apiRequest<{ ok: true; order?: OrderRecord }>(
          `/api/payments/${encodeURIComponent(latestTx.transactionId)}/status`,
        );
        if (res.order) {
          setOrder(res.order);
        } else {
          await loadOrder();
        }
      } else {
        await loadOrder();
      }
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to refresh payment status.',
        }),
      );
    } finally {
      setRefreshingStatus(false);
    }
  }, [order, latestTx?.transactionId, loadOrder, dispatch]);

  // Bounded auto-polling when gateway redirect returned while verification is still pending
  useEffect(() => {
    if (!order || !latestTx?.transactionId) return;
    if (order.paymentMethod === 'cod') return;
    if (!['initiated', 'pending', 'authorized'].includes(order.paymentStatus)) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (attempts > 4) {
        window.clearInterval(timer);
        return;
      }
      apiRequest<{ ok: true; order?: OrderRecord }>(
        `/api/payments/${encodeURIComponent(latestTx.transactionId)}/status`,
      )
        .then((res) => {
          if (res.order) {
            setOrder(res.order);
            if (!['initiated', 'pending', 'authorized'].includes(res.order.paymentStatus)) {
              window.clearInterval(timer);
            }
          }
        })
        .catch(() => undefined);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [order, latestTx?.transactionId]);

  const handleRetryPayment = async () => {
    if (!order || retryingPayment) return;
    setRetryingPayment(true);
    try {
      const res = await apiRequest<{ ok: true; gatewayUrl?: string | null }>(
        `/api/orders/${encodeURIComponent(order.id)}/retry-payment`,
        {
          method: 'POST',
          body: JSON.stringify({ paymentMethod: retryMethod }),
        },
      );
      if (res.gatewayUrl) {
        window.location.href = res.gatewayUrl;
        return;
      }
      await loadOrder();
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to start payment session.',
        }),
      );
    } finally {
      setRetryingPayment(false);
    }
  };

  const confettiParticles = useMemo(
    () => [
      { left: '12%', delay: '40ms', color: '#1155EE' },
      { left: '24%', delay: '140ms', color: '#10B981' },
      { left: '36%', delay: '90ms', color: '#3B82F6' },
      { left: '64%', delay: '120ms', color: '#1155EE' },
      { left: '76%', delay: '50ms', color: '#F59E0B' },
      { left: '88%', delay: '170ms', color: '#10B981' },
    ],
    [],
  );

  const handleCopyOrderNumber = async () => {
    if (!order?.orderNumber) return;
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      dispatch(showToast({ variant: 'success', title: 'Order number copied', message: order.orderNumber }));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      dispatch(showToast({ variant: 'info', title: 'Order Number', message: order.orderNumber }));
    }
  };

  if (loading || !initialized) {
    return (
      <div className="min-h-[60vh] bg-[#F4F7FF] py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="rounded-3xl border border-[#DCE5F5] bg-white p-10 shadow-sm">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#1155EE]" />
            <p className="mt-4 text-sm font-semibold text-[#0F1D3A]">Loading your verified order confirmation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] bg-[#F4F7FF] py-16">
        <div className="mx-auto max-w-xl px-4">
          <div className="rounded-3xl border border-[#DCE5F5] bg-white p-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto h-11 w-11 text-[#1155EE]" />
            <h1 className="mt-4 font-display text-2xl font-bold text-[#0F1D3A]">Sign in to view your order</h1>
            <p className="mt-2 text-sm text-[#5A6C8B]">
              Order confirmations are protected by account ownership verification.
            </p>
            <button
              type="button"
              onClick={() =>
                dispatch(
                  openAuthModal({
                    tab: 'login',
                    returnUrl: `/order-success/${id || ''}`,
                    notice: 'Sign in with the account used to place this order.',
                  }),
                )
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC]"
            >
              Sign In to Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-[60vh] bg-[#F4F7FF] py-16">
        <div className="mx-auto max-w-xl px-4">
          <div className="rounded-3xl border border-[#DCE5F5] bg-white p-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto h-11 w-11 text-rose-500" />
            <h1 className="mt-4 font-display text-2xl font-bold text-[#0F1D3A]">Order Could Not Be Loaded</h1>
            <p className="mt-2 text-sm text-[#5A6C8B]">
              {errorMsg || 'This order either does not exist or belongs to another account.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/account/orders"
                className="rounded-xl bg-[#1155EE] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC]"
              >
                My Orders
              </Link>
              <Link
                to="/shop"
                className="rounded-xl border border-[#DCE5F5] bg-white px-5 py-2.5 text-sm font-semibold text-[#0F1D3A] hover:bg-slate-50"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isFailedOrCancelled =
    order.paymentStatus === 'failed' ||
    order.paymentStatus === 'cancelled' ||
    order.paymentStatus === 'expired' ||
    order.orderStatus === 'cancelled' ||
    paymentCallbackStatus === 'failed';

  const isPendingVerification =
    !isFailedOrCancelled &&
    order.paymentMethod !== 'cod' &&
    ['initiated', 'pending', 'authorized'].includes(order.paymentStatus);

  const retryEligible = canRetryOrderPayment({
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
  });

  const currentStepIdx = getStepIndex(order.orderStatus);
  const verifiedTx = latestTx;

  const paymentBadgeInfo = (() => {
    if (order.paymentStatus === 'paid') {
      return {
        label: 'Payment Verified & Paid',
        cls: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    }
    if (order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded') {
      return {
        label: order.paymentStatus === 'refunded' ? 'Payment Refunded' : 'Partially Refunded',
        cls: 'border-slate-200 bg-slate-100 text-slate-700',
      };
    }
    if (isFailedOrCancelled) {
      return {
        label:
          order.paymentStatus === 'cancelled'
            ? 'Payment Cancelled'
            : order.paymentStatus === 'expired'
              ? 'Payment Session Expired'
              : 'Payment Failed',
        cls: 'border-rose-200 bg-rose-50 text-rose-700',
      };
    }
    if (order.paymentMethod === 'cod') {
      return {
        label: 'Cash on Delivery — Pay Upon Receipt',
        cls: 'border-blue-200 bg-blue-50 text-[#1155EE]',
      };
    }
    return {
      label: 'Awaiting Gateway Verification',
      cls: 'border-amber-200 bg-amber-50 text-amber-800',
    };
  })();

  return (
    <div className="min-h-screen bg-[#F4F7FF] py-8 sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-6">
        {/* Hero Confirmation Banner Card */}
        <section className="relative overflow-hidden rounded-3xl border border-[#DCE5F5] bg-white p-6 sm:p-9 shadow-[0_12px_36px_-14px_rgba(15,29,58,0.1)]">
          {!isFailedOrCancelled && !isPendingVerification && fromCheckout && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20 overflow-hidden">
              {confettiParticles.map((p, idx) => (
                <span
                  key={idx}
                  className="novara-confetti-piece absolute top-2 h-2.5 w-2 rounded-xs"
                  style={{ left: p.left, backgroundColor: p.color, animationDelay: p.delay }}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col items-center text-center">
            {isFailedOrCancelled ? (
              <div className="novara-success-pop flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 border-4 border-rose-100 text-rose-600">
                <AlertTriangle className="h-10 w-10" />
              </div>
            ) : isPendingVerification ? (
              <div className="novara-success-pop flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 border-4 border-amber-100 text-amber-600">
                <Clock className="h-10 w-10" />
              </div>
            ) : (
              <div className="novara-success-pop flex h-20 w-20 items-center justify-center rounded-full bg-[#EAF2FF] border-4 border-[#CFE0FC] text-[#1155EE] shadow-sm">
                <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" aria-hidden="true">
                  <circle cx="24" cy="24" r="21" fill="#1155EE" />
                  <path
                    d="M15 24.5L21 30.5L33.5 18"
                    stroke="#FFFFFF"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="novara-check-draw"
                  />
                </svg>
              </div>
            )}

            <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-bold ${paymentBadgeInfo.cls}`}>
              {isFailedOrCancelled ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : isPendingVerification ? (
                <Clock className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {paymentBadgeInfo.label}
            </span>

            <h1 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0F1D3A]">
              {isFailedOrCancelled
                ? 'Order Payment Could Not Be Completed'
                : isPendingVerification
                  ? 'Verifying Your Payment With Gateway'
                  : 'Thank You! Your Order Is Confirmed'}
            </h1>
            <p className="mt-2 max-w-xl text-sm sm:text-[15px] text-[#536586]">
              {isFailedOrCancelled
                ? verifiedTx?.failureReason ||
                  order.cancellationReason ||
                  'Your online payment was not verified. No funds were captured—you can retry payment or switch payment methods below.'
                : isPendingVerification
                  ? 'We are awaiting final confirmation from the payment gateway. This usually finishes within seconds.'
                  : `We've received your order and queued it for dispatch preparation.`}
            </p>

            {/* Retry / Complete Payment Panel */}
            {(retryEligible || isPendingVerification) && order.paymentMethod !== 'cod' && (
              <div className="mt-5 w-full max-w-xl rounded-2xl border border-[#C7DAFD] bg-[#F4F8FF] p-4 text-left print-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-[#0F1D3A]">
                    {isPendingVerification ? 'Still awaiting confirmation?' : 'Complete or Retry Online Payment'}
                  </div>
                  {isPendingVerification && (
                    <button
                      type="button"
                      disabled={refreshingStatus}
                      onClick={handleRefreshPaymentStatus}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#1155EE] bg-white px-3 py-1.5 text-xs font-semibold text-[#1155EE] hover:bg-blue-50 disabled:opacity-60"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
                      Refresh Status
                    </button>
                  )}
                </div>

                {retryEligible && (
                  <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                    <select
                      value={retryMethod}
                      onChange={(e) => setRetryMethod(e.target.value as typeof retryMethod)}
                      aria-label="Choose online payment method"
                      className="h-10 flex-1 rounded-xl border border-[#DCE5F5] bg-white px-3 text-xs font-semibold text-[#0F1D3A]"
                    >
                      <option value="bkash">bKash</option>
                      <option value="nagad">নগদ (Nagad)</option>
                      <option value="card">Visa / Mastercard</option>
                      <option value="sslcommerz">SSLCommerz All Channels</option>
                    </select>
                    <button
                      type="button"
                      disabled={retryingPayment}
                      onClick={handleRetryPayment}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1155EE] px-5 text-xs font-bold text-white hover:bg-[#0B44CC] disabled:opacity-60"
                    >
                      <CreditCard className="h-4 w-4" />
                      {retryingPayment ? 'Redirecting...' : 'Pay Now via Gateway'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5F5] bg-[#F7FAFF] px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#5A6C8B]">Order #</span>
                <span className="font-mono-tabular text-sm sm:text-base font-extrabold text-[#0F1D3A]">
                  {order.orderNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyOrderNumber}
                  aria-label="Copy order number"
                  className="ml-1 rounded-md p-1 text-[#1155EE] hover:bg-blue-100/70 print-hidden"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              {order.customerEmail && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5F5] bg-[#F7FAFF] px-4 py-2 text-xs sm:text-sm text-[#425577]">
                  <Mail className="h-4 w-4 text-[#1155EE]" />
                  <span>
                    Notifications sent to <strong className="text-[#0F1D3A]">{order.customerEmail}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Action Toolbar */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 print-hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5F5] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1D3A] shadow-xs transition hover:border-[#1155EE] hover:text-[#1155EE]"
              >
                <Printer className="h-4 w-4" />
                Print / Save Invoice
              </button>
              <Link
                to={`/account/orders/${order.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5F5] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1D3A] shadow-xs transition hover:border-[#1155EE] hover:text-[#1155EE]"
              >
                <Package className="h-4 w-4" />
                View Order Details
              </Link>
              <Link
                to="/track-order"
                className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5F5] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1D3A] shadow-xs transition hover:border-[#1155EE] hover:text-[#1155EE]"
              >
                <Truck className="h-4 w-4" />
                Track My Order
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1155EE] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-[#0B44CC]"
              >
                <ShoppingBag className="h-4 w-4" />
                Continue Shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Order Progress Tracker */}
        {order.orderStatus !== 'cancelled' && order.orderStatus !== 'returned' && (
          <section className="rounded-2xl border border-[#DCE5F5] bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <h2 className="font-display text-base sm:text-lg font-bold text-[#0F1D3A]">
                Live Order Status &amp; Estimated Delivery
              </h2>
              <span className="rounded-full bg-[#EAF2FF] px-3 py-1 text-xs font-bold text-[#1155EE]">
                {order.deliveryEta || (order.deliveryMethod === 'express' ? 'Within 1–2 Business Days' : 'Within 2–5 Business Days')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {STATUS_STEPS.map((step, idx) => {
                const completed = idx <= currentStepIdx;
                const current = idx === currentStepIdx;
                return (
                  <div
                    key={step.key}
                    className={`relative rounded-xl border p-3 transition ${
                      current
                        ? 'border-[#1155EE] bg-[#F4F8FF]'
                        : completed
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-[#E6ECF8] bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          completed
                            ? current
                              ? 'bg-[#1155EE] text-white'
                              : 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {completed && !current ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                      <span className={`text-xs font-bold ${completed ? 'text-[#0F1D3A]' : 'text-slate-500'}`}>
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Details Grid: Items & Totals + Delivery & Payment */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 rounded-2xl border border-[#DCE5F5] bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#EBF0FA] pb-3.5">
              <h2 className="font-display text-lg font-bold text-[#0F1D3A]">Items Ordered ({order.items.length})</h2>
              <span className="text-xs font-medium text-[#5A6C8B]">
                Placed {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="divide-y divide-[#EFF4FC]">
              {order.items.map((item, idx) => {
                const variantMeta = item.variantOptions
                  ? Object.values(item.variantOptions).filter(Boolean).join(' • ')
                  : '';
                return (
                  <div key={`${item.productId}-${idx}`} className="flex items-center gap-3.5 py-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E4EAF5] bg-[#F8FAFF] p-1">
                      <ResilientImage
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/product/${item.slug}`}
                        className="block truncate text-sm font-bold text-[#0F1D3A] hover:text-[#1155EE]"
                      >
                        {item.name}
                      </Link>
                      {variantMeta && <p className="mt-0.5 text-xs text-[#64748B]">{variantMeta}</p>}
                      <p className="mt-1 font-mono-tabular text-xs text-[#475569]">
                        {formatStoreCurrency(item.unitPrice, currencyCfg)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right font-mono-tabular text-sm font-bold text-[#0F1D3A]">
                      {formatStoreCurrency(item.lineTotal, currencyCfg)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 space-y-2 border-t border-[#EBF0FA] pt-4 text-sm">
              <div className="flex justify-between text-[#475569]">
                <span>Subtotal</span>
                <span className="font-mono-tabular font-semibold text-[#0F1D3A]">
                  {formatStoreCurrency(order.subtotal, currencyCfg)}
                </span>
              </div>
              <div className="flex justify-between text-[#475569]">
                <span>Delivery Charge ({order.deliveryMethodName || order.deliveryMethod})</span>
                <span className="font-mono-tabular font-semibold text-[#0F1D3A]">
                  {order.shippingCharge === 0 ? 'FREE' : formatStoreCurrency(order.shippingCharge, currencyCfg)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span className="font-mono-tabular font-semibold">
                    -{formatStoreCurrency(order.discount, currencyCfg)}
                  </span>
                </div>
              )}
              {order.tax > 0 && (
                <div className="flex justify-between text-[#475569]">
                  <span>VAT / Tax</span>
                  <span className="font-mono-tabular font-semibold text-[#0F1D3A]">
                    {formatStoreCurrency(order.tax, currencyCfg)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[#EBF0FA] pt-3">
                <span className="text-base font-bold text-[#0F1D3A]">Total Amount</span>
                <span className="font-mono-tabular text-xl font-extrabold text-[#1155EE]">
                  {formatStoreCurrency(order.total, currencyCfg)}
                </span>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-[#DCE5F5] bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-[#0F1D3A]">
                <MapPin className="h-4 w-4 text-[#1155EE]" />
                <h3 className="font-display text-base font-bold">Shipping Address</h3>
              </div>
              <div className="mt-3 space-y-1 text-sm text-[#425577]">
                <p className="font-bold text-[#0F1D3A]">{order.shippingAddress.recipientName}</p>
                <p>{order.shippingAddress.phone}</p>
                <p>{order.shippingAddress.email || order.customerEmail}</p>
                <p className="pt-1 text-[#0F1D3A]">
                  {order.shippingAddress.house}
                  {order.shippingAddress.road ? `, ${order.shippingAddress.road}` : ''}
                </p>
                <p>
                  {order.shippingAddress.area}, {order.shippingAddress.upazila}, {order.shippingAddress.district},{' '}
                  {order.shippingAddress.division}
                  {order.shippingAddress.postalCode ? ` - ${order.shippingAddress.postalCode}` : ''}
                </p>
                {order.shippingAddress.deliveryInstructions && (
                  <p className="mt-2 rounded-lg bg-[#F7FAFF] p-2 text-xs text-[#536586]">
                    Note: {order.shippingAddress.deliveryInstructions}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#DCE5F5] bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-[#0F1D3A]">
                <CreditCard className="h-4 w-4 text-[#1155EE]" />
                <h3 className="font-display text-base font-bold">Payment &amp; Fulfillment</h3>
              </div>
              <div className="mt-3 space-y-2 text-sm text-[#425577]">
                <div className="flex justify-between gap-2">
                  <span>Payment Method</span>
                  <span className="font-semibold text-[#0F1D3A]">
                    {formatPaymentMethodLabel(order.paymentMethod)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Payment Status</span>
                  <span className="font-semibold uppercase text-[#0F1D3A]">{order.paymentStatus.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Delivery Option</span>
                  <span className="font-semibold text-[#0F1D3A]">
                    {order.deliveryMethodName || (order.deliveryMethod === 'express' ? 'Priority Express' : 'Standard Delivery')}
                  </span>
                </div>
                {verifiedTx?.transactionId && (
                  <div className="flex justify-between gap-2 pt-1 border-t border-[#EFF4FC] text-xs">
                    <span>Transaction Ref</span>
                    <span className="font-mono-tabular font-semibold text-[#0F1D3A]">
                      {verifiedTx.transactionId}
                    </span>
                  </div>
                )}
                {(verifiedTx?.gatewayTransactionId || verifiedTx?.bankTransactionId) && (
                  <div className="flex justify-between gap-2 text-xs">
                    <span>Gateway Trx ID</span>
                    <span className="font-mono-tabular font-semibold text-[#0F1D3A]">
                      {verifiedTx.gatewayTransactionId || verifiedTx.bankTransactionId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#CFE0FC] bg-gradient-to-br from-[#E2EDFE] to-[#F5F9FF] p-5 print-hidden">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1155EE] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="font-display text-sm font-bold text-[#0F1D3A]">Need Help With This Order?</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[#425577]">
                    Our customer care team is available 24/7 for delivery changes, invoice help, or 7-day return support.
                  </p>
                  <Link
                    to="/contact"
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#1155EE] hover:underline"
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    Contact Support →
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
