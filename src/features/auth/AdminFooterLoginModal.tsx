import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck, X } from 'lucide-react';
import { apiRequest, setAuthToken } from '../../services/api';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setUserProfile } from './authSlice';
import { mergeGuestCartOnLogin } from '../cart/cartSlice';
import { showToast } from '../notifications/toastSlice';
import { isStaffRole } from '../../lib/rbac';
import type { UserProfile } from '../../types/commerce';

interface AdminFooterLoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdminFooterLoginModal({ open, onClose }: AdminFooterLoginModalProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);

  const titleId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      emailInputRef.current?.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const alreadyStaff = Boolean(user && isStaffRole(user.role));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid administrator email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your administrator password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ ok: true; user: UserProfile; token?: string }>('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      if (res.token) setAuthToken(res.token);
      dispatch(setUserProfile(res.user));
      await dispatch(mergeGuestCartOnLogin());
      dispatch(showToast({ variant: 'success', message: `Signed in as ${res.user.name}.` }));
      setPassword('');
      onClose();
      navigate('/admin/dashboard');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to authenticate administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#061228]/60 p-4 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#DCE6F7] bg-white shadow-2xl"
      >
        {/* Top Navy Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#071B3A] via-[#0B2249] to-[#11336C] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#145CFF] shadow-md shadow-blue-600/30">
              <Lock className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 id={titleId} className="font-display text-base font-bold leading-tight">
                NOVARA Admin Access
              </h2>
              <p className="text-[11px] text-blue-200/80">Authorized Staff &amp; Management Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close admin login modal"
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {alreadyStaff && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-emerald-800">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Active staff session: {user?.email}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/admin/dashboard');
                }}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
              >
                <span>Open Admin Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            <div>
              <label htmlFor="admin-footer-email" className="block text-xs font-semibold text-[#101B35]">
                Staff Email
              </label>
              <input
                ref={emailInputRef}
                id="admin-footer-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@novara.com"
                className="mt-1 h-10 w-full rounded-xl border border-[#DCE5F4] bg-[#F8FAFF] px-3.5 text-sm text-[#101B35] placeholder:text-slate-400 focus:border-[#145CFF] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-footer-password" className="block text-xs font-semibold text-[#101B35]">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="admin-footer-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter staff password"
                  className="h-10 w-full rounded-xl border border-[#DCE5F4] bg-[#F8FAFF] pl-3.5 pr-10 text-sm text-[#101B35] placeholder:text-slate-400 focus:border-[#145CFF] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-[#145CFF]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-[#DCE5F4] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-[#0E47D9] disabled:opacity-60"
              >
                <span>{submitting ? 'Signing In...' : 'Sign In to Admin'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
