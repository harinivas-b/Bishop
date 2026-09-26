import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyOtpCode } from "@/lib/auth/otpStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (cleanCode.length < 6) {
      return NextResponse.json(
        { error: "Verification code must be 6 digits." },
        { status: 400 }
      );
    }

    // 1. Verify against server OTP store
    const localResult = verifyOtpCode(cleanEmail, cleanCode);

    if (localResult.valid && localResult.resetToken) {
      return NextResponse.json({
        success: true,
        message: "Code verified successfully! You can now set a new password.",
        reset_authorization_token: localResult.resetToken,
      });
    }

    // 2. Fallback: Try verifying with Supabase Auth recovery tokens
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (supabaseUrl && anonKey) {
      try {
        const supabase = createClient(supabaseUrl, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: supaData, error: supaErr } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "recovery",
        });

        if (!supaErr && supaData?.session) {
          // Re-verify local store to issue resetToken
          const retryResult = verifyOtpCode(cleanEmail, cleanCode);
          const issuedToken = retryResult.resetToken || supaData.session.access_token;

          return NextResponse.json({
            success: true,
            message: "Code verified successfully! You can now set a new password.",
            reset_authorization_token: issuedToken,
            access_token: supaData.session.access_token,
            refresh_token: supaData.session.refresh_token,
          });
        }
      } catch (supaErr) {
        console.warn("Supabase verifyOtp fallback note:", supaErr);
      }
    }

    // 3. Return failure message if code is invalid or expired
    return NextResponse.json(
      { error: localResult.error || "Invalid or expired verification code." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("API /api/auth/verify-otp error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to verify code." },
      { status: 500 }
    );
  }
}
