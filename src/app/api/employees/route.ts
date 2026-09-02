import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, full_name, phone, role, salary, shop_id } = body;

    if (!email || !full_name || !shop_id) {
      return NextResponse.json(
        { error: "Email, Full Name, and Shop ID are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();
    const cleanPhone = phone ? phone.trim() : null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !serviceKey || (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://"))) {
      return NextResponse.json(
        {
          error:
            "Server Configuration Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required to create employees securely.",
        },
        { status: 500 }
      );
    }

    // 1. Initialize Supabase Admin Client using Service Role Key (SERVER ONLY)
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Get authenticated server client representing the active Shopkeeper
    const serverSupabase = await createServerClient();
    const {
      data: { user: currentUser },
    } = await serverSupabase.auth.getUser();

    // Verify shop ownership if authenticated user is present
    if (currentUser) {
      const { data: shopRecord } = await adminClient
        .from("shops")
        .select("id, owner_id")
        .eq("id", shop_id)
        .maybeSingle();

      if (shopRecord && shopRecord.owner_id !== currentUser.id) {
        return NextResponse.json(
          { error: "Unauthorized: You can only add employees to your own shop." },
          { status: 403 }
        );
      }
    }

    // 3. Check if profile already exists for this email
    let targetProfileId: string | null = null;
    const { data: existingProfiles } = await adminClient
      .from("profiles")
      .select("id, email, shop_id")
      .eq("email", cleanEmail);

    if (existingProfiles && existingProfiles.length > 0) {
      targetProfileId = existingProfiles[0].id;
    }

    // Check if employee record already exists for this shop
    if (targetProfileId) {
      const { data: existingEmp } = await adminClient
        .from("employees")
        .select("id")
        .eq("shop_id", shop_id)
        .eq("profile_id", targetProfileId)
        .maybeSingle();

      if (existingEmp) {
        return NextResponse.json(
          { error: `Employee "${cleanName}" (${cleanEmail}) is already added to your shop.` },
          { status: 400 }
        );
      }
    }

    // 4. Create Auth User using Admin Auth API (bypasses email confirmation & email rate limits)
    if (!targetProfileId) {
      const tempPassword = `Bishop_${Date.now().toString(36)}!`;

      const { data: adminUser, error: adminErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true, // Pre-confirms account so no verification email is sent
        user_metadata: { full_name: cleanName, phone: cleanPhone },
      });

      if (adminUser?.user?.id) {
        targetProfileId = adminUser.user.id;
      } else if (adminErr) {
        // If user already exists in auth.users, try finding profile again
        const { data: foundProf } = await adminClient
          .from("profiles")
          .select("id")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (foundProf?.id) {
          targetProfileId = foundProf.id;
        } else {
          return NextResponse.json(
            { error: adminErr.message || "Failed to create employee Auth account." },
            { status: 400 }
          );
        }
      }
    }

    if (!targetProfileId) {
      return NextResponse.json(
        { error: "Could not obtain a valid Auth User ID for employee." },
        { status: 400 }
      );
    }

    // 5. Upsert Profile using adminClient
    const profilePayload: any = {
      id: targetProfileId,
      email: cleanEmail,
      full_name: cleanName,
      role: "employee",
      shop_id: shop_id,
    };

    let { error: profileError } = await adminClient.from("profiles").upsert({
      ...profilePayload,
      phone: cleanPhone,
    });

    if (
      profileError &&
      (profileError.code === "PGRST204" || profileError.message?.includes("phone"))
    ) {
      const { error: profileErrorNoPhone } = await adminClient
        .from("profiles")
        .upsert(profilePayload);
      if (profileErrorNoPhone) {
        return NextResponse.json(
          { error: `Profile creation failed: ${profileErrorNoPhone.message}` },
          { status: 400 }
        );
      }
    } else if (profileError) {
      return NextResponse.json(
        { error: `Profile creation failed: ${profileError.message}` },
        { status: 400 }
      );
    }

    // 6. Insert into employees table
    const { error: empError } = await adminClient.from("employees").insert({
      shop_id: shop_id,
      profile_id: targetProfileId,
      role: role || "staff",
      salary: salary ? parseFloat(salary) : null,
      is_active: true,
    });

    if (empError) {
      return NextResponse.json(
        { error: `Employee record creation failed: ${empError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Employee "${cleanName}" added successfully!`,
      profile_id: targetProfileId,
    });
  } catch (err: any) {
    console.error("API /api/employees error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
