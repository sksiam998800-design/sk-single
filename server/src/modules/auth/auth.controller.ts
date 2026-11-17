import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../users/user.model';
import { signAuthToken, type AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import { env, getJwtSecret, integrations } from '../../config/env';
import { sendTransactionalEmail } from '../../services/email.service';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from './auth.validation';
import {
  findOrLinkOAuthUser,
  loginWithEmailPassword,
  registerCustomerAccount,
  resendCustomerVerification,
  serializeUser,
  verifyCustomerEmail,
} from './auth.service';

const OAUTH_STATE_COOKIE = 'novara_oauth_state';

export function getAuthCookieOptions(req: Request) {
  const isHttps =
    env.COOKIE_SECURE ||
    req.secure ||
    req.get('x-forwarded-proto') === 'https';

  return {
    httpOnly: true,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    secure: isHttps,
    path: '/',
  };
}

export function setAuthCookie(req: Request, res: Response, token: string): void {
  res.cookie('novara_token', token, {
    ...getAuthCookieOptions(req),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function resolveRequestOrigin(req: Request): string {
  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  if (host) {
    return `${proto}://${host}`.replace(/\/$/, '');
  }
  return (env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function signOAuthState(payload: { nonce: string; mode: 'popup' | 'redirect'; provider: 'google' | 'facebook' }): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyOAuthState(
  stateToken: string,
  expectedProvider: 'google' | 'facebook',
  cookieNonce?: string,
): { mode: 'popup' | 'redirect' } | null {
  if (!stateToken || !cookieNonce || !stateToken.includes('.')) return null;
  const [encoded, sig] = stateToken.split('.');
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', getJwtSecret()).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      nonce?: string;
      mode?: 'popup' | 'redirect';
      provider?: string;
    };
    if (parsed.provider !== expectedProvider || !parsed.nonce) return null;
    const cA = Buffer.from(parsed.nonce);
    const cB = Buffer.from(String(cookieNonce));
    if (cA.length !== cB.length || !crypto.timingSafeEqual(cA, cB)) return null;
    return { mode: parsed.mode === 'popup' ? 'popup' : 'redirect' };
  } catch {
    return null;
  }
}

function buildOAuthCallbackHtml(payload: {
  ok: boolean;
  provider: 'google' | 'facebook';
  user?: ReturnType<typeof serializeUser>;
  token?: string;
  error?: string;
}): string {
  const serialized = JSON.stringify(
    payload.ok
      ? { type: 'OAUTH_AUTH_SUCCESS', provider: payload.provider, user: payload.user, token: payload.token }
      : { type: 'OAUTH_AUTH_ERROR', provider: payload.provider, error: payload.error || 'Authentication failed.' },
  ).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>NOVARA Authentication</title></head>
  <body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f4f8ff;color:#0f1d3a;">
    <div style="text-align:center;padding:24px;">
      <p style="font-weight:600;margin:0 0 8px;">${payload.ok ? 'Authentication successful' : 'Authentication cancelled'}</p>
      <p style="font-size:13px;color:#475569;margin:0;">This window will close automatically...</p>
    </div>
    <script>
      (function () {
        var msg = ${serialized};
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(msg, '*');
          window.close();
        } else {
          window.location.href = msg.type === 'OAUTH_AUTH_SUCCESS' ? '/?oauth=success' : '/register?authError=' + encodeURIComponent(msg.error || 'oauth_failed');
        }
      })();
    </script>
  </body>
</html>`;
}

export function getAuthProviders(_req: Request, res: Response): void {
  res.json({
    ok: true,
    providers: {
      emailPassword: true,
      google: integrations.googleOAuth,
      facebook: integrations.facebookOAuth,
      emailVerificationRequired: integrations.resend,
    },
  });
}

export async function registerController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = registerSchema.parse(req.body);
    const result = await registerCustomerAccount(parsed, resolveRequestOrigin(req));
    if (result.token) {
      setAuthCookie(req, res, result.token);
    }
    res.status(201).json({
      ok: true,
      user: result.user,
      token: result.token || undefined,
      requiresVerification: result.requiresVerification,
      message: result.requiresVerification
        ? 'Account created! Please check your email to verify your address before signing in.'
        : 'Account created and signed in.',
    });
  } catch (err) {
    next(err);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.parse(req.body);
    const { user, token } = await loginWithEmailPassword(parsed);
    setAuthCookie(req, res, token);
    res.json({ ok: true, user, token });
  } catch (err) {
    next(err);
  }
}

export async function adminLoginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.parse(req.body);
    const { user, token } = await loginWithEmailPassword({ ...parsed, requireAdminStaff: true });
    setAuthCookie(req, res, token);
    res.json({ ok: true, user, token });
  } catch (err) {
    next(err);
  }
}

export function logoutController(req: Request, res: Response): void {
  res.clearCookie('novara_token', getAuthCookieOptions(req));
  res.json({ ok: true });
}

export function meController(req: AuthenticatedRequest, res: Response): void {
  res.json({ ok: true, user: serializeUser(req.user!) });
}

export async function verifyEmailController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const source = req.method === 'GET' ? req.query : req.body;
    const parsed = verifyEmailSchema.parse(source);
    const { user, token } = await verifyCustomerEmail(parsed);
    setAuthCookie(req, res, token);
    res.json({
      ok: true,
      user,
      token,
      message: 'Your email address has been verified and your account is now active.',
    });
  } catch (err) {
    next(err);
  }
}

export async function resendVerificationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = resendVerificationSchema.parse(req.body);
    const result = await resendCustomerVerification(parsed.email, resolveRequestOrigin(req));
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function updateProfileController(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateProfileSchema.parse(req.body);
    const user = req.user!;
    user.name = parsed.name;
    if (parsed.phone !== undefined) user.phone = parsed.phone;
    if (parsed.avatarUrl !== undefined) user.avatarUrl = parsed.avatarUrl;
    if (parsed.notificationPrefs) user.notificationPrefs = parsed.notificationPrefs;
    await user.save();
    res.json({ ok: true, user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function changePasswordController(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = changePasswordSchema.parse(req.body);
    const user = await UserModel.findById(req.user!._id).select('+passwordHash');
    if (!user || !user.passwordHash) {
      throw new AppError(400, 'NO_PASSWORD_SET', 'This account uses external OAuth login.');
    }
    const valid = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect.');
    }
    user.passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    await user.save();
    res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await UserModel.findOne({ email });
    if (user) {
      const rawToken = crypto.randomBytes(24).toString('hex');
      user.resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const origin = resolveRequestOrigin(req);
      const resetUrl = `${origin}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
      await sendTransactionalEmail({
        to: user.email,
        template: 'password_reset',
        subject: 'Reset your NOVARA COMMERCE password',
        html: `<p>Click the link below to reset your password (valid for 30 minutes):</p><p><a href="${resetUrl}">Reset Password</a></p>`,
      });
    }
    res.json({
      ok: true,
      message: 'If an account matches that email, password reset instructions have been sent.',
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = resetPasswordSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(parsed.token).digest('hex');

    const user = await UserModel.findOne({
      email: parsed.email,
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { $gt: new Date() },
    }).select('+resetTokenHash +resetTokenExpiresAt');

    if (!user) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Reset link is invalid or has expired.');
    }

    user.passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;
    await user.save();

    res.json({ ok: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    next(err);
  }
}

function buildGoogleAuthUrl(req: Request, res: Response, mode: 'popup' | 'redirect'): string {
  const nonce = crypto.randomBytes(20).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    ...getAuthCookieOptions(req),
    maxAge: 10 * 60 * 1000,
  });
  const state = signOAuthState({ nonce, mode, provider: 'google' });
  const origin = resolveRequestOrigin(req);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origin}/api/auth/oauth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function googleOAuthUrlController(req: Request, res: Response): void {
  if (!integrations.googleOAuth) {
    res.status(503).json({
      ok: false,
      code: 'OAUTH_UNCONFIGURED',
      error: 'Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing).',
    });
    return;
  }
  const url = buildGoogleAuthUrl(req, res, 'popup');
  res.json({ ok: true, url });
}

export function googleOAuthRedirectController(req: Request, res: Response): void {
  if (!integrations.googleOAuth) {
    res.status(503).json({
      ok: false,
      code: 'OAUTH_UNCONFIGURED',
      error: 'Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing).',
    });
    return;
  }
  const mode = req.query.mode === 'popup' ? 'popup' : 'redirect';
  res.redirect(buildGoogleAuthUrl(req, res, mode));
}

export async function googleOAuthCallbackController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!integrations.googleOAuth) {
      throw new AppError(503, 'OAUTH_UNCONFIGURED', 'Google OAuth is not configured.');
    }

    const stateParam = String(req.query.state || '');
    const cookieNonce = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    res.clearCookie(OAUTH_STATE_COOKIE, getAuthCookieOptions(req));

    const verifiedState = verifyOAuthState(stateParam, 'google', cookieNonce);
    if (!verifiedState) {
      res.status(400).send(
        buildOAuthCallbackHtml({
          ok: false,
          provider: 'google',
          error: 'Invalid or expired Google OAuth security state. Please retry.',
        }),
      );
      return;
    }

    const code = String(req.query.code || '');
    if (!code) {
      if (verifiedState.mode === 'popup') {
        res.send(buildOAuthCallbackHtml({ ok: false, provider: 'google', error: 'Google sign-in was cancelled.' }));
      } else {
        res.redirect(`${resolveRequestOrigin(req)}/register?authError=google_cancelled`);
      }
      return;
    }

    const origin = resolveRequestOrigin(req);
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${origin}/api/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const tokenData = (await tokenResp.json()) as { access_token?: string };
    if (!tokenResp.ok || !tokenData.access_token) {
      if (verifiedState.mode === 'popup') {
        res.send(buildOAuthCallbackHtml({ ok: false, provider: 'google', error: 'Google token exchange failed.' }));
      } else {
        res.redirect(`${origin}/register?authError=google_token_failed`);
      }
      return;
    }

    const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await userInfoResp.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };
    if (!profile.email || !profile.sub) {
      if (verifiedState.mode === 'popup') {
        res.send(buildOAuthCallbackHtml({ ok: false, provider: 'google', error: 'Google account profile missing email.' }));
      } else {
        res.redirect(`${origin}/register?authError=google_profile_missing`);
      }
      return;
    }

    const { user, token } = await findOrLinkOAuthUser({
      provider: 'google',
      providerId: profile.sub,
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      picture: profile.picture,
      emailVerified: Boolean(profile.email_verified),
    });

    setAuthCookie(req, res, token);
    if (verifiedState.mode === 'popup') {
      res.send(buildOAuthCallbackHtml({ ok: true, provider: 'google', user, token }));
    } else {
      res.redirect(`${origin}/?oauth=success`);
    }
  } catch (err) {
    next(err);
  }
}

function buildFacebookAuthUrl(req: Request, res: Response, mode: 'popup' | 'redirect'): string {
  const nonce = crypto.randomBytes(20).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    ...getAuthCookieOptions(req),
    maxAge: 10 * 60 * 1000,
  });
  const state = signOAuthState({ nonce, mode, provider: 'facebook' });
  const origin = resolveRequestOrigin(req);
  const params = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID,
    redirect_uri: `${origin}/api/auth/oauth/facebook/callback`,
    scope: 'email,public_profile',
    response_type: 'code',
    state,
  });
  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
}

export function facebookOAuthUrlController(req: Request, res: Response): void {
  if (!integrations.facebookOAuth) {
    res.status(503).json({
      ok: false,
      code: 'OAUTH_UNCONFIGURED',
      error: 'Facebook OAuth is not configured (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET missing).',
    });
    return;
  }
  const url = buildFacebookAuthUrl(req, res, 'popup');
  res.json({ ok: true, url });
}

export function facebookOAuthRedirectController(req: Request, res: Response): void {
  if (!integrations.facebookOAuth) {
    res.status(503).json({
      ok: false,
      code: 'OAUTH_UNCONFIGURED',
      error: 'Facebook OAuth is not configured (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET missing).',
    });
    return;
  }
  const mode = req.query.mode === 'popup' ? 'popup' : 'redirect';
  res.redirect(buildFacebookAuthUrl(req, res, mode));
}

export async function facebookOAuthCallbackController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!integrations.facebookOAuth) {
      throw new AppError(503, 'OAUTH_UNCONFIGURED', 'Facebook OAuth is not configured.');
    }

    const stateParam = String(req.query.state || '');
    const cookieNonce = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    res.clearCookie(OAUTH_STATE_COOKIE, getAuthCookieOptions(req));

    const verifiedState = verifyOAuthState(stateParam, 'facebook', cookieNonce);
    if (!verifiedState) {
      res.status(400).send(
        buildOAuthCallbackHtml({
          ok: false,
          provider: 'facebook',
          error: 'Invalid or expired Facebook OAuth security state. Please retry.',
        }),
      );
      return;
    }

    const origin = resolveRequestOrigin(req);
    const code = String(req.query.code || '');
    if (!code) {
      if (verifiedState.mode === 'popup') {
        res.send(buildOAuthCallbackHtml({ ok: false, provider: 'facebook', error: 'Facebook sign-in was cancelled.' }));
      } else {
        res.redirect(`${origin}/register?authError=facebook_cancelled`);
      }
      return;
    }

    const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', env.FACEBOOK_APP_ID);
    tokenUrl.searchParams.set('client_secret', env.FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', `${origin}/api/auth/oauth/facebook/callback`);
    tokenUrl.searchParams.set('code', code);

    const tokenResp = await fetch(tokenUrl.toString());
    const tokenData = (await tokenResp.json()) as { access_token?: string };
    if (!tokenResp.ok || !tokenData.access_token) {
      if (verifiedState.mode === 'popup') {
        res.send(buildOAuthCallbackHtml({ ok: false, provider: 'facebook', error: 'Facebook token exchange failed.' }));
      } else {
        res.redirect(`${origin}/register?authError=facebook_token_failed`);
      }
      return;
    }

    const meResp = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tokenData.access_token)}`,
    );
    const profile = (await meResp.json()) as { id?: string; name?: string; email?: string };
    if (!profile.email || !profile.id) {
      if (verifiedState.mode === 'popup') {
        res.send(
          buildOAuthCallbackHtml({
            ok: false,
            provider: 'facebook',
            error: 'Facebook did not return a verified email address.',
          }),
        );
      } else {
        res.redirect(`${origin}/register?authError=facebook_email_missing`);
      }
      return;
    }

    const { user, token } = await findOrLinkOAuthUser({
      provider: 'facebook',
      providerId: profile.id,
      email: profile.email,
      name: profile.name || 'Facebook Customer',
      emailVerified: true,
    });

    setAuthCookie(req, res, token);
    if (verifiedState.mode === 'popup') {
      res.send(buildOAuthCallbackHtml({ ok: true, provider: 'facebook', user, token }));
    } else {
      res.redirect(`${origin}/?oauth=success`);
    }
  } catch (err) {
    next(err);
  }
}
