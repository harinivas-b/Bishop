const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8").split("\n").reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim();
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function inspect() {
  console.log("--- 1. INSPECTING SHOPS TABLE COLUMNS ---");
  const { data: cols, error: colsErr } = await supabase.rpc("exec_sql", {
    sql: `SELECT column_name, data_type, is_nullable, column_default 
          FROM information_schema.columns 
          WHERE table_name = 'shops';`
  });
  if (colsErr) {
    // If rpc exec_sql doesn't exist, try standard select or query via RPC if available, or fetch sample row
    console.log("RPC exec_sql error, fetching a row or inspecting table directly via REST if possible:", colsErr.message);
  } else {
    console.log(cols);
  }

  // Let's query existing shops to see what columns exist
  const { data: shops, error: shopsErr } = await supabase.from("shops").select("*").limit(5);
  console.log("\n--- EXISTING SHOPS (Sample) ---");
  if (shopsErr) {
    console.error("Error fetching shops:", shopsErr);
  } else {
    console.log("Count:", shops.length);
    console.log(shops);
  }
}

inspect();
