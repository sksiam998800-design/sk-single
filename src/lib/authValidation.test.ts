import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePasswordRules,
  normalizeEmail,
  normalizeFullName,
  sanitizeAuthRedirectPath,
  validateConfirmPassword,
  validateEmailAddress,
  validateFullName,
  validatePasswordStrength,
  validateRegistrationFields,
} from './authValidation';

describe('NOVARA authValidation shared logic', () => {
  it('normalizes email addresses consistently regardless of case or whitespace', () => {
    assert.equal(normalizeEmail('  Customer@Example.COM  '), 'customer@example.com');
    assert.equal(normalizeEmail('\tAyesha.Akter@Novara.com.bd\n'), 'ayesha.akter@novara.com.bd');
  });

  it('normalizes and validates full names safely', () => {
    assert.equal(normalizeFullName('   Ayesha   Akter   '), 'Ayesha Akter');
    assert.ok(validateFullName('   '));
    assert.ok(validateFullName('A'));
    assert.ok(validateFullName('123456'));
    assert.equal(validateFullName('Ayesha Akter'), null);
  });

  it('rejects invalid emails and accepts normalized valid emails', () => {
    assert.ok(validateEmailAddress(''));
    assert.ok(validateEmailAddress('not-an-email'));
    assert.ok(validateEmailAddress('user@domain'));
    assert.equal(validateEmailAddress('  Buyer@Novara.BD '), null);
  });

  it('enforces minimum 8 chars plus uppercase, lowercase, and number', () => {
    assert.ok(validatePasswordStrength('Short1A'));
    assert.ok(validatePasswordStrength('alllowercase123'));
    assert.ok(validatePasswordStrength('ALLUPPERCASE123'));
    assert.ok(validatePasswordStrength('NoNumbersHere'));
    assert.equal(validatePasswordStrength('NovaraPass2026'), null);

    const rules = evaluatePasswordRules('NovaraPass2026');
    assert.deepEqual(rules, {
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasNumber: true,
    });
  });

  it('enforces matching password confirmation', () => {
    assert.ok(validateConfirmPassword('NovaraPass2026', ''));
    assert.ok(validateConfirmPassword('NovaraPass2026', 'NovaraPass2025'));
    assert.equal(validateConfirmPassword('NovaraPass2026', 'NovaraPass2026'), null);
  });

  it('validates complete registration form payload and returns normalized identity', () => {
    const invalid = validateRegistrationFields({
      name: ' ',
      email: 'bad-email',
      password: '123',
      confirmPassword: '456',
    });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.name);
    assert.ok(invalid.errors.email);
    assert.ok(invalid.errors.password);
    assert.ok(invalid.errors.confirmPassword);

    const valid = validateRegistrationFields({
      name: '  Tariq   Mahmud ',
      email: '  Tariq@Novara.COM ',
      password: 'StrongPassword9',
      confirmPassword: 'StrongPassword9',
    });
    assert.equal(valid.valid, true);
    assert.deepEqual(valid.errors, {});
    assert.equal(valid.normalized.name, 'Tariq Mahmud');
    assert.equal(valid.normalized.email, 'tariq@novara.com');
  });

  it('sanitizes redirect destinations cleanly and prevents open redirects or auth loops', () => {
    assert.equal(sanitizeAuthRedirectPath('/wishlist'), '/wishlist');
    assert.equal(sanitizeAuthRedirectPath('/account/orders?page=2'), '/account/orders?page=2');
    assert.equal(sanitizeAuthRedirectPath('https://evil.example.com'), '/account');
    assert.equal(sanitizeAuthRedirectPath('//evil.example.com'), '/account');
    assert.equal(sanitizeAuthRedirectPath('/login'), '/account');
    assert.equal(sanitizeAuthRedirectPath('/register'), '/account');
    assert.equal(sanitizeAuthRedirectPath(null), '/account');
  });
});
