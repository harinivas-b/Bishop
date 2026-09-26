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

async function runTest() {
  console.log("=== CREATING USER 1 AND SHOP 1 ===");
  const user1Email = `user1_${Date.now()}@gmail.com`;
  const { data: user1Auth, error: u1Err } = await supabaseAdmin.auth.admin.createUser({
    email: user1Email,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "User One" }
  });
  if (u1Err) console.error("User 1 Auth Error:", u1Err);
  const u1Id = user1Auth?.user?.id;

  await supabaseAdmin.from("profiles").upsert({
    id: u1Id,
    email: user1Email,
    full_name: "User One",
    role: "shopkeeper"
  });

  const client1 = createClient(supabaseUrl, anonKey);
  await client1.auth.signInWithPassword({ email: user1Email, password: "Password123!" });

  const payload1 = {
    name: "First Bakery",
    shop_name: "First Bakery",
    owner_name: "User One",
    owner_age: 30,
    slug: "first-bakery-" + Date.now(),
    description: "First bakery description",
    address: "123 Main St",
    location: "City A",
    phone: "+91 9876543210",
    phone_number: "+91 9876543210",
    email: user1Email,
    gst_number: "GST111",
    tax_rate: 5,
    owner_id: u1Id,
    is_active: true,
  };

  console.log("Inserting Shop 1 Payload:", payload1);
  const res1 = await client1.from("shops").insert(payload1).select("*").single();
  if (res1.error) {
    console.error("Shop 1 Error:", {
      message: res1.error.message,
      code: res1.error.code,
      details: res1.error.details,
      hint: res1.error.hint,
    });
  } else {
    console.log("Shop 1 Inserted Successfully! ID:", res1.data.id);
  }

  console.log("\n=== CREATING USER 2 AND SHOP 2 ===");
  const user2Email = `user2_${Date.now()}@gmail.com`;
  const { data: user2Auth, error: u2Err } = await supabaseAdmin.auth.admin.createUser({
    email: user2Email,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "User Two" }
  });
  if (u2Err) console.error("User 2 Auth Error:", u2Err);
  const u2Id = user2Auth?.user?.id;

  await supabaseAdmin.from("profiles").upsert({
    id: u2Id,
    email: user2Email,
    full_name: "User Two",
    role: "shopkeeper"
  });

  const client2 = createClient(supabaseUrl, anonKey);
  await client2.auth.signInWithPassword({ email: user2Email, password: "Password123!" });

  const payload2 = {
    name: "Second Cafe",
    shop_name: "Second Cafe",
    owner_name: "User Two",
    owner_age: 28,
    slug: "second-cafe-" + Date.now(),
    description: "Second cafe description",
    address: "456 Side St",
    location: "City B",
    phone: "+91 9876543211",
    phone_number: "+91 9876543211",
    email: user2Email,
    gst_number: "GST222",
    tax_rate: 5,
    owner_id: u2Id,
    is_active: true,
  };

  console.log("Inserting Shop 2 Payload:", payload2);
  const res2 = await client2.from("shops").insert(payload2).select("*").single();
  if (res2.error) {
    console.error("💥 Shop 2 Error:", {
      message: res2.error.message,
      code: res2.error.code,
      details: res2.error.details,
      hint: res2.error.hint,
    });
  } else {
    console.log("Shop 2 Inserted Successfully! ID:", res2.data.id);
  }
}

runTest();
