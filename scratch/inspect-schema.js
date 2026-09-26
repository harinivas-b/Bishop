const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2 && !line.startsWith("#")) {
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim();
    envVars[key] = val;
  }
});

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = envVars["SUPABASE_SERVICE_ROLE_KEY"];

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log("=== BISHOP DATABASE SCHEMA INSPECTION ===");
  console.log("Supabase URL:", supabaseUrl);

  // 1. Fetch sample shops data to inspect existing columns and sample values
  console.log("\n--- 1. SHOPS TABLE SAMPLE ROW & COLUMNS ---");
  const { data: shops, error: shopsErr } = await supabase
    .from("shops")
    .select("*")
    .limit(10);

  if (shopsErr) {
    console.error("Error fetching shops sample:", shopsErr);
  } else {
    console.log(`Found ${shops.length} sample shops.`);
    if (shops.length > 0) {
      console.log("All Column Names in 'shops' table:", Object.keys(shops[0]));
      console.log("\nSample Shops Rows:");
      shops.forEach((s, idx) => {
        console.log(`\nShop #${idx + 1}: ID=${s.id} | Name=${s.name} | Slug=${s.slug}`);
        console.log(`  Latitude: ${s.latitude} (${typeof s.latitude})`);
        console.log(`  Longitude: ${s.longitude} (${typeof s.longitude})`);
        console.log(`  Location Text: "${s.location}"`);
        console.log(`  Address Text: "${s.address}"`);
        console.log(`  Description: "${s.description}"`);
        console.log(`  Is Active: ${s.is_active}`);
        console.log(`  Owner ID: ${s.owner_id}`);
      });
    }
  }
}

inspectSchema();
