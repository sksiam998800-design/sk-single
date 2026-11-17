import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Copy,
  Flame,
  HelpCircle,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
} from 'lucide-react';
import { ApiError, apiRequest, isAbortError } from '../services/api';
import { useAppDispatch } from '../app/hooks';
import { showToast } from '../features/notifications/toastSlice';
import { ProductCard } from '../components/catalog/ProductCard';
import { ResilientImage } from '../components/ui/ResilientImage';
import type {
  BlogPostItem,
  DiscountRuleItem,
  FaqItem,
  HomepageConfigData,
  OrderRecord,
  ProductItem,
  PromotionalCampaignItem,
} from '../types/commerce';
import { useSeoMeta } from '../lib/useSeoMeta';

export function TrackOrderPage() {
  useSeoMeta({ title: 'Track Your Order | NOVARA COMMERCE' });
  const [orderNumber, setOrderNumber] = useState('');
  const [contact, setContact] = useState('');
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await apiRequest<{ ok: true; order: OrderRecord }>('/api/orders/track', {
        method: 'POST',
        body: JSON.stringify({ orderNumber, contact }),
      });
      setOrder(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to find matching order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#0F1D3A]">Track Your Order</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your NOVARA order number and the email or phone number used during checkout.
        </p>

        <form onSubmit={handleTrack} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Order Number *</label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="e.g. NVR-261116-A1B2C3"
              className="font-mono-tabular w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm uppercase"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Email or Phone Number *</label>
            <input
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email address or +880 phone number"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1155EE] py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC]"
          >
            <Search className="h-4 w-4" />
            <span>{loading ? 'Searching...' : 'Track Order'}</span>
          </button>
        </form>

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {order && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between">
              <span className="font-mono-tabular text-base font-bold text-[#0F1D3A]">{order.orderNumber}</span>
              <span className="rounded-lg bg-[#E9F0FD] px-3 py-1 text-xs font-bold uppercase text-[#1155EE]">
                {order.orderStatus.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Destination: {order.shippingAddress?.district}, {order.shippingAddress?.division} · Total: ৳{order.total.toLocaleString()}
            </p>
            <ul className="mt-4 space-y-2.5">
              {order.statusHistory.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold uppercase text-[#0F1D3A]">{step.toStatus.replace('_', ' ')}</p>
                    <p className="text-slate-500">{new Date(step.timestamp).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function ContactPage() {
  useSeoMeta({ title: 'Contact & Support | NOVARA COMMERCE' });
  const dispatch = useAppDispatch();

  const [contactInfo, setContactInfo] = useState<HomepageConfigData['contactInfo'] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ ok: true; settings: { contactInfo?: HomepageConfigData['contactInfo'] } | null }>('/api/storefront/navigation', {
      signal: controller.signal,
    })
      .then((res) => setContactInfo(res.settings?.contactInfo || null))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest<{ ok: true; ticketId: string; message: string }>('/api/storefront/support/enquiry', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, subject, orderNumber, message, websiteHoneyPot: honeypot }),
      });
      dispatch(showToast({ variant: 'success', message: `${res.message} (Ref: ${res.ticketId.slice(-6)})` }));
      setSubject('');
      setOrderNumber('');
      setMessage('');
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Unable to send enquiry' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1140px] px-4 py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <h1 className="font-display text-3xl font-bold text-[#0F1D3A]">Customer Support</h1>
          <p className="text-sm text-slate-600">
            Have a question about an order, product warranty, or delivery across Bangladesh? Send us an enquiry and our support team will assist you.
          </p>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[#1155EE]" />
              <span>{contactInfo?.email || 'support@novara.com.bd'}</span>
            </div>
            {contactInfo?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[#1155EE]" />
                <span>{contactInfo.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-[#1155EE]" />
              <span>{contactInfo?.address || 'Dhaka, Bangladesh'}</span>
            </div>
          </div>

          {(contactInfo?.whatsappUrl || contactInfo?.messengerUrl || contactInfo?.instagramUrl || contactInfo?.linkedinUrl) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-display mb-3 text-sm font-bold text-[#0F1D3A]">Official Channels</h2>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {contactInfo?.whatsappUrl && (
                  <a href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                    WhatsApp
                  </a>
                )}
                {contactInfo?.messengerUrl && (
                  <a href={contactInfo.messengerUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-50 px-3 py-2 text-[#1155EE]">
                    Messenger
                  </a>
                )}
                {contactInfo?.instagramUrl && (
                  <a href={contactInfo.instagramUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                    Instagram
                  </a>
                )}
                {contactInfo?.linkedinUrl && (
                  <a href={contactInfo.linkedinUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#1155EE]" />
            <h2 className="font-display text-lg font-bold text-[#0F1D3A]">Send a Support Enquiry</h2>
          </div>

          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name *" className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your Email *" className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number" className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            <input type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Order Number (optional)" className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
          </div>
          <input type="text" required minLength={3} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject *" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
          <textarea required minLength={10} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help you?" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />

          <button type="submit" disabled={submitting} className="rounded-xl bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC]">
            {submitting ? 'Submitting...' : 'Submit Enquiry'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function CmsStaticPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<{ title: string; content: string; seoTitle?: string; seoDescription?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeoMeta({
    title: page ? `${page.seoTitle || page.title} | NOVARA COMMERCE` : 'Information | NOVARA COMMERCE',
    description: page?.seoDescription,
  });

  const loadPage = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug) return;
      setLoading(true);
      setNotFound(false);
      setError(null);
      try {
        const res = await apiRequest<{ ok: true; page: { title: string; content: string; seoTitle?: string; seoDescription?: string } }>(
          `/api/storefront/pages/${slug}`,
          { signal },
        );
        setPage(res.page);
      } catch (err) {
        if (isAbortError(err)) return;
        setPage(null);
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load this page right now.');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadPage(controller.signal);
    return () => controller.abort();
  }, [loadPage]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-500">Loading page...</div>;
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs">
          <AlertTriangle className="mx-auto h-9 w-9 text-rose-500" />
          <h1 className="font-display mt-3 text-xl font-bold text-[#0F1D3A]">Unable to Load Page</h1>
          <p className="mt-1 text-sm text-rose-600">{error}</p>
          <button
            type="button"
            onClick={() => loadPage()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1155EE] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B44CC]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (notFound || !page) return <NotFoundPage />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <article className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-10">
        <h1 className="font-display text-2xl font-bold text-[#0F1D3A] sm:text-3xl">{page.title}</h1>
        <div className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-700">{page.content}</div>
      </article>
    </div>
  );
}

export function NotFoundPage() {
  useSeoMeta({ title: 'Page Not Found | NOVARA COMMERCE', noIndex: true });
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-mono-tabular text-4xl font-extrabold text-[#1155EE]">404</p>
      <h1 className="font-display mt-2 text-2xl font-bold text-[#0F1D3A]">Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-600">The page or product you requested does not exist or has been archived.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white">
        Return Home
      </Link>
    </div>
  );
}

interface OffersPayload {
  ok: true;
  campaigns: PromotionalCampaignItem[];
  coupons: Array<{
    id: string;
    code: string;
    description?: string;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    maxDiscountAmount?: number | null;
    minOrderAmount: number;
    endsAt?: string | null;
  }>;
  rules: DiscountRuleItem[];
  products: ProductItem[];
}

export function OffersPage() {
  useSeoMeta({
    title: 'Special Offers & Flash Sales | NOVARA COMMERCE',
    description: 'Explore verified NOVARA flash sales, coupon codes, and seasonal discounts across Bangladesh.',
  });
  const dispatch = useAppDispatch();
  const [data, setData] = useState<OffersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    apiRequest<OffersPayload>('/api/storefront/offers', { signal: controller.signal })
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setError(err instanceof Error ? err.message : 'Unable to load special offers right now.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => undefined);
    dispatch(showToast({ variant: 'success', message: `Copied coupon code ${code}! Apply it in your cart.` }));
  };

  return (
    <div className="mx-auto max-w-[1380px] space-y-8 px-4 py-8">
      <div className="rounded-2xl bg-gradient-to-r from-[#0B1730] via-[#11358C] to-[#1155EE] p-7 text-white shadow-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-amber-300">
          <Flame className="h-3.5 w-3.5" /> Exclusive NOVARA Deals
        </span>
        <h1 className="font-display mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Flash Sales, Coupons &amp; Special Offers
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-blue-100">
          Real-time promotions, verified promo codes, and automatic cart discount rules managed directly from NOVARA Operations.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-white p-6 text-center text-sm text-slate-600">{error}</div>
      ) : (
        <>
          {data?.campaigns && data.campaigns.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0F1D3A]">Active Campaigns &amp; Flash Sales</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {data.campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-xs"
                  >
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F0FD] px-2.5 py-0.5 text-[11px] font-bold text-[#1155EE]">
                        <Sparkles className="h-3 w-3" /> {camp.badgeText || camp.discountLabel}
                      </span>
                      <h3 className="font-display mt-2 text-lg font-bold text-[#0F1D3A]">{camp.title}</h3>
                      {camp.subtitle && <p className="mt-1 text-xs text-slate-600">{camp.subtitle}</p>}
                      <Link
                        to={camp.ctaUrl || '/shop?discount=true'}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#1155EE] hover:underline"
                      >
                        Shop Deal <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    {camp.bannerImageUrl && (
                      <ResilientImage src={camp.bannerImageUrl} alt={camp.title} className="h-24 w-28 shrink-0 rounded-xl object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data?.coupons && data.coupons.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0F1D3A]">Available Coupon Codes</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.coupons.map((c) => (
                  <div key={c.id} className="flex flex-col justify-between rounded-2xl border border-dashed border-blue-300 bg-white p-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-mono-tabular text-base font-extrabold text-[#1155EE]">
                          <Tag className="h-4 w-4" /> {c.code}
                        </span>
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `৳${c.discountValue} OFF`}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        {c.description || `Save on orders of ৳${c.minOrderAmount.toLocaleString()} or more.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCode(c.code)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#1155EE]/30 bg-[#E9F0FD] py-2 text-xs font-bold text-[#1155EE] hover:bg-blue-100"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy Code
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data?.rules && data.rules.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-display text-base font-bold text-[#0F1D3A]">Automatic Threshold &amp; Bulk Rules</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.rules.map((r) => (
                  <div key={r.id} className="rounded-xl bg-[#F6F8FC] p-3.5 text-xs">
                    <p className="font-bold text-[#0F1D3A]">{r.name}</p>
                    <p className="mt-1 text-slate-600">
                      Save {r.ruleType === 'fixed' ? `৳${r.value}` : `${r.value}%`} when ordering {r.minQty}+ items (min spend ৳{r.minSpend.toLocaleString()}).
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data?.products && data.products.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[#0F1D3A]">Price-Drop Picks</h2>
                <Link to="/shop?discount=true" className="text-xs font-semibold text-[#1155EE] hover:underline">
                  View All Deals →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {data.products.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            </section>
          )}

          {!data?.campaigns?.length && !data?.coupons?.length && !data?.products?.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No active promotions right now. Check back soon or explore the full shop!
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function BlogListPage() {
  useSeoMeta({
    title: 'NOVARA Journal & Buying Guides | NOVARA COMMERCE',
    description: 'Read buying guides, gadget reviews, and smart living tips from NOVARA COMMERCE.',
  });
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ ok: true; posts: BlogPostItem[] }>('/api/storefront/blogs', { signal: controller.signal })
      .then((res) => {
        setPosts(res.posts || []);
        setError(null);
      })
      .catch((err) => {
        if (!isAbortError(err)) setError(err instanceof Error ? err.message : 'Unable to load articles.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-10">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E9F0FD] px-3 py-1 text-xs font-bold text-[#1155EE]">
          <BookOpen className="h-3.5 w-3.5" /> NOVARA Journal
        </span>
        <h1 className="font-display mt-2 text-2xl font-bold text-[#0F1D3A] sm:text-3xl">Buying Guides &amp; Stories</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-white p-6 text-center text-sm text-slate-600">{error}</div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No published blog posts yet. Publish articles from Admin Content Management.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-md"
            >
              {post.coverImageUrl && (
                <div className="aspect-[16/9] bg-slate-100">
                  <ResilientImage src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <span className="w-fit rounded-md bg-[#E9F0FD] px-2 py-0.5 text-[11px] font-bold text-[#1155EE]">
                  {post.category}
                </span>
                <h2 className="font-display mt-2 text-base font-bold text-[#0F1D3A] group-hover:text-[#1155EE]">
                  {post.title}
                </h2>
                <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-600">{post.excerpt}</p>
                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{post.authorName}</span>
                  <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlogDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useSeoMeta({
    title: post ? `${post.seoTitle || post.title} | NOVARA Blog` : 'Article | NOVARA COMMERCE',
    description: post?.seoDescription || post?.excerpt,
  });

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setLoading(true);
    apiRequest<{ ok: true; post: BlogPostItem }>(`/api/storefront/blogs/${slug}`, { signal: controller.signal })
      .then((res) => {
        setPost(res.post);
        setNotFound(false);
      })
      .catch((err) => {
        if (!isAbortError(err)) setNotFound(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-500">Loading article...</div>;
  if (notFound || !post) return <NotFoundPage />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/blog" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1155EE] hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Journal
      </Link>
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {post.coverImageUrl && (
          <div className="aspect-[16/9] bg-slate-100">
            <ResilientImage src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-7 sm:p-10">
          <span className="rounded-md bg-[#E9F0FD] px-2.5 py-1 text-xs font-bold text-[#1155EE]">{post.category}</span>
          <h1 className="font-display mt-3 text-2xl font-extrabold text-[#0F1D3A] sm:text-3xl">{post.title}</h1>
          <p className="mt-2 text-xs text-slate-500">
            By {post.authorName} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}
          </p>
          <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-700">{post.content}</div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
              {post.tags.map((t: string) => (
                <span key={t} className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export function FaqPublicPage() {
  useSeoMeta({
    title: 'Frequently Asked Questions | NOVARA COMMERCE',
    description: 'Answers about delivery across Bangladesh, returns, warranty, and payments at NOVARA COMMERCE.',
  });
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ ok: true; faqs: FaqItem[] }>('/api/storefront/faqs', { signal: controller.signal })
      .then((res) => setFaqs(res.faqs || []))
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const categories = ['All', ...Array.from(new Set(faqs.map((f) => f.category)))];
  const filtered = category === 'All' ? faqs : faqs.filter((f) => f.category === category);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E9F0FD] px-3 py-1 text-xs font-bold text-[#1155EE]">
          <HelpCircle className="h-3.5 w-3.5" /> Help Center
        </span>
        <h1 className="font-display mt-2 text-2xl font-bold text-[#0F1D3A] sm:text-3xl">Frequently Asked Questions</h1>
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold ${
                category === cat ? 'bg-[#1155EE] text-white' : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm text-slate-500">Loading FAQs...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No published FAQs available right now. <Link to="/contact" className="text-[#1155EE] underline">Contact support</Link>.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((faq) => {
            const open = openId === faq.id;
            return (
              <div key={faq.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#1155EE]">{faq.category}</span>
                    <p className="mt-0.5 text-sm font-bold text-[#0F1D3A]">{faq.question}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && <div className="border-t border-slate-100 px-5 py-4 text-xs leading-relaxed text-slate-600">{faq.answer}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AboutPage() {
  useSeoMeta({ title: 'About Us | NOVARA COMMERCE' });
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ ok: true; page: { title: string; content: string } }>('/api/storefront/pages/about-us', {
      signal: controller.signal,
    })
      .then((res) => setPage(res.page))
      .catch(() => setPage(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <article className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-10">
        <h1 className="font-display text-2xl font-bold text-[#0F1D3A] sm:text-3xl">
          {page?.title || 'About NOVARA COMMERCE'}
        </h1>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading store profile...</p>
        ) : (
          <div className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {page?.content ||
              'NOVARA COMMERCE is a trusted Bangladesh technology, lifestyle, fashion, and home essentials marketplace delivering nationwide across all 8 divisions with transparent pricing and verified products.'}
          </div>
        )}
      </article>
    </div>
  );
}
