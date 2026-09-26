import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// In-memory server-side fallback tracker (persists per server instance)
interface AttemptRecord {
  consecutive_failed: number;
  total_failed: number;
  locked_until: string | null;
  updated_at: string;
}

const memoryAttemptStore = new Map<string, AttemptRecord>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: "Server authentication configuration missing." },
        { status: 500 }
      );
    }

    // Admin client for persistent storage operations
    const adminClient = serviceKey
      ? createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

    // Standard client for password verification
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Fetch current attempt record for this email
    let currentAttempt: AttemptRecord = {
      consecutive_failed: 0,
      total_failed: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    };

    // Check memory store
    if (memoryAttemptStore.has(cleanEmail)) {
      currentAttempt = { ...memoryAttemptStore.get(cleanEmail)! };
    }

    // Check Supabase DB table if available
    if (adminClient) {
      try {
        const { data: dbData } = await adminClient
          .from("login_attempts")
          .select("consecutive_failed, total_failed, locked_until, updated_at")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (dbData) {
          currentAttempt = {
            consecutive_failed: dbData.consecutive_failed ?? 0,
            total_failed: dbData.total_failed ?? 0,
            locked_until: dbData.locked_until || null,
            updated_at: dbData.updated_at || new Date().toISOString(),
          };
          memoryAttemptStore.set(cleanEmail, currentAttempt);
        }
      } catch (dbErr) {
        console.warn("login_attempts table fetch warning:", dbErr);
      }
    }

    const now = Date.now();

    // 2. Check Maximum Attempts Policy (15 total failed attempts)
    if (currentAttempt.total_failed >= 15) {
      return NextResponse.json(
        {
          status: "max_attempts",
          error: "Maximum login attempts reached. Please contact the owner.",
          total_failed: currentAttempt.total_failed,
        },
        { status: 429 }
      );
    }

    // 3. Check Temporary 30-Second Lockout Policy (2 consecutive failed attempts)
    if (
      currentAttempt.consecutive_failed >= 2 &&
      currentAttempt.locked_until
    ) {
      const lockTime = new Date(currentAttempt.locked_until).getTime();
      const remainingSeconds = Math.ceil((lockTime - now) / 1000);

      if (remainingSeconds > 0) {
        return NextResponse.json(
          {
            status: "locked",
            error: `Too many failed attempts. Please wait ${remainingSeconds} seconds.`,
            remainingSeconds,
            consecutive_failed: currentAttempt.consecutive_failed,
            total_failed: currentAttempt.total_failed,
          },
          { status: 429 }
        );
      }
    }

    // 4. Perform Supabase Auth password verification
    const { data: authData, error: authError } =
      await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    // 5. SUCCESSFUL LOGIN
    if (!authError && authData?.session) {
      currentAttempt.consecutive_failed = 0;
      currentAttempt.locked_until = null;
      currentAttempt.updated_at = new Date().toISOString();

      memoryAttemptStore.set(cleanEmail, currentAttempt);

      if (adminClient) {
        try {
          await adminClient.from("login_attempts").upsert({
            email: cleanEmail,
            consecutive_failed: 0,
            total_failed: currentAttempt.total_failed,
            locked_until: null,
            updated_at: currentAttempt.updated_at,
          });
        } catch (dbErr) {
          console.warn("login_attempts upsert warning on success:", dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        session: authData.session,
        user: authData.user,
      });
    }

    // 6. FAILED LOGIN (WRONG PASSWORD)
    const newConsecutive = currentAttempt.consecutive_failed + 1;
    const newTotal = currentAttempt.total_failed + 1;
    let newLockedUntil: string | null = null;

    if (newConsecutive >= 2) {
      newLockedUntil = new Date(Date.now() + 30000).toISOString();
    }

    const updatedRecord: AttemptRecord = {
      consecutive_failed: newConsecutive,
      total_failed: newTotal,
      locked_until: newLockedUntil,
      updated_at: new Date().toISOString(),
    };

    memoryAttemptStore.set(cleanEmail, updatedRecord);

    if (adminClient) {
      try {
        await adminClient.from("login_attempts").upsert({
          email: cleanEmail,
          consecutive_failed: newConsecutive,
          total_failed: newTotal,
          locked_until: newLockedUntil,
          updated_at: updatedRecord.updated_at,
        });
      } catch (dbErr) {
        console.warn("login_attempts upsert warning on failure:", dbErr);
      }
    }

    // Return appropriate security error response
    if (newTotal >= 15) {
      return NextResponse.json(
        {
          status: "max_attempts",
          error: "Maximum login attempts reached. Please contact the owner.",
          consecutive_failed: newConsecutive,
          total_failed: newTotal,
        },
        { status: 429 }
      );
    }

    if (newConsecutive >= 2) {
      return NextResponse.json(
        {
          status: "locked",
          error: "Too many failed attempts. Please wait 30 seconds.",
          remainingSeconds: 30,
          consecutive_failed: newConsecutive,
          total_failed: newTotal,
        },
        { status: 429 }
      );
    }

    const authMsg =
      authError?.message?.includes("Invalid login credentials") ||
      authError?.code === "invalid_credentials"
        ? "Invalid email or password."
        : authError?.message || "Invalid email or password.";

    return NextResponse.json(
      {
        status: "failed",
        error: authMsg,
        consecutive_failed: newConsecutive,
        total_failed: newTotal,
      },
      { status: 401 }
    );
  } catch (err: any) {
    console.error("API /api/auth/login error:", err);
    return NextResponse.json(
      { error: err?.message || "Authentication error." },
      { status: 500 }
    );
  }
}
