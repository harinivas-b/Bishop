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

async function testConstraints() {
  console.log("=== CREATING USER 1 AND USER 2 ===");
  const u1Email = `testu1_${Date.now()}@gmail.com`;
  const u2Email = `testu2_${Date.now()}@gmail.com`;

  const { data: u1Auth } = await supabaseAdmin.auth.admin.createUser({ email: u1Email, password: "Password123!", email_confirm: true, user_metadata: { full_name: "Owner One" } });
  const { data: u2Auth } = await supabaseAdmin.auth.admin.createUser({ email: u2Email, password: "Password123!", email_confirm: true, user_metadata: { full_name: "Owner Two" } });

  const u1Id = u1Auth.user.id;
  const u2Id = u2Auth.user.id;

  await supabaseAdmin.from("profiles").upsert([
    { id: u1Id, email: u1Email, full_name: "Owner One", role: "shopkeeper" },
    { id: u2Id, email: u2Email, full_name: "Owner Two", role: "shopkeeper" }
  ]);

  const client1 = createClient(supabaseUrl, anonKey);
  await client1.auth.signInWithPassword({ email: u1Email, password: "Password123!" });

  const client2 = createClient(supabaseUrl, anonKey);
  await client2.auth.signInWithPassword({ email: u2Email, password: "Password123!" });

  console.log("\n--- TEST 1: Insert Shop 1 with frontend-like payload (missing shop_name, owner_name, owner_age, phone_number) ---");
  const frontendPayload1 = {
    name: "Bakery One",
    slug: "bakery-one-" + Date.now(),
    description: "Desc 1",
    address: "Addr 1",
    location: "Loc 1",
    phone: "+91 9999900001",
    email: u1Email,
    gst_number: null,
    tax_rate: 0,
    owner_id: u1Id,
    is_active: true,
  };
  const resFrontend1 = await client1.from("shops").insert(frontendPayload1).select("*").single();
  console.log("Frontend Payload 1 Result:", resFrontend1.error ? {
    message: resFrontend1.error.message,
    code: resFrontend1.error.code,
    details: resFrontend1.error.details,
    hint: resFrontend1.error.hint,
  } : "SUCCESS: " + resFrontend1.data.id);

  console.log("\n--- TEST 2: Insert Shop 1 with FULL payload (including shop_name, owner_name, owner_age, phone_number, name, phone, slug) ---");
  const fullPayload1 = {
    ...frontendPayload1,
    shop_name: "Bakery One",
    owner_name: "Owner One",
    owner_age: 30,
    phone_number: "+91 9999900001",
  };
  const resFull1 = await client1.from("shops").insert(fullPayload1).select("*").single();
  console.log("Full Payload 1 Result:", resFull1.error ? {
    message: resFull1.error.message,
    code: resFull1.error.code,
    details: resFull1.error.details,
    hint: resFull1.error.hint,
  } : "SUCCESS: " + resFull1.data.id);

  console.log("\n--- TEST 3: Insert Shop 2 for User 2 with FULL payload ---");
  const fullPayload2 = {
    name: "Cafe Two",
    shop_name: "Cafe Two",
    owner_name: "Owner Two",
    owner_age: 28,
    slug: "cafe-two-" + Date.now(),
    description: "Desc 2",
    address: "Addr 2",
    location: "Loc 2",
    phone: "+91 9999900002",
    phone_number: "+91 9999900002",
    email: u2Email,
    gst_number: null,
    tax_rate: 0,
    owner_id: u2Id,
    is_active: true,
  };
  const resFull2 = await client2.from("shops").insert(fullPayload2).select("*").single();
  console.log("Full Payload 2 Result:", resFull2.error ? {
    message: resFull2.error.message,
    code: resFull2.error.code,
    details: resFull2.error.details,
    hint: resFull2.error.hint,
  } : "SUCCESS: " + resFull2.data.id);

  console.log("\n--- TEST 4: Check if owner_id has a UNIQUE constraint (trying to insert a second shop for User 1) ---");
  const shop2ForUser1 = {
    ...fullPayload1,
    name: "Bakery One Branch 2",
    shop_name: "Bakery One Branch 2",
    slug: "bakery-one-b2-" + Date.now(),
  };
  const resUniqueOwner = await client1.from("shops").insert(shop2ForUser1).select("*").single();
  console.log("Second Shop for User 1 Result:", resUniqueOwner.error ? {
    message: resUniqueOwner.error.message,
    code: resUniqueOwner.error.code,
    details: resUniqueOwner.error.details,
    hint: resUniqueOwner.error.hint,
  } : "SUCCESS: " + resUniqueOwner.data.id);

}

testConstraints();
