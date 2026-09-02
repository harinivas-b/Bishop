import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testShopSetup() {
  const testEmail = `test_${Date.now()}@gmail.com`;
  const uid = crypto.randomUUID();
  console.log("Testing with UID:", uid);

  console.log("3. Creating shop...");
  const shopId = crypto.randomUUID();
  
  const insertPayload = {
    id: shopId,
    name: "Test Shop",
    shop_name: "Test Shop",
    owner_id: uid,
    owner_name: "Test User",
    owner_age: 25,
    location: "Test Location",
    description: "Test Desc",
    address: "123 Test St",
    phone_number: "+911234567890",
    email: testEmail,
    gst_number: "GST123",
    tax_rate: 5,
    currency: "INR",
  };
  
  const { error: shopError } = await supabase.from("shops").insert(insertPayload);
  
  if (shopError) {
    if (shopError.code === '42501') {
      console.log("RLS triggered, which means schema constraints PASSED!");
    } else {
      console.error("Shop Creation ERROR:", shopError);
    }
  } else {
    console.log("Success! No DB errors for shop insertion.");
  }
}

testShopSetup();
