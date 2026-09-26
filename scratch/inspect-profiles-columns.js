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

async function inspectProfilesColumns() {
  console.log("=== PROFILES TABLE FULL COLUMNS ===");

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (profiles && profiles.length > 0) {
    console.log("Profiles columns:", Object.keys(profiles[0]));
    console.log("Sample profile:", profiles[0]);
  } else {
    console.log("No profiles found.");
  }
}

inspectProfilesColumns();
