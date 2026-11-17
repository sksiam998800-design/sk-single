export interface RegistrationFieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function normalizeFullName(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function validateFullName(name: string): string | null {
  const cleaned = normalizeFullName(name);
  if (!cleaned) {
    return 'Full name is required.';
  }
  if (cleaned.length < 2) {
    return 'Full name must be at least 2 characters.';
  }
  if (cleaned.length > 100) {
    return 'Full name must not exceed 100 characters.';
  }
  if (!/[a-zA-Z\u0980-\u09FF]/.test(cleaned)) {
    return 'Please enter a valid full name.';
  }
  return null;
}

export function validateEmailAddress(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return 'Email address is required.';
  }
  if (normalized.length > 254 || !EMAIL_REGEX.test(normalized)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export interface PasswordRuleResult {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

export function evaluatePasswordRules(password: string): PasswordRuleResult {
  const value = String(password || '');
  return {
    minLength: value.length >= 8,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasNumber: /[0-9]/.test(value),
  };
}

export function validatePasswordStrength(password: string): string | null {
  const value = String(password || '');
  if (!value) {
    return 'Password is required.';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (value.length > 128) {
    return 'Password must not exceed 128 characters.';
  }
  const rules = evaluatePasswordRules(value);
  if (!rules.hasUppercase || !rules.hasLowercase || !rules.hasNumber) {
    return 'Password must include uppercase, lowercase, and at least one number.';
  }
  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  const confirm = String(confirmPassword || '');
  if (!confirm) {
    return 'Please confirm your password.';
  }
  if (String(password || '') !== confirm) {
    return 'Passwords do not match.';
  }
  return null;
}

export function validateRegistrationFields(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): {
  valid: boolean;
  errors: RegistrationFieldErrors;
  normalized: { name: string; email: string };
} {
  const errors: RegistrationFieldErrors = {};

  const nameError = validateFullName(input.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmailAddress(input.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePasswordStrength(input.password);
  if (passwordError) errors.password = passwordError;

  const confirmError = validateConfirmPassword(input.password, input.confirmPassword);
  if (confirmError) errors.confirmPassword = confirmError;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      name: normalizeFullName(input.name),
      email: normalizeEmail(input.email),
    },
  };
}

export function sanitizeAuthRedirectPath(rawPath?: string | null, fallback = '/account'): string {
  const value = String(rawPath || '').trim();
  if (!value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }
  const lower = value.toLowerCase();
  if (
    lower.startsWith('/login') ||
    lower.startsWith('/signin') ||
    lower.startsWith('/register') ||
    lower.startsWith('/signup') ||
    lower.startsWith('/forgot-password')
  ) {
    return fallback;
  }
  return value;
}
