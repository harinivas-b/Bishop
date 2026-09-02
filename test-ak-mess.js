const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const env = fs.readFileSync(".env.local", "utf8").split("\n").reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim();
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSetup() {
  console.log("Creating test user...");
  
  const email = `akmess${Math.floor(Math.random() * 10000)}@gmail.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email,
    password: "Password123!",
    options: {
      data: {
        full_name: "AK Mess Owner"
      }
    }
  });

  if (authError) {
    if (authError.message.includes("rate limit")) {
      console.log("Signup rate limit hit! Cannot create new users to test natively. Ask user to test manually.");
      return;
    }
    console.error("Auth Error:", authError);
    return;
  }

  const userId = authData.user.id;
  console.log("Created User ID:", userId);

  // 1. Create Profile
  console.log("Inserting profile...");
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    email: authData.user.email,
    full_name: "AK Mess Owner",
    role: "shopkeeper"
  });

  if (profileError) {
    console.error("Profile Error:", profileError);
    return;
  }

  // 2. Insert Shop based on user params
  console.log("Inserting Shop...");
  const shopId = crypto.randomUUID();
  const shopPayload = {
    id: shopId,
    name: "Ak mess",
    slug: "ak-mess-" + Date.now().toString(36),
    owner_id: userId,
    owner_age: 25,
    location: "coimbatore",
    address: "kinathukadavu",
    phone_number: "6374960183",
    tax_rate: 0.01,
    currency: "INR",
    is_active: true
  };

  const { data: insertedShop, error: shopError } = await supabase.from("shops").insert(shopPayload).select();

  if (shopError) {
    console.error("\n💥 INSERTION FAILED WITH ERROR:");
    console.error(JSON.stringify(shopError, null, 2));
  } else {
    console.log("\n✅ INSERTION SUCCEEDED!");
    console.log(insertedShop);
  }
}

testSetup();
