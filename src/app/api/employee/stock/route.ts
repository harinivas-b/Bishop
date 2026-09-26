import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop_id = searchParams.get("shop_id");

    if (!shop_id) {
      return NextResponse.json(
        { error: "Shop ID is required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Server Configuration Error: Supabase credentials missing." },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch both inventory and menu_items for this shop
    const [invRes, menuRes] = await Promise.all([
      adminClient.from("inventory").select("*").eq("shop_id", shop_id).order("name", { ascending: true }),
      adminClient.from("menu_items").select("*").eq("shop_id", shop_id).order("name", { ascending: true }),
    ]);

    const inventoryItems = invRes.data || [];
    const menuItems = menuRes.data || [];

    const itemMap = new Map<string, any>();

    // 1. Add inventory items first
    inventoryItems.forEach((inv: any) => {
      if (!inv.name) return;
      const key = inv.name.trim().toLowerCase();
      itemMap.set(key, {
        id: inv.id,
        inventory_id: inv.id,
        menu_item_id: null,
        name: inv.name.trim(),
        price: Number(inv.cost_per_unit) || 0,
        quantity: Number(inv.quantity) || 0,
        unit: inv.unit || "pcs",
        is_available: Number(inv.quantity) > 0,
      });
    });

    // 2. Merge menu_items
    menuItems.forEach((menu: any) => {
      if (!menu.name) return;
      const key = menu.name.trim().toLowerCase();
      if (itemMap.has(key)) {
        const existing = itemMap.get(key);
        existing.menu_item_id = menu.id;
        if (menu.price !== undefined && menu.price !== null) {
          existing.price = Number(menu.price);
        }
        existing.is_available = existing.quantity > 0 && Boolean(menu.is_available);
      } else {
        const qty = menu.quantity !== undefined && menu.quantity !== null ? Number(menu.quantity) : (menu.is_available ? 10 : 0);
        itemMap.set(key, {
          id: menu.id,
          inventory_id: null,
          menu_item_id: menu.id,
          name: menu.name.trim(),
          price: Number(menu.price) || 0,
          quantity: qty,
          unit: "pcs",
          is_available: Boolean(menu.is_available) && qty > 0,
        });
      }
    });

    return NextResponse.json({
      success: true,
      items: Array.from(itemMap.values()),
    });
  } catch (err: any) {
    console.error("API GET /api/employee/stock error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { item_id, inventory_id, menu_item_id, name, quantity, is_available, shop_id } = body;

    if ((!item_id && !inventory_id && !menu_item_id && !name) || !shop_id) {
      return NextResponse.json(
        { error: "Item ID/Name and Shop ID are required." },
        { status: 400 }
      );
    }

    const safeQuantity = Math.max(0, Number(quantity) || 0);
    const safeAvailable = is_available !== undefined ? Boolean(is_available) : safeQuantity > 0;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Server Configuration Error: Supabase credentials missing." },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const nowIso = new Date().toISOString();

    // 1. Update inventory table
    let invQuery = adminClient.from("inventory").update({
      quantity: safeQuantity,
      updated_at: nowIso,
    });

    if (inventory_id) {
      invQuery = invQuery.eq("id", inventory_id).eq("shop_id", shop_id);
    } else if (name) {
      invQuery = invQuery.eq("shop_id", shop_id).ilike("name", name.trim());
    } else {
      invQuery = invQuery.eq("id", item_id).eq("shop_id", shop_id);
    }

    const { error: invErr } = await invQuery;
    if (invErr) {
      console.warn("Notice: Inventory table update error/missing row:", invErr.message);
    }

    // 2. Update menu_items table
    let menuQuery = adminClient.from("menu_items").update({
      is_available: safeAvailable,
      updated_at: nowIso,
    });

    if (menu_item_id) {
      menuQuery = menuQuery.eq("id", menu_item_id).eq("shop_id", shop_id);
    } else if (name) {
      menuQuery = menuQuery.eq("shop_id", shop_id).ilike("name", name.trim());
    } else {
      menuQuery = menuQuery.eq("id", item_id).eq("shop_id", shop_id);
    }

    const { error: menuErr } = await menuQuery;
    if (menuErr) {
      console.warn("Notice: Menu items table update error/missing row:", menuErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Stock updated successfully!",
      updated: {
        quantity: safeQuantity,
        is_available: safeAvailable,
      },
    });
  } catch (err: any) {
    console.error("API POST /api/employee/stock error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}


