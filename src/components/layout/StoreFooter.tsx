import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Mail, MapPin, Phone, ShoppingBag } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../features/notifications/toastSlice';
import { AdminFooterLoginModal } from '../../features/auth/AdminFooterLoginModal';
import type { HomepageConfigData } from '../../types/commerce';

interface StoreFooterProps {
  contactInfo?: HomepageConfigData['contactInfo'];
  footerSettings?: HomepageConfigData['footerSettings'];
  storeInfo?: HomepageConfigData['storeInfo'];
  paymentMethods?: HomepageConfigData['paymentMethods'];
}

export function StoreFooter({ contactInfo, footerSettings, storeInfo, paymentMethods }: StoreFooterProps) {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiRequest<{ ok: true; message: string }>('/api/storefront/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      dispatch(showToast({ variant: 'success', message: res.message }));
      setEmail('');
    } catch (err) {
      dispatch(
        showToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Unable to subscribe right now.',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const defaultColumns = [
    {
      title: 'Quick Links',
      links: [
        { label: 'Home', url: '/' },
        { label: 'Shop', url: '/shop' },
        { label: 'Special Offers', url: '/offers' },
        { label: 'Journal & Guides', url: '/blog' },
        { label: 'About Us', url: '/about' },
      ],
    },
    {
      title: 'Customer Care',
      links: [
        { label: 'FAQs', url: '/faqs' },
        { label: 'Shipping Info', url: '/pages/shipping-info' },
        { label: 'Return Policy', url: '/pages/return-policy' },
        { label: 'Track Order', url: '/track-order' },
        { label: 'Contact', url: '/contact' },
      ],
    },
  ];
  const dynamicColumns =
    footerSettings?.columns && footerSettings.columns.length > 0
      ? footerSettings.columns.slice(0, 2)
      : defaultColumns;

  const showCardBadges =
    !paymentMethods || paymentMethods.cardEnabled !== false || paymentMethods.sslcommerzEnabled !== false;
  const showBkashBadge =
    !paymentMethods || paymentMethods.bkashEnabled !== false || paymentMethods.sslcommerzEnabled !== false;
  const showCodBadge = !paymentMethods || paymentMethods.codEnabled !== false;

  return (
    <footer className="mt-12">
      {/* Newsletter Subscription Band (Royal Blue) */}
      <section className="bg-gradient-to-r from-[#0C3CAE] via-[#1155EE] to-[#0B359E] text-white">
        <div className="mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-6 px-4 py-7 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Subscribe to Our Newsletter</h2>
              <p className="text-xs text-blue-100">Get the latest updates, offers and more.</p>
            </div>
          </div>

          <form onSubmit={handleSubscribe} className="flex w-full max-w-lg items-center gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              aria-label="Newsletter email address"
              className="h-11 flex-1 rounded-lg bg-white px-4 text-sm text-[#0F1D3A] placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-[#1D6BFF] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0B44CC] disabled:opacity-60"
            >
              <span>{submitting ? 'Saving...' : 'Subscribe'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Main Dark Navy Footer */}
      <div className="bg-[#0B1730] text-slate-300">
        <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Link to="/" className="flex items-center gap-2 text-white">
              {storeInfo?.logoUrl ? (
                <img
                  src={storeInfo.logoUrl}
                  alt={storeInfo.storeName || 'NOVARA'}
                  className="h-8 w-8 rounded-lg object-contain bg-white p-0.5"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1155EE]">
                  <ShoppingBag className="h-4 w-4" />
                </span>
              )}
              <span className="font-display text-lg font-extrabold tracking-tight">
                {storeInfo?.storeName ? storeInfo.storeName.split(' ')[0] : 'NOVARA'}
              </span>
            </Link>
            <p className="mt-3 text-xs font-semibold text-white">
              {footerSettings?.tagline || storeInfo?.tagline || 'Shop Smart. Live Better.'}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              {footerSettings?.description ||
                storeInfo?.description ||
                'Your trusted online shopping destination in Bangladesh for genuine technology, fashion, books, and lifestyle goods.'}
            </p>
            {footerSettings?.storeStatus === 'maintenance' && (
              <p className="mt-2 inline-block rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                Maintenance Notice Active
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {contactInfo?.facebookUrl && (
                <a href={contactInfo.facebookUrl} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-2.5 py-1 hover:bg-white/20">
                  Facebook
                </a>
              )}
              {contactInfo?.youtubeUrl && (
                <a href={contactInfo.youtubeUrl} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-2.5 py-1 hover:bg-white/20">
                  YouTube
                </a>
              )}
              {contactInfo?.xUrl && (
                <a href={contactInfo.xUrl} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-2.5 py-1 hover:bg-white/20">
                  X
                </a>
              )}
              {contactInfo?.instagramUrl && (
                <a href={contactInfo.instagramUrl} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-2.5 py-1 hover:bg-white/20">
                  Instagram
                </a>
              )}
              {contactInfo?.linkedinUrl && (
                <a href={contactInfo.linkedinUrl} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-2.5 py-1 hover:bg-white/20">
                  LinkedIn
                </a>
              )}
              {contactInfo?.tiktokUrl && (
                <a href={contactInfo.tiktokUrl} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-2.5 py-1 hover:bg-white/20">
                  TikTok
                </a>
              )}
              {contactInfo?.whatsappUrl && (
                <a href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-2.5 py-1 hover:bg-white/20">
                  WhatsApp
                </a>
              )}
              {contactInfo?.messengerUrl && (
                <a href={contactInfo.messengerUrl} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-2.5 py-1 hover:bg-white/20">
                  Messenger
                </a>
              )}
            </div>
          </div>

          {dynamicColumns.map((col, colIdx) => (
            <div key={`${col.title}-${colIdx}`}>
              <h3 className="font-display text-sm font-bold text-white">{col.title}</h3>
              <ul className="mt-3 space-y-2 text-xs">
                {(col.links || []).map((link, linkIdx) => (
                  <li key={`${link.url}-${linkIdx}`}>
                    <Link to={link.url || '/'} className="hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="font-display text-sm font-bold text-white">Get In Touch</h3>
            <ul className="mt-3 space-y-2.5 text-xs">
              {(contactInfo?.phone || storeInfo?.supportPhone) && (
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>{contactInfo?.phone || storeInfo?.supportPhone}</span>
                </li>
              )}
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>{contactInfo?.email || storeInfo?.supportEmail || 'support@novara.com.bd'}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>{contactInfo?.address || 'Dhaka, Bangladesh'}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-white">Secure Payments</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
              {showCardBadges && (
                <>
                  <span className="rounded bg-white px-2.5 py-1 text-[#1A1F71]">VISA</span>
                  <span className="rounded bg-white px-2.5 py-1 text-[#EB001B]">Mastercard</span>
                </>
              )}
              {showBkashBadge && (
                <span className="rounded bg-[#E2136E] px-2.5 py-1 text-white">bKash</span>
              )}
              {showCodBadge && (
                <span className="rounded bg-emerald-600 px-2.5 py-1 text-white">COD</span>
              )}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Verified SSL-encrypted checkout and Cash on Delivery across Bangladesh.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="border-t border-white/10 bg-[#071024] text-slate-400">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-2 px-4 py-3.5 text-xs sm:flex-row">
          <p>{footerSettings?.copyrightText || `© ${new Date().getFullYear()} NOVARA COMMERCE. All Rights Reserved.`}</p>
          <div className="flex items-center gap-4">
            <Link to="/pages/privacy-policy" className="hover:text-white">Privacy Policy</Link>
            <span aria-hidden="true">|</span>
            <Link to="/pages/terms" className="hover:text-white">Terms &amp; Conditions</Link>
            <span aria-hidden="true">|</span>
            <a href="/sitemap.xml" className="hover:text-white">Sitemap</a>
            <button
              type="button"
              onClick={() => setAdminLoginOpen(true)}
              aria-label="Admin Portal Login"
              title="Staff Portal"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 opacity-35 transition-opacity hover:bg-white/10 hover:text-white hover:opacity-100 focus:opacity-100 focus-visible:outline-2 focus-visible:outline-[#145CFF]"
            >
              <Lock className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <AdminFooterLoginModal open={adminLoginOpen} onClose={() => setAdminLoginOpen(false)} />
    </footer>
  );
}
