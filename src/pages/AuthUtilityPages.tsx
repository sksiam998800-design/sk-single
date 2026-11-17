import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Lock, Mail, RefreshCw, XCircle } from 'lucide-react';
import { useAppDispatch } from '../app/hooks';
import { completeOAuthSession } from '../features/auth/authSlice';
import { showToast } from '../features/notifications/toastSlice';
import { apiRequest } from '../services/api';
import type { UserProfile } from '../types/commerce';
import { validateConfirmPassword, validateEmailAddress, validatePasswordStrength } from '../lib/authValidation';
import { useSeoMeta } from '../lib/useSeoMeta';

export function VerifyEmailPage() {
  useSeoMeta({ title: 'Verify Email | NOVARA COMMERCE', noIndex: true });
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'idle'>(
    token && emailParam ? 'verifying' : 'idle',
  );
  const [message, setMessage] = useState<string>('');
  const [resendEmail, setResendEmail] = useState(emailParam);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token || !emailParam) return;
    setStatus('verifying');
    apiRequest<{ ok: true; user: UserProfile; token?: string; message?: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email: emailParam, token }),
    })
      .then(async (res) => {
        await dispatch(completeOAuthSession({ user: res.user, token: res.token }));
        setStatus('success');
        setMessage(res.message || 'Your email address has been verified.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification link is invalid or has expired.');
      });
  }, [dispatch, emailParam, token]);

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateEmailAddress(resendEmail);
    if (err) {
      dispatch(showToast({ variant: 'error', message: err }));
      return;
    }
    setResending(true);
    try {
      const res = await apiRequest<{ ok: true; message: string }>('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail }),
      });
      dispatch(showToast({ variant: 'success', message: res.message }));
    } catch (error) {
      dispatch(
        showToast({
          variant: 'warning',
          message: error instanceof Error ? error.message : 'Unable to send verification email.',
        }),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-[24px] border border-white/90 bg-white p-8 shadow-[0_26px_70px_-18px_rgba(17,85,238,0.20)] text-center space-y-4">
        <Link to="/" className="font-display inline-block text-xl font-extrabold tracking-tight text-[#0F1D3A]">
          NOVARA
        </Link>
        {status === 'verifying' && (
          <>
            <RefreshCw className="mx-auto h-10 w-10 animate-spin text-[#1155EE]" />
            <h1 className="font-display text-2xl font-bold text-[#0F1D3A]">Verifying your email...</h1>
            <p className="text-sm text-slate-600">Please wait while we activate your NOVARA COMMERCE account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="font-display text-2xl font-bold text-[#0F1D3A]">Email Verified!</h1>
            <p className="text-sm text-slate-600">{message}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/account')}
                className="rounded-xl bg-[#1155EE] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC]"
              >
                Go to My Account
              </button>
              <Link
                to="/shop"
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-[#0F1D3A] hover:bg-slate-50"
              >
                Explore Products
              </Link>
            </div>
          </>
        )}

        {(status === 'error' || status === 'idle') && (
          <>
            {status === 'error' ? (
              <XCircle className="mx-auto h-12 w-12 text-rose-500" />
            ) : (
              <Mail className="mx-auto h-12 w-12 text-[#1155EE]" />
            )}
            <h1 className="font-display text-2xl font-bold text-[#0F1D3A]">
              {status === 'error' ? 'Verification Link Expired or Invalid' : 'Verify Your Email Address'}
            </h1>
            <p className="text-sm text-slate-600">
              {message || 'Enter your registered email address below to request a new verification link.'}
            </p>
            <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
              <input
                type="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#DCE7FB] bg-[#FBFCFF] px-3.5 py-2.5 text-sm focus:border-[#1155EE] focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={resending}
                className="w-full rounded-xl bg-[#1155EE] py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC] disabled:opacity-60"
              >
                {resending ? 'Sending link...' : 'Resend Verification Email'}
              </button>
            </form>
            <p className="pt-2 text-xs text-slate-500">
              Ready to sign in?{' '}
              <Link to="/login" className="font-semibold text-[#1155EE] hover:underline">
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  useSeoMeta({ title: 'Reset Password | NOVARA COMMERCE', noIndex: true });
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || searchParams.get('resetToken') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token || !email) {
      setErrorMsg('Reset token or email is missing from the link.');
      return;
    }
    const passErr = validatePasswordStrength(newPassword);
    if (passErr) {
      setErrorMsg(passErr);
      return;
    }
    const confErr = validateConfirmPassword(newPassword, confirmPassword);
    if (confErr) {
      setErrorMsg(confErr);
      return;
    }

    setBusy(true);
    try {
      const res = await apiRequest<{ ok: true; message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, newPassword }),
      });
      setDone(true);
      dispatch(showToast({ variant: 'success', message: res.message }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-[24px] border border-white/90 bg-white p-8 shadow-[0_26px_70px_-18px_rgba(17,85,238,0.20)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#1155EE]">
            <Lock className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Account Security</span>
          </div>
          <Link to="/" className="font-display text-sm font-extrabold text-[#0F1D3A] hover:text-[#1155EE]">
            NOVARA
          </Link>
        </div>
        <h1 className="font-display mt-3 text-2xl font-bold text-[#0F1D3A]">Set New Password</h1>
        <p className="mt-1 text-xs text-slate-600">
          {email ? `Resetting password for ${email}` : 'Choose a strong password for your NOVARA account.'}
        </p>

        {done ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Your password has been updated successfully.
            </div>
            <Link
              to="/login"
              className="block w-full rounded-xl bg-[#1155EE] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#0B44CC]"
            >
              Sign In with New Password
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {errorMsg && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {errorMsg}
              </div>
            )}
            <div>
              <label htmlFor="reset-new-password" className="mb-1 block text-xs font-semibold text-slate-700">
                New Password (8+ chars, upper, lower, number)
              </label>
              <div className="relative">
                <input
                  id="reset-new-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE7FB] bg-[#FBFCFF] px-3.5 py-2.5 pr-10 text-sm focus:border-[#1155EE] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="mb-1 block text-xs font-semibold text-slate-700">
                Confirm New Password
              </label>
              <input
                id="reset-confirm-password"
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-[#DCE7FB] bg-[#FBFCFF] px-3.5 py-2.5 text-sm focus:border-[#1155EE] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#1155EE] py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC] disabled:opacity-60"
            >
              {busy ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
