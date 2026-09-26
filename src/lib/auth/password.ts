/**
 * Password Policy Validation Utility for BISHOP Authentication System
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&*(),.?":{}|<>)
 */

export interface PasswordPolicyResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  errors: string[];
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\\/~`]/.test(password);

  const errors: string[] = [];

  if (!hasMinLength) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (!hasUppercase) {
    errors.push("Password must contain at least one uppercase letter (A-Z).");
  }
  if (!hasLowercase) {
    errors.push("Password must contain at least one lowercase letter (a-z).");
  }
  if (!hasNumber) {
    errors.push("Password must contain at least one number (0-9).");
  }
  if (!hasSpecialChar) {
    errors.push("Password must contain at least one special character.");
  }

  const isValid =
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar;

  return {
    isValid,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    errors,
  };
}
