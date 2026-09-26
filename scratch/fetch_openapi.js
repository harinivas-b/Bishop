const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8").split("\n").reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim();
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function fetchOpenApi() {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      "apikey": anonKey,
      "Accept": "application/openapi+json"
    }
  });
  const data = await res.json();
  console.log("=== SHOPS TABLE PROPERTIES IN OPENAPI ===");
  if (data.definitions && data.definitions.shops) {
    console.log("Required fields:", data.definitions.shops.required);
    console.log("Properties:", Object.keys(data.definitions.shops.properties));
    console.log("Full definition:", JSON.stringify(data.definitions.shops, null, 2));
  } else {
    console.log("Keys in definitions:", Object.keys(data.definitions || {}));
  }
}

fetchOpenApi();
