import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  Lock,
  LogIn,
  Mail,
  Package,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { completeOAuthSession, loginUser } from '../features/auth/authSlice';
import { showToast } from '../features/notifications/toastSlice';
import { ApiError, apiRequest } from '../services/api';
import type { UserProfile } from '../types/commerce';
import { sanitizeAuthRedirectPath, validateEmailAddress } from '../lib/authValidation';
import { useSeoMeta } from '../lib/useSeoMeta';
import { AuthShowcasePanel } from '../components/auth/AuthShowcasePanel';

const LOGIN_FEATURES = [
  {
    icon: <Heart className="h-4 w-4" />,
    title: 'Synced Wishlist & Cart',
    description: 'Pick up right where you left off.',
  },
  {
    icon: <Package className="h-4 w-4" />,
    title: 'Live Order Tracking',
    description: 'Track deliveries across all 64 districts.',
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: 'Secure & Reliable',
    description: 'Your account and payments stay protected.',
  },
];

export function LoginPage({ initialMode = 'login' }: { initialMode?: 'login' | 'forgot' }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAppSelector((s) => s.auth);

  const [mode, setMode] = useState<'login' | 'forgot'>(initialMode);
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useSeoMeta({
    title: mode === 'forgot' ? 'Reset Password | NOVARA COMMERCE' : 'Sign In | NOVARA COMMERCE',
    description: 'Sign in to your NOVARA COMMERCE account to track orders, manage your wishlist, and check out faster.',
  });

  const redirectParam = searchParams.get('redirect') || (location.state as { from?: string } | null)?.from || '';
  const redirectTarget = sanitizeAuthRedirectPath(redirectParam, '/account');
  const registerLink = redirectParam
    ? `/register?redirect=${encodeURIComponent(redirectTarget)}`
    : '/register';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<'google' | 'facebook' | null>(null);
  const [providers, setProviders] = useState({
    google: false,
    facebook: false,
    emailVerificationRequired: false,
  });

  useEffect(() => {
    const authError = searchParams.get('authError');
    if (authError) {
      setErrorMsg(decodeURIComponent(authError).replace(/_/g, ' '));
    }
  }, [searchParams]);

  useEffect(() => {
    apiRequest<{
      ok: true;
      providers: { google: boolean; facebook: boolean; emailVerificationRequired?: boolean };
    }>('/api/auth/providers')
      .then((res) => {
        setProviders({
          google: Boolean(res.providers.google),
          facebook: Boolean(res.providers.facebook),
          emailVerificationRequired: Boolean(res.providers.emailVerificationRequired),
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onOAuthMessage = async (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'OAUTH_AUTH_SUCCESS' && event.data.user) {
        setOauthBusy(null);
        await dispatch(
          completeOAuthSession({
            user: event.data.user as UserProfile,
            token: typeof event.data.token === 'string' ? event.data.token : undefined,
          }),
        );
        dispatch(
          showToast({
            variant: 'success',
            message: `Welcome back, ${(event.data.user as UserProfile).name}!`,
          }),
        );
        navigate(redirectTarget);
      } else if (event.data.type === 'OAUTH_AUTH_ERROR') {
        setOauthBusy(null);
        setErrorMsg(String(event.data.error || 'Social authentication failed. Please try again.'));
      }
    };
    window.addEventListener('message', onOAuthMessage);
    return () => window.removeEventListener('message', onOAuthMessage);
  }, [dispatch, navigate, redirectTarget]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setErrorCode(null);

    const emailErr = validateEmailAddress(email);
    if (emailErr) {
      setErrorMsg(emailErr);
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    const res = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(res)) {
      dispatch(showToast({ variant: 'success', message: `Welcome back, ${res.payload.name}!` }));
      navigate(redirectTarget);
    } else {
      setErrorMsg(res.payload?.message || 'Invalid email or password.');
      setErrorCode(res.payload?.code || null);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const emailErr = validateEmailAddress(email);
    if (emailErr) {
      setErrorMsg(emailErr);
      return;
    }

    setForgotBusy(true);
    try {
      const res = await apiRequest<{ ok: true; message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      dispatch(showToast({ variant: 'info', message: res.message }));
      setMode('login');
      if (location.pathname === '/forgot-password') {
        navigate('/login', { replace: true });
      }
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

  const handleOAuthClick = async (provider: 'google' | 'facebook') => {
    const configured = provider === 'google' ? providers.google : providers.facebook;
    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';
    if (!configured) {
      const envHint =
        provider === 'google'
          ? 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
          : 'FACEBOOK_APP_ID and FACEBOOK_APP_SECRET';
      const msg = `${providerLabel} OAuth is not configured on the server yet (${envHint} required).`;
      setErrorMsg(msg);
      dispatch(showToast({ variant: 'warning', message: msg }));
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
      const message =
        err instanceof ApiError
          ? err.message
          : `Unable to initiate ${providerLabel} sign-in.`;
      setErrorMsg(message);
      dispatch(showToast({ variant: 'warning', message }));
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-[24px] sm:rounded-[26px] border border-white/90 bg-white shadow-[0_26px_70px_-18px_rgba(17,85,238,0.22)]">
      <div className="grid grid-cols-1 lg:grid-cols-[46%_54%]">
        {/* LEFT COLUMN — NOVARA BRANDING & SHOWCASE */}
        <AuthShowcasePanel
          headlineTop="Welcome Back"
          headlineHighlight="To NOVARA!"
          subtitle="Sign in to track orders, manage your wishlist, and enjoy instant checkout."
          features={LOGIN_FEATURES}
        />

        {/* RIGHT COLUMN — SIGN IN / FORGOT PASSWORD */}
        <div className="flex flex-col justify-center bg-white px-5 py-6 sm:px-9 sm:py-7 lg:px-10 lg:py-8">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#DCE9FF] px-3.5 py-1 text-xs font-semibold text-[#1155EE]">
            <Users className="h-3.5 w-3.5" />
            <span>Welcome to NOVARA</span>
          </div>

          <h1 className="font-display mt-2.5 text-[26px] sm:text-[30px] font-extrabold leading-tight tracking-tight text-[#0F1D3A]">
            {mode === 'forgot' ? 'Reset Password' : 'Sign In'}
          </h1>
          <p className="mt-1 text-[13.5px] text-[#3E5278]">
            {mode === 'forgot'
              ? 'Enter your email address and we will send you a password reset link.'
              : 'Access your orders, saved addresses, wishlist, and rewards.'}
          </p>

          {/* Already Logged In State Notice */}
          {user && (
            <div className="mt-4 rounded-2xl border border-[#C7DAFF] bg-[#F2F7FF] p-3.5 text-sm text-[#0F1D3A]">
              <p className="font-semibold text-xs sm:text-sm">
                You are currently signed in as <span className="text-[#1155EE]">{user.email}</span>.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Link
                  to="/account"
                  className="rounded-lg bg-[#1155EE] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B44CC]"
                >
                  Go to My Account
                </Link>
                <Link
                  to="/shop"
                  className="rounded-lg border border-[#C7DAFF] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1155EE] hover:bg-blue-50"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-800"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div className="space-y-1.5">
                  <p className="font-medium">{errorMsg}</p>
                  {errorCode === 'EMAIL_NOT_VERIFIED' && (
                    <button
                      type="button"
                      disabled={resendBusy}
                      onClick={handleResendVerification}
                      className="text-xs font-semibold text-[#1155EE] underline hover:text-[#0B44CC]"
                    >
                      {resendBusy ? 'Sending verification link...' : 'Resend verification email'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {mode === 'login' ? (
            <>
              <form onSubmit={handleLogin} noValidate className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[#0F1D3A]"
                  >
                    <Mail className="h-3.5 w-3.5 text-[#0F1D3A]" />
                    <span>
                      Email Address <span className="text-[#0F1D3A]">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <ArrowRight className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#697B9B]" />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setErrorMsg(null);
                        setEmail(e.target.value);
                      }}
                      placeholder="Enter your email address"
                      className="w-full rounded-xl border border-[#DCE7FB] bg-[#FBFCFF] py-2.5 pl-9 pr-3.5 text-sm text-[#0F1D3A] placeholder:text-[#5E7091] shadow-[0_2px_6px_rgba(17,85,238,0.03)] transition-colors focus:border-[#1155EE] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#1155EE]/12"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label
                      htmlFor="login-password"
                      className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#0F1D3A]"
                    >
                      <Lock className="h-3.5 w-3.5 text-[#0F1D3A]" />
                      <span>
                        Password <span className="text-[#0F1D3A]">*</span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setMode('forgot');
                      }}
                      className="text-xs font-semibold text-[#1155EE] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => {
                        setErrorMsg(null);
                        setPassword(e.target.value);
                      }}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-[#DCE7FB] bg-[#FBFCFF] py-2.5 pl-3.5 pr-10 text-sm text-[#0F1D3A] placeholder:text-[#5E7091] shadow-[0_2px_6px_rgba(17,85,238,0.03)] transition-colors focus:border-[#1155EE] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#1155EE]/12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0F1D3A]/75 hover:text-[#1155EE]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2371FF] to-[#0D46E6] py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-6px_rgba(17,85,238,0.45)] transition-all hover:from-[#1A63F0] hover:to-[#0A3AC7] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#E5EDFA]" />
                <span className="text-xs font-medium text-[#3E5278]">or continue with</span>
                <span className="h-px flex-1 bg-[#E5EDFA]" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={oauthBusy !== null}
                  onClick={() => handleOAuthClick('google')}
                  className="flex items-center justify-center gap-2.5 rounded-xl border border-[#DCE7FB] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#162747] shadow-2xs transition-colors hover:border-[#AEC8FA] hover:bg-[#F6FAFF] disabled:opacity-60"
                >
                  <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  <span>{oauthBusy === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                <button
                  type="button"
                  disabled={oauthBusy !== null}
                  onClick={() => handleOAuthClick('facebook')}
                  className="flex items-center justify-center gap-2.5 rounded-xl border border-[#DCE7FB] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#162747] shadow-2xs transition-colors hover:border-[#AEC8FA] hover:bg-[#F6FAFF] disabled:opacity-60"
                >
                  <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="11" fill="#1877F2" />
                    <path
                      fill="#FFFFFF"
                      d="M15.4 12.8l.4-2.6h-2.5V8.5c0-.7.3-1.4 1.5-1.4H16V4.9s-1-.2-2-.2c-2.1 0-3.5 1.3-3.5 3.6v1.9H8.2v2.6h2.3v6.5h2.8v-6.5h2.1z"
                    />
                  </svg>
                  <span>{oauthBusy === 'facebook' ? 'Connecting...' : 'Continue with Facebook'}</span>
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleForgot} noValidate className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[#0F1D3A]"
                >
                  <Mail className="h-3.5 w-3.5 text-[#0F1D3A]" />
                  <span>
                    Account Email Address <span className="text-[#0F1D3A]">*</span>
                  </span>
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setEmail(e.target.value);
                  }}
                  placeholder="Enter your registered email"
                  className="w-full rounded-xl border border-[#DCE7FB] bg-[#FBFCFF] px-3.5 py-2.5 text-sm text-[#0F1D3A] placeholder:text-[#5E7091] shadow-[0_2px_6px_rgba(17,85,238,0.03)] transition-colors focus:border-[#1155EE] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#1155EE]/12"
                />
              </div>

              <button
                type="submit"
                disabled={forgotBusy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2371FF] to-[#0D46E6] py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-6px_rgba(17,85,238,0.45)] transition-all hover:from-[#1A63F0] hover:to-[#0A3AC7] disabled:opacity-65"
              >
                <span>{forgotBusy ? 'Sending Link...' : 'Send Reset Link'}</span>
                {!forgotBusy && <ArrowRight className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('login');
                  if (location.pathname === '/forgot-password') {
                    navigate('/login');
                  }
                }}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#DCE7FB] bg-white py-2.5 text-xs font-semibold text-[#0F1D3A] hover:border-[#AEC8FA] hover:bg-[#F6FAFF]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {/* Create Account Footer Link — Navigates directly to isolated Register page */}
          <p className="mt-6 text-center text-[13px] text-[#3E5278]">
            Don&apos;t have an account?{' '}
            <Link
              to={registerLink}
              className="inline-flex items-center gap-1 font-semibold text-[#1155EE] hover:underline"
            >
              <span>Create Account</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
