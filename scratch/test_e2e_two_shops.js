const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8").split("\n").reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim();
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

async function insertShopWithFallback(supabaseClient, shopPayload) {
  let { data, error } = await supabaseClient.from("shops").insert(shopPayload).select("*").single();

  if (error && (error.code === "PGRST204" || error.code === "42703" || error.message?.includes("column"))) {
    delete shopPayload.latitude;
    delete shopPayload.longitude;
    const retryRes = await supabaseClient.from("shops").insert(shopPayload).select("*").single();
    data = retryRes.data;
    error = retryRes.error;
  }

  return { data, error };
}

async function testE2ETwoShops() {
  console.log("=========================================");
  console.log("STARTING E2E TEST FOR SHOP 1 AND SHOP 2");
  console.log("=========================================\n");

  // 1. User 1 Registration & Login
  const u1Email = `e2e_owner1_${Date.now()}@gmail.com`;
  const { data: u1Auth, error: u1Err } = await supabaseAdmin.auth.admin.createUser({
    email: u1Email,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Owner One" }
  });
  if (u1Err) throw u1Err;
  const u1Id = u1Auth.user.id;

  await supabaseAdmin.from("profiles").upsert({
    id: u1Id,
    email: u1Email,
    full_name: "Owner One",
    role: "shopkeeper"
  });

  const client1 = createClient(supabaseUrl, anonKey);
  await client1.auth.signInWithPassword({ email: u1Email, password: "Password123!" });

  // Shop 1 Form submission payload logic
  const shop1Form = {
    name: "Royal Bakery",
    description: "Freshly baked pastries and cakes __LAT__:10.998 __LNG__:76.962",
    address: "101 Bakery Lane",
    location: "Coimbatore South",
    phone_number: "+91 9876543210",
    email: u1Email,
    gst_number: "33AAAAA0000A1Z1",
    tax_rate: "5",
    owner_age: "35",
  };

  const slug1 = generateSlug(shop1Form.name) + "-" + Date.now();
  const shop1Payload = {
    name: shop1Form.name.trim(),
    shop_name: shop1Form.name.trim(),
    owner_name: "Owner One",
    owner_age: parseInt(shop1Form.owner_age),
    slug: slug1,
    description: shop1Form.description,
    address: shop1Form.address,
    location: shop1Form.location,
    latitude: 10.998,
    longitude: 76.962,
    phone: shop1Form.phone_number.trim(),
    phone_number: shop1Form.phone_number.trim(),
    email: shop1Form.email.trim(),
    gst_number: shop1Form.gst_number,
    tax_rate: parseFloat(shop1Form.tax_rate),
    owner_id: u1Id,
    is_active: true,
  };

  console.log("--- 1. Submitting Shop 1 ---");
  const res1 = await insertShopWithFallback(client1, shop1Payload);
  if (res1.error) {
    console.error("Shop 1 Failed:", {
      message: res1.error.message,
      code: res1.error.code,
      details: res1.error.details,
      hint: res1.error.hint,
    });
    return;
  }
  const shop1Data = res1.data;
  console.log("✅ Shop 1 Created Successfully! ID:", shop1Data.id, "| Name:", shop1Data.name || shop1Data.shop_name);

  // 2. User 2 Registration & Login
  const u2Email = `e2e_owner2_${Date.now()}@gmail.com`;
  const { data: u2Auth, error: u2Err } = await supabaseAdmin.auth.admin.createUser({
    email: u2Email,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Owner Two" }
  });
  if (u2Err) throw u2Err;
  const u2Id = u2Auth.user.id;

  await supabaseAdmin.from("profiles").upsert({
    id: u2Id,
    email: u2Email,
    full_name: "Owner Two",
    role: "shopkeeper"
  });

  const client2 = createClient(supabaseUrl, anonKey);
  await client2.auth.signInWithPassword({ email: u2Email, password: "Password123!" });

  // Shop 2 Form submission payload logic
  const shop2Form = {
    name: "Spice Garden Restaurant",
    description: "Authentic South Indian & Biryani __LAT__:11.018 __LNG__:76.955",
    address: "202 Spice Street",
    location: "Coimbatore North",
    phone_number: "+91 9123456789",
    email: u2Email,
    gst_number: "33BBBBB0000B1Z2",
    tax_rate: "12",
    owner_age: "42",
  };

  const slug2 = generateSlug(shop2Form.name) + "-" + Date.now();
  const shop2Payload = {
    name: shop2Form.name.trim(),
    shop_name: shop2Form.name.trim(),
    owner_name: "Owner Two",
    owner_age: parseInt(shop2Form.owner_age),
    slug: slug2,
    description: shop2Form.description,
    address: shop2Form.address,
    location: shop2Form.location,
    latitude: 11.018,
    longitude: 76.955,
    phone: shop2Form.phone_number.trim(),
    phone_number: shop2Form.phone_number.trim(),
    email: shop2Form.email.trim(),
    gst_number: shop2Form.gst_number,
    tax_rate: parseFloat(shop2Form.tax_rate),
    owner_id: u2Id,
    is_active: true,
  };

  console.log("\n--- 2. Submitting Shop 2 ---");
  const res2 = await insertShopWithFallback(client2, shop2Payload);
  if (res2.error) {
    console.error("💥 Shop 2 Failed:", {
      message: res2.error.message,
      code: res2.error.code,
      details: res2.error.details,
      hint: res2.error.hint,
    });
    return;
  }
  const shop2Data = res2.data;
  console.log("✅ Shop 2 Created Successfully! ID:", shop2Data.id, "| Name:", shop2Data.name || shop2Data.shop_name);

  // 3. Verify Shop 1 in Supabase remains unchanged
  console.log("\n--- 3. Verifying Shop 1 integrity in Supabase ---");
  const { data: verifyShop1 } = await supabaseAdmin.from("shops").select("*").eq("id", shop1Data.id).single();
  console.log("Shop 1 Name:", verifyShop1.name || verifyShop1.shop_name, "| Owner ID:", verifyShop1.owner_id);
  if ((verifyShop1.name === shop1Data.name || verifyShop1.shop_name === shop1Data.shop_name) && verifyShop1.owner_id === u1Id) {
    console.log("✅ Existing Shop 1 remains unchanged!");
  } else {
    console.error("❌ Shop 1 was altered!");
  }

  // 4. Verify Customer Shop Discovery sees both shops
  console.log("\n--- 4. Verifying Customer Shop Discovery ---");
  const customerClient = createClient(supabaseUrl, anonKey);
  const { data: customerShops, error: custErr } = await customerClient
    .from("shops")
    .select("*")
    .eq("is_active", true);

  if (custErr) {
    console.error("Customer discovery error:", custErr);
  } else {
    console.log("Total Active Shops visible to Customer Discovery:", customerShops.length);
    const hasShop1 = customerShops.some(s => s.id === shop1Data.id);
    const hasShop2 = customerShops.some(s => s.id === shop2Data.id);
    console.log("Shop 1 visible to customers:", hasShop1 ? "✅ YES" : "❌ NO");
    console.log("Shop 2 visible to customers:", hasShop2 ? "✅ YES" : "❌ NO");
  }
}

testE2ETwoShops();
