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

async function listTables() {
  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, key);

  const tables = ["employees", "employee_tasks", "notifications", "profiles", "shops", "menu_items", "orders"];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("count", { count: "exact", head: true });
    console.log(`Table '${t}':`, error ? error.message : `Exists (${data} rows)`);
  }
}

listTables();
