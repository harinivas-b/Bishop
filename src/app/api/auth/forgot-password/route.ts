import { NextRequest, NextResponse } from "next/server";
import { generateOtpCode } from "@/lib/auth/otpStore";
import { sendBishopOtpEmail } from "@/lib/auth/emailService";

// Rate limiting store for OTP requests (key: email, value: timestamp ms)
const otpRequestStore = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Enforce rate limiting: 1 OTP request per 60 seconds per email
    const lastRequest = otpRequestStore.get(cleanEmail) || 0;
    const now = Date.now();
    const cooldownMs = 60 * 1000;

    if (now - lastRequest < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - (now - lastRequest)) / 1000);
      return NextResponse.json(
        {
          error: `Please wait ${waitSeconds} seconds before requesting another verification code.`,
          retryAfterSeconds: waitSeconds,
        },
        { status: 429 }
      );
    }

    // 2. Generate cryptographically secure 6-digit numeric OTP code
    const otpCode = generateOtpCode(cleanEmail);
    otpRequestStore.set(cleanEmail, now);

    // 3. Dispatch BISHOP-branded verification email containing strictly the 6-digit code (NO LINKS)
    const emailResult = await sendBishopOtpEmail({
      to: cleanEmail,
      otpCode,
    });

    if (!emailResult.success) {
      console.warn("sendBishopOtpEmail warning:", emailResult.error);
    }

    // 4. Return generic success message to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a password verification code has been sent.",
    });
  } catch (err: any) {
    console.error("API /api/auth/forgot-password error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process forgot password request." },
      { status: 500 }
    );
  }
}
