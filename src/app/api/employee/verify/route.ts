import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, shop_name, phone } = body;

    if (!name || !shop_name || !phone) {
      return NextResponse.json(
        { error: "Name, Shop Name, and Mobile Number are required." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanShopName = shop_name.trim();
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const digitsOnly = cleanPhone.replace(/\D/g, "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Server Configuration Error: Supabase credentials missing." },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // 1. Fetch all employees joining profile and shop
    const { data: allEmployees, error: empErr } = await adminClient
      .from("employees")
      .select(`
        id,
        shop_id,
        profile_id,
        role,
        is_active,
        shop:shops(*),
        profile:profiles(*)
      `);

    if (empErr || !allEmployees || allEmployees.length === 0) {
      return NextResponse.json(
        { error: "Employee not registered for this shop." },
        { status: 400 }
      );
    }

    // 2. Filter employees matching phone/name and shop name
    const matchingEmployees = allEmployees.filter((emp) => {
      const prof = emp.profile as any;
      const shp = emp.shop as any;
      if (!prof || !shp) return false;

      const profPhoneDigits = (prof.phone || "").replace(/\D/g, "");
      const phoneMatches =
        digitsOnly.length >= 6 && profPhoneDigits.length >= 6 &&
        (profPhoneDigits.includes(digitsOnly) || digitsOnly.includes(profPhoneDigits));

      const nameMatches =
        prof.full_name?.toLowerCase().includes(cleanName.toLowerCase()) ||
        cleanName.toLowerCase().includes(prof.full_name?.toLowerCase());

      const shopMatches =
        shp.name?.toLowerCase().includes(cleanShopName.toLowerCase()) ||
        cleanShopName.toLowerCase().includes(shp.name?.toLowerCase()) ||
        (shp.slug && cleanShopName.toLowerCase().includes(shp.slug.toLowerCase()));

      return (phoneMatches || nameMatches) && shopMatches;
    });

    if (matchingEmployees.length === 0) {
      return NextResponse.json(
        { error: `Employee "${cleanName}" not registered for shop "${cleanShopName}".` },
        { status: 400 }
      );
    }

    // Pick best matching employee record (preferably one with inventory items or active role)
    const matchedEmp = matchingEmployees[0];
    const prof = matchedEmp.profile as any;
    const shp = matchedEmp.shop as any;

    return NextResponse.json({
      success: true,
      employee: {
        employee_id: matchedEmp.id,
        profile_id: matchedEmp.profile_id,
        full_name: prof.full_name || cleanName,
        phone: prof.phone || cleanPhone,
        role: matchedEmp.role || "staff",
        shop_id: shp.id,
        shop_name: shp.name,
      },
    });
  } catch (err: any) {
    console.error("API /api/employee/verify error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

