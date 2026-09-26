import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectBug() {
  console.log("=== 1. SHOPS ===");
  const { data: shops, error: shopsErr } = await supabase.from("shops").select("*");
  console.log("Shops count:", shops?.length, shopsErr || "");
  console.log(JSON.stringify(shops, null, 2));

  console.log("\n=== 2. EMPLOYEES ===");
  const { data: employees, error: empErr } = await supabase.from("employees").select("*");
  console.log("Employees count:", employees?.length, empErr || "");
  console.log(JSON.stringify(employees, null, 2));

  console.log("\n=== 3. MENU ITEMS ===");
  const { data: menuItems, error: menuErr } = await supabase.from("menu_items").select("*");
  console.log("Menu Items count:", menuItems?.length, menuErr || "");
  console.log(JSON.stringify(menuItems, null, 2));

  console.log("\n=== 4. INVENTORY / ITEMS (if table exists) ===");
  const { data: invItems, error: invErr } = await supabase.from("inventory").select("*");
  if (invErr) {
    console.log("inventory table error:", invErr.message);
  } else {
    console.log("inventory count:", invItems?.length);
    console.log(JSON.stringify(invItems, null, 2));
  }
}

inspectBug();
