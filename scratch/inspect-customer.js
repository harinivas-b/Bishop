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

async function inspectCustomerSchema() {
  console.log("=== BISHOP CUSTOMER SCHEMA INSPECTION ===");

  // 1. Check all tables in database
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .limit(5);

  console.log("\nProfiles sample:", profiles);
  if (pErr) console.error("Profiles error:", pErr);

  // Check if customer_profiles table exists or metadata
  const { data: custProfiles, error: cErr } = await supabase
    .from("customer_profiles")
    .select("*")
    .limit(5);

  console.log("\nCustomer Profiles table check:", cErr ? cErr.message : custProfiles);
}

inspectCustomerSchema();
