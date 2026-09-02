import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProfileInsertWithoutAuthUser() {
  const fakeUuid = crypto.randomUUID();
  console.log("Testing inserting profile with random UUID:", fakeUuid);

  const { data, error } = await supabase.from("profiles").insert({
    id: fakeUuid,
    email: `test_random_${Date.now()}@gmail.com`,
    full_name: "Random Test Employee",
    role: "employee",
    phone: "+919876543210",
    shop_id: "0a2d7905-83d4-47ac-bd46-2b31ada26eee"
  });

  console.log("Profile insert result:", { data, error });
}

testProfileInsertWithoutAuthUser();
