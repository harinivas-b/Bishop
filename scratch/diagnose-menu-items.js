const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function getEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  content.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  });
  return env;
}

async function diagnose() {
  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

  const adminClient = createClient(url, serviceKey);
  const anonClient = createClient(url, anonKey);

  console.log("--- 1. Shops in DB ---");
  const { data: shops } = await adminClient.from("shops").select("id, name, slug");
  console.log(shops);

  for (const shop of shops || []) {
    console.log(`\n--- 2. Menu Items for Shop "${shop.name}" (${shop.id}) via Admin Key ---`);
    const { data: adminItems, error: adminErr } = await adminClient
      .from("menu_items")
      .select("id, name, price, is_available, shop_id")
      .eq("shop_id", shop.id);
    console.log(`Admin Key returned ${adminItems?.length || 0} items:`, adminErr || adminItems);

    console.log(`--- 3. Menu Items for Shop "${shop.name}" (${shop.id}) via Anon Key ---`);
    const { data: anonItems, error: anonErr } = await anonClient
      .from("menu_items")
      .select("id, name, price, is_available, shop_id")
      .eq("shop_id", shop.id);
    console.log(`Anon Key returned ${anonItems?.length || 0} items:`, anonErr || anonItems);
  }
}

diagnose();
