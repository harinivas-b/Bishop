import crypto from "crypto";

interface OtpEntry {
  email: string;
  otp: string;
  expires_at: number; // Timestamp ms
  attempts: number;
}

interface ResetTokenEntry {
  email: string;
  resetToken: string;
  expires_at: number; // Timestamp ms
}

// Global server-side stores (persist across requests per server process)
const otpStore = new Map<string, OtpEntry>();
const resetTokenStore = new Map<string, ResetTokenEntry>();

/**
 * Generate a 6-digit numeric OTP code for the specified email address.
 * OTP expires in 10 minutes.
 */
export function generateOtpCode(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  
  // Generate cryptographically secure 6-digit numeric string
  const randomBuffer = crypto.randomBytes(3);
  const numericValue = (randomBuffer.readUIntBE(0, 3) % 900000) + 100000;
  const otpCode = numericValue.toString();

  const expires_at = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(cleanEmail, {
    email: cleanEmail,
    otp: otpCode,
    expires_at,
    attempts: 0,
  });

  return otpCode;
}

/**
 * Verify a 6-digit OTP code for an email address.
 * On success, issues a secure 10-minute reset_authorization_token required for Step 3.
 */
export function verifyOtpCode(
  email: string,
  inputCode: string
): { valid: boolean; resetToken?: string; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = inputCode.trim();

  const entry = otpStore.get(cleanEmail);

  if (!entry) {
    return {
      valid: false,
      error: "No verification code requested for this email. Please request a new code.",
    };
  }

  // Check expiration
  if (Date.now() > entry.expires_at) {
    otpStore.delete(cleanEmail);
    return {
      valid: false,
      error: "Verification code has expired. Please request a new code.",
    };
  }

  // Check max failed attempts on OTP
  if (entry.attempts >= 5) {
    otpStore.delete(cleanEmail);
    return {
      valid: false,
      error: "Too many incorrect verification attempts. Please request a new code.",
    };
  }

  // Verify OTP match
  if (entry.otp !== cleanCode) {
    entry.attempts += 1;
    otpStore.set(cleanEmail, entry);
    return {
      valid: false,
      error: "Incorrect verification code. Please check your email and try again.",
    };
  }

  // OTP is valid! Invalidate the used OTP
  otpStore.delete(cleanEmail);

  // Generate secure 32-byte hex reset_authorization_token for Step 3
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  resetTokenStore.set(cleanEmail, {
    email: cleanEmail,
    resetToken,
    expires_at: tokenExpiresAt,
  });

  return {
    valid: true,
    resetToken,
  };
}

/**
 * Validate whether a reset_authorization_token is valid and active for the specified email.
 */
export function validateResetToken(email: string, token: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const entry = resetTokenStore.get(cleanEmail);

  if (!entry) return false;
  if (entry.resetToken !== token) return false;
  if (Date.now() > entry.expires_at) {
    resetTokenStore.delete(cleanEmail);
    return false;
  }

  return true;
}

/**
 * Consume and delete the reset_authorization_token after a successful password update.
 */
export function consumeResetToken(email: string, token: string): void {
  const cleanEmail = email.trim().toLowerCase();
  const entry = resetTokenStore.get(cleanEmail);

  if (entry && entry.resetToken === token) {
    resetTokenStore.delete(cleanEmail);
  }
}
