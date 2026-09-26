import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  let createdOrderId: string | null = null;

  try {
    const body = await request.json();
    const { shopId, customerName, customerPhone, orderNotes, cart, subtotal, tax, total } = body;

    if (!shopId || !cart || !cart.length) {
      return NextResponse.json({ error: "Invalid order request payload" }, { status: 400 });
    }

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

    // Use service role if available for privileged triggers/RLS bypass, otherwise anon key
    const supabase = createClient(rawUrl, serviceKey || anonKey);

    const orderNumber = `BISHOP-${Math.floor(Date.now() / 1000).toString().slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;
    const numericToken = Math.floor(10000 + Math.random() * 90000);
    const finalTokenNumber = `BSH-${numericToken}`;
    const generatedOrderId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 1. Ensure products table has mapping for order_items FK constraint
    if (serviceKey) {
      for (const item of cart) {
        if (item.menu_item_id) {
          const { data: prods } = await supabase.from("products").select("id").eq("id", item.menu_item_id);
          if (!prods || prods.length === 0) {
            await supabase.from("products").insert({
              id: item.menu_item_id,
              shop_id: shopId,
              name: item.name,
              price: item.price,
              stock_quantity: 9999,
              is_available: true
            });
          } else {
            await supabase.from("products").update({ stock_quantity: 9999 }).eq("id", item.menu_item_id);
          }
        }
      }
    }

    // 2. Insert into orders table
    const orderPayload = {
      id: generatedOrderId,
      shop_id: shopId,
      order_number: orderNumber,
      token_number: numericToken,
      customer_name: customerName?.trim() || "Guest",
      customer_phone: customerPhone?.trim() || null,
      table_number: "Takeaway",
      status: "preparing",
      subtotal: subtotal,
      gst_amount: tax,
      grand_total: total,
      payment_method: "pay_at_counter",
      payment_status: "pending",
      notes: orderNotes?.trim() || "Takeaway Cash Order",
    };

    console.log("[API/orders/submit] Safe Order Payload:", {
      id: generatedOrderId,
      shop_id: shopId,
      order_number: orderNumber,
      token_number: numericToken,
      customer_name: orderPayload.customer_name,
      subtotal,
      tax,
      total,
    });

    const { error: ordErr } = await supabase.from("orders").insert(orderPayload);
    if (ordErr) {
      console.error("[API/orders/submit] Orders insert error:", {
        message: ordErr.message,
        code: ordErr.code,
        details: ordErr.details,
        hint: ordErr.hint
      });
      return NextResponse.json({
        error: ordErr.message,
        code: ordErr.code,
        details: ordErr.details,
        hint: ordErr.hint
      }, { status: 500 });
    }

    createdOrderId = generatedOrderId;

    // 3. Insert into order_items table
    const itemInserts = cart.map((item: any) => ({
      order_id: generatedOrderId,
      product_id: item.menu_item_id,
      product_name: item.name,
      unit_price: item.price,
      quantity: item.quantity,
      line_total: Number((item.price * item.quantity).toFixed(2)),
      notes: item.notes?.trim() || null,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemInserts);
    if (itemsErr) {
      console.error("[API/orders/submit] Order items insert error:", {
        message: itemsErr.message,
        code: itemsErr.code,
        details: itemsErr.details,
        hint: itemsErr.hint
      });

      // Cleanup orphan order to prevent duplicates on retry
      if (createdOrderId) {
        await supabase.from("orders").delete().eq("id", createdOrderId);
      }

      return NextResponse.json({
        error: itemsErr.message,
        code: itemsErr.code,
        details: itemsErr.details,
        hint: itemsErr.hint
      }, { status: 500 });
    }

    // 4. Update inventory stock
    const { data: invRecords } = await supabase.from("inventory").select("*").eq("shop_id", shopId);
    const invMap = new Map();
    (invRecords || []).forEach((inv: any) => {
      if (inv.name) invMap.set(inv.name.trim().toLowerCase(), { id: inv.id, quantity: inv.quantity ?? 0 });
    });

    for (const item of cart) {
      const key = item.name.trim().toLowerCase();
      if (invMap.has(key)) {
        const inv = invMap.get(key);
        const newQty = Math.max(0, inv.quantity - item.quantity);
        await supabase.from("inventory").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", inv.id);

        if (newQty === 0) {
          await supabase.from("menu_items").update({ is_available: false, updated_at: new Date().toISOString() }).eq("id", item.menu_item_id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      orderId: generatedOrderId,
      orderNumber: finalTokenNumber,
      tokenNumber: finalTokenNumber,
    });

  } catch (error: any) {
    console.error("[API/orders/submit] Unhandled Exception:", error?.message, error?.code, error?.details, error?.hint, error);

    // Rollback orphan order if created
    if (createdOrderId) {
      try {
        const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
        const supabase = createClient(rawUrl, serviceKey || anonKey);
        await supabase.from("order_items").delete().eq("order_id", createdOrderId);
        await supabase.from("orders").delete().eq("id", createdOrderId);
      } catch (cleanupErr) {
        console.error("[API/orders/submit] Cleanup error:", cleanupErr);
      }
    }

    return NextResponse.json({
      error: error?.message || "Failed to process order",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    }, { status: 500 });
  }
}
