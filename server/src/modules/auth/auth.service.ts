import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { UserModel } from '../users/user.model';
import { AppError } from '../../middleware/error.middleware';
import { recordAuditLog, signAuthToken } from '../../middleware/auth.middleware';
import { env, integrations } from '../../config/env';
import { sendTransactionalEmail } from '../../services/email.service';
import { isStaffRole } from '../../../../src/lib/rbac';
import { normalizeEmail, normalizeFullName } from '../../../../src/lib/authValidation';

export function resolveAuthProvider(user: {
  authProvider?: 'local' | 'google' | 'facebook';
  oauthProviders?: { googleId?: string; facebookId?: string };
}): 'local' | 'google' | 'facebook' {
  if (user.authProvider) return user.authProvider;
  if (user.oauthProviders?.googleId) return 'google';
  if (user.oauthProviders?.facebookId) return 'facebook';
  return 'local';
}

export function serializeUser(user: {
  _id: unknown;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  walletBalance?: number;
  role: string;
  customPermissions?: string[];
  isVerified: boolean;
  status?: 'active' | 'suspended';
  authProvider?: 'local' | 'google' | 'facebook';
  oauthProviders?: { googleId?: string; facebookId?: string };
  notificationPrefs?: { orderUpdates: boolean; promotions: boolean; backInStock: boolean };
  createdAt?: Date | string;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatarUrl: user.avatarUrl || '',
    walletBalance: Number(user.walletBalance || 0),
    role: user.role,
    customPermissions: user.customPermissions || [],
    isVerified: user.isVerified,
    status: user.status || 'active',
    authProvider: resolveAuthProvider(user),
    notificationPrefs: user.notificationPrefs || {
      orderUpdates: true,
      promotions: false,
      backInStock: true,
    },
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
  };
}

export async function registerCustomerAccount(
  input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  },
  originUrl?: string,
) {
  const email = normalizeEmail(input.email);
  const name = normalizeFullName(input.name);

  const existing = await UserModel.findOne({ email });
  if (existing) {
    throw new AppError(
      409,
      'EMAIL_EXISTS',
      'An account may already be associated with this email. Please sign in or reset your password.',
      {
        unverified: !existing.isVerified,
        emailConfigured: integrations.resend,
      },
    );
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const rawVerifyToken = crypto.randomBytes(24).toString('hex');
  const verificationTokenHash = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');
  const requiresVerification = integrations.resend;
  const verificationTokenExpiresAt = requiresVerification ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;

  let user;
  try {
    user = await UserModel.create({
      name,
      email,
      phone: input.phone?.trim() || undefined,
      passwordHash,
      role: 'customer',
      status: 'active',
      authProvider: 'local',
      isVerified: !requiresVerification,
      verificationTokenHash: requiresVerification ? verificationTokenHash : undefined,
      verificationTokenExpiresAt,
      lastLoginAt: requiresVerification ? undefined : new Date(),
      notificationPrefs: { orderUpdates: true, promotions: false, backInStock: true },
    });
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000) {
      throw new AppError(
        409,
        'EMAIL_EXISTS',
        'An account may already be associated with this email. Please sign in or reset your password.',
      );
    }
    throw err;
  }

  if (requiresVerification) {
    const baseUrl = (originUrl || env.CLIENT_URL).replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/verify-email?token=${rawVerifyToken}&email=${encodeURIComponent(user.email)}`;
    await sendTransactionalEmail({
      to: user.email,
      template: 'account_verification',
      subject: 'Verify your NOVARA COMMERCE account',
      html: `<p>Welcome to NOVARA COMMERCE, ${user.name}.</p><p>Please verify your email address (valid for 24 hours): <a href="${verifyUrl}">Verify Account</a></p>`,
    });

    return {
      user: serializeUser(user),
      token: null as string | null,
      requiresVerification: true,
    };
  }

  const token = signAuthToken(user);
  return {
    user: serializeUser(user),
    token,
    requiresVerification: false,
  };
}

export async function verifyCustomerEmail(input: { email: string; token: string }) {
  const email = normalizeEmail(input.email);
  const tokenHash = crypto.createHash('sha256').update(input.token.trim()).digest('hex');

  const user = await UserModel.findOne({
    email,
    verificationTokenHash: tokenHash,
    $or: [
      { verificationTokenExpiresAt: { $gt: new Date() } },
      { verificationTokenExpiresAt: { $exists: false } },
      { verificationTokenExpiresAt: null },
    ],
  }).select('+verificationTokenHash +verificationTokenExpiresAt');

  if (!user) {
    throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'Verification link is invalid or has expired.');
  }

  if (user.status !== 'active') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended. Please contact support.');
  }

  user.isVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationTokenExpiresAt = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  const token = signAuthToken(user);
  return { user: serializeUser(user), token };
}

export async function resendCustomerVerification(emailInput: string, originUrl?: string) {
  if (!integrations.resend) {
    throw new AppError(
      503,
      'EMAIL_PROVIDER_UNCONFIGURED',
      'Email verification delivery is unavailable because RESEND_API_KEY is not configured on the server.',
    );
  }

  const email = normalizeEmail(emailInput);
  const user = await UserModel.findOne({ email });

  if (user && !user.isVerified && user.status === 'active') {
    const rawVerifyToken = crypto.randomBytes(24).toString('hex');
    user.verificationTokenHash = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');
    user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const baseUrl = (originUrl || env.CLIENT_URL).replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/verify-email?token=${rawVerifyToken}&email=${encodeURIComponent(user.email)}`;
    await sendTransactionalEmail({
      to: user.email,
      template: 'account_verification',
      subject: 'Verify your NOVARA COMMERCE account',
      html: `<p>Hello ${user.name},</p><p>Verify your email address (valid for 24 hours): <a href="${verifyUrl}">Verify Account</a></p>`,
    });
  }

  return {
    message: 'If an unverified account matches that email, a fresh verification link has been sent.',
  };
}

export async function loginWithEmailPassword(input: {
  email: string;
  password: string;
  requireAdminStaff?: boolean;
}) {
  const email = normalizeEmail(input.email);
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }
  if (user.status !== 'active') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended. Please contact an administrator.');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  if (integrations.resend && !user.isVerified && user.role === 'customer') {
    throw new AppError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Please verify your email address before signing in. You can request a new verification email.',
    );
  }

  if (input.requireAdminStaff && !isStaffRole(user.role)) {
    throw new AppError(403, 'ADMIN_ACCESS_REQUIRED', 'This account does not have administrator permissions.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  if (isStaffRole(user.role)) {
    await recordAuditLog({
      actor: user,
      action: input.requireAdminStaff ? 'auth.admin_login' : 'auth.login',
      resourceType: 'User',
      resourceId: String(user._id),
      summary: `Staff sign-in (${user.email}) [${user.role}]`,
    });
  }

  const token = signAuthToken(user);
  return { user: serializeUser(user), token };
}

export async function findOrLinkOAuthUser(params: {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}) {
  if (!params.emailVerified) {
    throw new AppError(
      403,
      'OAUTH_EMAIL_UNVERIFIED',
      `Your ${params.provider} account email must be verified before signing in.`,
    );
  }

  const normalizedEmail = normalizeEmail(params.email);
  const cleanedName = normalizeFullName(params.name) || normalizedEmail.split('@')[0];
  const providerQuery =
    params.provider === 'google'
      ? { 'oauthProviders.googleId': params.providerId }
      : { 'oauthProviders.facebookId': params.providerId };

  let user = await UserModel.findOne({ $or: [providerQuery, { email: normalizedEmail }] });

  if (!user) {
    try {
      user = await UserModel.create({
        name: cleanedName,
        email: normalizedEmail,
        avatarUrl: params.picture || '',
        role: 'customer',
        status: 'active',
        isVerified: true,
        authProvider: params.provider,
        oauthProviders:
          params.provider === 'google'
            ? { googleId: params.providerId }
            : { facebookId: params.providerId },
        lastLoginAt: new Date(),
        notificationPrefs: { orderUpdates: true, promotions: false, backInStock: true },
      });
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000) {
        user = await UserModel.findOne({ email: normalizedEmail });
      } else {
        throw err;
      }
    }
  }

  if (!user) {
    throw new AppError(500, 'OAUTH_ACCOUNT_ERROR', 'Unable to provision OAuth user account.');
  }

  if (user.status !== 'active') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended. Please contact an administrator.');
  }

  let modified = false;
  if (params.provider === 'google' && user.oauthProviders?.googleId !== params.providerId) {
    user.oauthProviders = { ...user.oauthProviders, googleId: params.providerId };
    modified = true;
  }
  if (params.provider === 'facebook' && user.oauthProviders?.facebookId !== params.providerId) {
    user.oauthProviders = { ...user.oauthProviders, facebookId: params.providerId };
    modified = true;
  }
  if (!user.isVerified) {
    user.isVerified = true;
    modified = true;
  }
  user.lastLoginAt = new Date();
  if (modified || user.isModified()) {
    await user.save();
  }

  const token = signAuthToken(user);
  return { user: serializeUser(user), token };
}
