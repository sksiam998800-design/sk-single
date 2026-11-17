import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { completeOAuthSession, registerUser } from '../features/auth/authSlice';
import { showToast } from '../features/notifications/toastSlice';
import { ApiError, apiRequest } from '../services/api';
import type { UserProfile } from '../types/commerce';
import {
  evaluatePasswordRules,
  normalizeEmail,
  sanitizeAuthRedirectPath,
  validateConfirmPassword,
  validateEmailAddress,
  validateFullName,
  validatePasswordStrength,
  validateRegistrationFields,
  type RegistrationFieldErrors,
} from '../lib/authValidation';
import { useSeoMeta } from '../lib/useSeoMeta';
import { AuthShowcasePanel } from '../components/auth/AuthShowcasePanel';

const REGISTER_FEATURES = [
  {
    icon: <Zap className="h-4 w-4" />,
    title: 'Faster Checkout',
    description: 'Shop quickly and easily.',
  },
  {
    icon: <Gift className="h-4 w-4" />,
    title: 'Exclusive Offers',
    description: 'Get special deals and discounts.',
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: 'Secure & Reliable',
    description: 'Your data is always safe',
  },
];

export function RegisterPage() {
  useSeoMeta({
    title: 'Create Account | NOVARA COMMERCE',
    description: 'Create your NOVARA COMMERCE account for faster checkout, exclusive offers, and secure shopping.',
  });

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAppSelector((s) => s.auth);

  const redirectParam = searchParams.get('redirect') || (location.state as { from?: string } | null)?.from || '';
  const redirectTarget = sanitizeAuthRedirectPath(redirectParam, '/account');
  const loginLink = redirectParam
    ? `/login?redirect=${encodeURIComponent(redirectTarget)}`
    : '/login';
  const forgotLink = redirectParam
    ? `/forgot-password?redirect=${encodeURIComponent(redirectTarget)}`
    : '/forgot-password';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});
  const [bannerError, setBannerError] = useState<{
    message: string;
    isDuplicate?: boolean;
    unverified?: boolean;
    emailConfigured?: boolean;
  } | null>(null);
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<'google' | 'facebook' | null>(null);
  const [providers, setProviders] = useState({
    google: false,
    facebook: false,
    emailVerificationRequired: false,
  });

  const submittingRef = useRef(false);

  useEffect(() => {
    const authError = searchParams.get('authError');
    if (authError) {
      setBannerError({
        message: decodeURIComponent(authError).replace(/_/g, ' '),
      });
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
            message: `Welcome to NOVARA, ${(event.data.user as UserProfile).name}!`,
          }),
        );
        navigate(redirectTarget);
      } else if (event.data.type === 'OAUTH_AUTH_ERROR') {
        setOauthBusy(null);
        setBannerError({
          message: String(event.data.error || 'Social authentication failed. Please try again.'),
        });
      }
    };
    window.addEventListener('message', onOAuthMessage);
    return () => window.removeEventListener('message', onOAuthMessage);
  }, [dispatch, navigate, redirectTarget]);

  const passwordRules = useMemo(() => evaluatePasswordRules(password), [password]);

  const handleFieldChange = (field: keyof RegistrationFieldErrors, value: string) => {
    setBannerError(null);
    if (field === 'name') {
      setName(value);
      if (fieldErrors.name && !validateFullName(value)) {
        setFieldErrors((prev) => ({ ...prev, name: undefined }));
      }
    } else if (field === 'email') {
      setEmail(value);
      if (fieldErrors.email && !validateEmailAddress(value)) {
        setFieldErrors((prev) => ({ ...prev, email: undefined }));
      }
    } else if (field === 'password') {
      setPassword(value);
      setPasswordTouched(true);
      setFieldErrors((prev) => ({
        ...prev,
        password: prev.password && !validatePasswordStrength(value) ? undefined : prev.password,
        confirmPassword:
          confirmPassword && prev.confirmPassword && !validateConfirmPassword(value, confirmPassword)
            ? undefined
            : prev.confirmPassword,
      }));
    } else if (field === 'confirmPassword') {
      setConfirmPassword(value);
      if (fieldErrors.confirmPassword && !validateConfirmPassword(password, value)) {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;

    setBannerError(null);
    const check = validateRegistrationFields({ name, email, password, confirmPassword });
    if (!check.valid) {
      setFieldErrors(check.errors);
      return;
    }

    setFieldErrors({});
    submittingRef.current = true;
    try {
      const res = await dispatch(
        registerUser({
          name: check.normalized.name,
          email: check.normalized.email,
          password,
        }),
      );

      if (registerUser.fulfilled.match(res)) {
        if (res.payload.requiresVerification) {
          setVerificationPendingEmail(check.normalized.email);
          dispatch(
            showToast({
              variant: 'info',
              message: 'Account created! Please check your email to verify your address.',
            }),
          );
        } else {
          dispatch(
            showToast({
              variant: 'success',
              message: `Welcome to NOVARA, ${res.payload.user.name}! Your account is ready.`,
            }),
          );
          navigate(redirectTarget);
        }
      } else {
        const rejectPayload = res.payload;
        const isDup = rejectPayload?.code === 'EMAIL_EXISTS' || rejectPayload?.code === 'DUPLICATE_KEY';
        setBannerError({
          message:
            isDup
              ? 'An account may already be associated with this email. Please sign in or reset your password.'
              : rejectPayload?.message || 'Unable to create your account right now.',
          isDuplicate: isDup,
          unverified: Boolean(rejectPayload?.details?.unverified),
          emailConfigured: Boolean(rejectPayload?.details?.emailConfigured),
        });
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = normalizeEmail(verificationPendingEmail || email);
    if (!targetEmail) return;
    setResending(true);
    try {
      const res = await apiRequest<{ ok: true; message: string }>('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail }),
      });
      dispatch(showToast({ variant: 'success', message: res.message }));
    } catch (err) {
      dispatch(
        showToast({
          variant: 'warning',
          message: err instanceof Error ? err.message : 'Unable to send verification email.',
        }),
      );
    } finally {
      setResending(false);
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
      setBannerError({ message: msg });
      dispatch(showToast({ variant: 'warning', message: msg }));
      return;
    }

    setOauthBusy(provider);
    setBannerError(null);
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
          : `Unable to start ${providerLabel} authentication.`;
      setBannerError({ message });
      dispatch(showToast({ variant: 'warning', message }));
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-[24px] sm:rounded-[26px] border border-white/90 bg-white shadow-[0_26px_70px_-18px_rgba(17,85,238,0.22)]">
      <div className="grid grid-cols-1 lg:grid-cols-[46%_54%]">
        {/* LEFT COLUMN — NOVARA BRANDING & SHOWCASE */}
        <AuthShowcasePanel
          headlineTop="Create Your"
          headlineHighlight="Account Today!"
          subtitle="Unlock a better shopping experience with NOVARA."
          features={REGISTER_FEATURES}
        />

        {/* RIGHT COLUMN — REGISTRATION FORM */}
        <div className="flex flex-col justify-center bg-white px-5 py-6 sm:px-9 sm:py-7 lg:px-10 lg:py-7">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#DCE9FF] px-3.5 py-1 text-xs font-semibold text-[#1155EE]">
            <Users className="h-3.5 w-3.5" />
            <span>Welcome to NOVARA</span>
          </div>

          <h1 className="font-display mt-2.5 text-[26px] sm:text-[30px] font-extrabold leading-tight tracking-tight text-[#0F1D3A]">
            Create Account
          </h1>
          <p className="mt-1 text-[13.5px] text-[#3E5278]">
            Join us and enjoy a premium shopping experience.
          </p>

          {/* Already Logged In State Notice */}
          {user && !verificationPendingEmail && (
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

          {/* Verification Required Confirmation State */}
          {verificationPendingEmail ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-700">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <h2 className="font-display text-lg font-bold text-[#0F1D3A]">
                  Verify Your Email Address
                </h2>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                We sent a verification link to{' '}
                <strong className="font-semibold text-[#0F1D3A]">{verificationPendingEmail}</strong>. Please open
                the link within 24 hours to activate your NOVARA account.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResendVerification}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1155EE] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B44CC] disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>
                <Link
                  to={loginLink}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0F1D3A] hover:bg-slate-50"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Duplicate / API Error Alert */}
              {bannerError && (
                <div
                  role="alert"
                  className={`mt-4 rounded-2xl border px-4 py-3 text-xs leading-relaxed ${
                    bannerError.isDuplicate
                      ? 'border-blue-200 bg-[#F2F7FF] text-[#0F1D3A]'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        bannerError.isDuplicate ? 'text-[#1155EE]' : 'text-rose-600'
                      }`}
                    />
                    <div className="space-y-2">
                      <p className="font-medium">{bannerError.message}</p>
                      {bannerError.isDuplicate && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={loginLink}
                            className="rounded-lg bg-[#1155EE] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0B44CC]"
                          >
                            Sign In
                          </Link>
                          <Link
                            to={forgotLink}
                            className="rounded-lg border border-[#C7DAFF] bg-white px-3 py-1.5 text-xs font-semibold text-[#1155EE] hover:bg-blue-50"
                          >
                            Forgot Password
                          </Link>
                          {bannerError.unverified && bannerError.emailConfigured && (
                            <button
                              type="button"
                              disabled={resending}
                              onClick={handleResendVerification}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              {resending ? 'Sending...' : 'Resend Verification'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="reg-full-name"
                    className="mb-1 flex items-center gap-1.5 text-[12.5px] font-bold text-[#0F1D3A]"
                  >
                    <User className="h-3.5 w-3.5 text-[#0F1D3A]" />
                    <span>
                      Full Name <span className="text-[#0F1D3A]">*</span>
                    </span>
                  </label>
                  <input
                    id="reg-full-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={fieldErrors.name ? 'reg-name-error' : undefined}
                    value={name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full rounded-xl border bg-[#FBFCFF] px-3.5 py-2.5 text-sm text-[#0F1D3A] placeholder:text-[#5E7091] shadow-[0_2px_6px_rgba(17,85,238,0.03)] transition-colors focus:bg-white focus:outline-none focus:ring-3 ${
                      fieldErrors.name
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15'
                        : 'border-[#DCE7FB] focus:border-[#1155EE] focus:ring-[#1155EE]/12'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p id="reg-name-error" role="alert" className="mt-1 text-xs font-medium text-rose-600">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="reg-email"
                    className="mb-1 flex items-center gap-1.5 text-[12.5px] font-bold text-[#0F1D3A]"
                  >
                    <Mail className="h-3.5 w-3.5 text-[#0F1D3A]" />
                    <span>
                      Email Address <span className="text-[#0F1D3A]">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <ArrowRight className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#697B9B]" />
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
                      value={email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      placeholder="Enter your email address"
                      className={`w-full rounded-xl border bg-[#FBFCFF] py-2.5 pl-9 pr-3.5 text-sm text-[#0F1D3A] placeholder:text-[#5E7091] shadow-[0_2px_6px_rgba(17,85,238,0.03)] transition-colors focus:bg-white focus:outline-none focus:ring-3 ${
                        fieldErrors.email
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15'
                          : 'border-[#DCE7FB] focus:border-[#1155EE] focus:ring-[#1155EE]/12'
                      }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p id="reg-email-error" role="alert" className="mt-1 text-xs font-medium text-rose-600">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="reg-password"
                    className="mb-1 flex items-center gap-1.5 text-[12.5px] font-bold text-[#0F1D3A]"
                  >
                    <Lock className="h-3.5 w-3.5 text-[#0F1D3A]" />
                    <span>
                      Password <span className="text-[#0F1D3A]">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'reg-password-error' : undefined}
                      value={password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      placeholder="Create a strong password"
                      className={`w-full rounded-xl border bg-[#FBFCFF] py-2.5 pl-3.5 pr-10 text-sm text-[#0F1D3A] placeholder:text-[#5E7091] shadow-[0_2px_6px_rgba(17,85,238,0.03)] transition-colors focus:bg-white focus:outline-none focus:ring-3 ${
                        fieldErrors.password
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15'
                          : 'border-[#DCE7FB] focus:border-[#1155EE] focus:ring-[#1155EE]/12'
                      }`}
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
                  {fieldErrors.password && (
                    <p id="reg-password-error" role="alert" className="mt-1 text-xs font-medium text-rose-600">
                      {fieldErrors.password}
                    </p>
                  )}
                  {(passwordTouched || fieldErrors.password) && password.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                      <span className={passwordRules.minLength ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                        {passwordRules.minLength ? '✓' : '•'} 8+ chars
                      </span>
                      <span className={passwordRules.hasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                        {passwordRules.hasUppercase ? '✓' : '•'} Uppercase
                      </span>
                      <span className={passwordRules.hasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                        {passwordRules.hasLowercase ? '✓' : '•'} Lowercase
                      </span>
                      <span className={passwordRules.hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                        {passwordRules.hasNumber ? '✓' : '•'} Number
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="reg-confirm-password"
                    className="mb-1 flex items-center gap-1.5 text-[12.5px] font-bold text-[#0F1D3A]"
                  >
                    <Lock className="h-3.5 w-3.5 text-[#0F1D3A]" />
                    <span>
                      Confirm Password <span className="text-[#0F1D3A]">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      aria-describedby={fieldErrors.confirmPassword ? 'reg-confirm-error' : undefined}
                      value={confirmPassword}
                      onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      className={`w-full rounded-xl border bg-[#FBFCFF] py-2.5 pl-3.5 pr-10 text-sm text-[#0F1D3A] placeholder:text-[#5E7091] shadow-[0_2px_6px_rgba(17,85,238,0.03)] transition-colors focus:bg-white focus:outline-none focus:ring-3 ${
                        fieldErrors.confirmPassword
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15'
                          : 'border-[#DCE7FB] focus:border-[#1155EE] focus:ring-[#1155EE]/12'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0F1D3A]/75 hover:text-[#1155EE]"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p id="reg-confirm-error" role="alert" className="mt-1 text-xs font-medium text-rose-600">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Create Account CTA Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2371FF] to-[#0D46E6] py-2.5 sm:py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-6px_rgba(17,85,238,0.45)] transition-all hover:from-[#1A63F0] hover:to-[#0A3AC7] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              {/* Divider */}
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#E5EDFA]" />
                <span className="text-xs font-medium text-[#3E5278]">or continue with</span>
                <span className="h-px flex-1 bg-[#E5EDFA]" />
              </div>

              {/* Social OAuth Buttons */}
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

              {/* Sign In Footer Link — Navigates directly to isolated Sign In page */}
              <p className="mt-5 text-center text-[13px] text-[#3E5278]">
                Already have an account?{' '}
                <Link
                  to={loginLink}
                  className="inline-flex items-center gap-1 font-semibold text-[#1155EE] hover:underline"
                >
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
