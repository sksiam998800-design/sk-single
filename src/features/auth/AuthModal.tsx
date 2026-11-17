import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { closeAuthModal, completeOAuthSession, loginUser, setAuthModalTab } from './authSlice';
import { showToast } from '../notifications/toastSlice';
import { ApiError, apiRequest } from '../../services/api';
import type { UserProfile } from '../../types/commerce';

export function AuthModal() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { modalOpen, modalTab, returnUrl, authNotice, loading } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [providers, setProviders] = useState({ google: false, facebook: false, emailVerificationRequired: false });
  const [forgotBusy, setForgotBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<'google' | 'facebook' | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    setErrorMsg(null);
    setErrorCode(null);
    apiRequest<{
      ok: true;
      providers: { google: boolean; facebook: boolean; emailVerificationRequired?: boolean };
    }>('/api/auth/providers')
      .then((res) =>
        setProviders({
          google: Boolean(res.providers.google),
          facebook: Boolean(res.providers.facebook),
          emailVerificationRequired: Boolean(res.providers.emailVerificationRequired),
        }),
      )
      .catch(() => undefined);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onMessage = async (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'OAUTH_AUTH_SUCCESS' && event.data.user) {
        setOauthBusy(null);
        await dispatch(
          completeOAuthSession({
            user: event.data.user as UserProfile,
            token: typeof event.data.token === 'string' ? event.data.token : undefined,
          }),
        );
        dispatch(showToast({ variant: 'success', message: `Signed in as ${event.data.user.name}.` }));
        if (returnUrl) navigate(returnUrl);
      } else if (event.data.type === 'OAUTH_AUTH_ERROR') {
        setOauthBusy(null);
        setErrorMsg(String(event.data.error || 'OAuth authentication failed.'));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [modalOpen, dispatch, navigate, returnUrl]);

  const handleSuccessRedirect = () => {
    if (returnUrl) {
      navigate(returnUrl);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setErrorCode(null);
    const res = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(res)) {
      dispatch(showToast({ variant: 'success', message: `Welcome back, ${res.payload.name}!` }));
      handleSuccessRedirect();
    } else {
      setErrorMsg(res.payload?.message || 'Invalid email or password.');
      setErrorCode(res.payload?.code || null);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setForgotBusy(true);
    try {
      const res = await apiRequest<{ ok: true; message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      dispatch(showToast({ variant: 'info', message: res.message }));
      dispatch(setAuthModalTab('login'));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to process password reset.');
    } finally {
      setForgotBusy(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResendBusy(true);
    try {
      const res = await apiRequest<{ ok: true; message: string }>('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      dispatch(showToast({ variant: 'success', message: res.message }));
    } catch (err) {
      dispatch(
        showToast({
          variant: 'warning',
          message: err instanceof Error ? err.message : 'Unable to resend verification email.',
        }),
      );
    } finally {
      setResendBusy(false);
    }
  };

  const handleOAuthStart = async (provider: 'google' | 'facebook') => {
    const isConfigured = provider === 'google' ? providers.google : providers.facebook;
    if (!isConfigured) {
      const envHint =
        provider === 'google'
          ? 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET'
          : 'FACEBOOK_APP_ID / FACEBOOK_APP_SECRET';
      dispatch(
        showToast({
          variant: 'warning',
          message: `${provider === 'google' ? 'Google' : 'Facebook'} OAuth requires server configuration (${envHint}).`,
        }),
      );
      return;
    }

    setOauthBusy(provider);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ ok: true; url: string }>(`/api/auth/oauth/${provider}/url`);
      const popup = window.open(
        res.url,
        `novara_${provider}_oauth`,
        'width=520,height=640,noopener=false,noreferrer=false',
      );
      if (!popup) {
        window.location.href = `/api/auth/oauth/${provider}?mode=redirect`;
      }
    } catch (err) {
      setOauthBusy(null);
      const msg =
        err instanceof ApiError
          ? err.message
          : `Unable to initiate ${provider === 'google' ? 'Google' : 'Facebook'} sign-in.`;
      setErrorMsg(msg);
      dispatch(showToast({ variant: 'warning', message: msg }));
    }
  };

  const goToRegisterPage = () => {
    dispatch(closeAuthModal());
    navigate('/register');
  };

  const title = modalTab === 'forgot' ? 'Reset Your Password' : 'Sign in to NOVARA';

  return (
    <Modal
      open={modalOpen}
      onClose={() => dispatch(closeAuthModal())}
      title={title}
      description={authNotice || 'Access your orders, saved Bangladesh addresses, and fast checkout.'}
      size="sm"
    >
      {errorMsg && (
        <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          <p>{errorMsg}</p>
          {errorCode === 'EMAIL_NOT_VERIFIED' && (
            <button
              type="button"
              disabled={resendBusy}
              onClick={handleResendVerification}
              className="mt-1.5 text-xs font-semibold text-[#1155EE] underline hover:text-[#0B44CC]"
            >
              {resendBusy ? 'Sending verification link...' : 'Resend verification email'}
            </button>
          )}
        </div>
      )}

      {modalTab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="auth-login-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="auth-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-[#1155EE] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="auth-login-password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  dispatch(setAuthModalTab('forgot'));
                }}
                className="text-xs font-medium text-[#1155EE] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="auth-login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-10 text-sm focus:border-[#1155EE] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#1155EE] py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC] disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      )}

      {modalTab === 'forgot' && (
        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <label htmlFor="auth-forgot-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Account Email Address
            </label>
            <input
              id="auth-forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#1155EE] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={forgotBusy}
            className="w-full rounded-xl bg-[#1155EE] py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC] disabled:opacity-60"
          >
            {forgotBusy ? 'Sending link...' : 'Send Reset Link'}
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              dispatch(setAuthModalTab('login'));
            }}
            className="w-full text-center text-xs font-semibold text-slate-600 hover:text-[#1155EE]"
          >
            ← Back to Sign In
          </button>
        </form>
      )}

      {modalTab === 'login' && (
        <>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="mb-3 text-center text-xs text-slate-500">Or continue with</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={oauthBusy !== null}
                onClick={() => handleOAuthStart('google')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  providers.google
                    ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.6 6.4C.6 8.1 0 10 0 12s.6 3.9 1.6 5.6l3.7-2.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.4 7.4 23 12 23z"
                  />
                </svg>
                <span>{oauthBusy === 'google' ? 'Connecting...' : 'Google'}</span>
              </button>

              <button
                type="button"
                disabled={oauthBusy !== null}
                onClick={() => handleOAuthStart('facebook')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  providers.facebook
                    ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" fill="#1877F2" />
                  <path
                    fill="#FFFFFF"
                    d="M15.4 12.8l.4-2.6h-2.5V8.5c0-.7.3-1.4 1.5-1.4H16V4.9s-1-.2-2-.2c-2.1 0-3.5 1.3-3.5 3.6v1.9H8.2v2.6h2.3v6.5h2.8v-6.5h2.1z"
                  />
                </svg>
                <span>{oauthBusy === 'facebook' ? 'Connecting...' : 'Facebook'}</span>
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-600">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={goToRegisterPage}
              className="inline-flex items-center gap-1 font-semibold text-[#1155EE] hover:underline"
            >
              Create Account <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </p>
        </>
      )}
    </Modal>
  );
}
