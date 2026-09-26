const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const crypto = require("crypto");

const env = fs.readFileSync(".env.local", "utf8").split("\n").reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim();
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function testEmptyInsert() {
  const uid = crypto.randomUUID();
  console.log("=== TESTING INSERT WITH PHONE_NUMBER ===");
  const res = await supabaseAdmin.from("shops").insert({ 
    owner_id: uid, 
    shop_name: "Test Shop", 
    owner_name: "Owner Name", 
    owner_age: 25,
    location: "Coimbatore",
    phone_number: "+91 9876543210"
  }).select("*").single();
  console.log("Error from insert:");
  console.log({
    message: res.error?.message,
    code: res.error?.code,
    details: res.error?.details,
    hint: res.error?.hint,
  });
  if (res.data) console.log("Success! Data:", res.data);
}

testEmptyInsert();
