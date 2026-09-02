import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAddUpiId() {
  const { data, error } = await supabase
    .from("shops")
    .update({ upi_id: "bishop@upi" })
    .eq("id", "0a2d7905-83d4-47ac-bd46-2b31ada26eee")
    .select();
  
  if (error) {
    console.error("Error updating upi_id:", error);
  } else {
    console.log("Successfully updated shop with upi_id:", data);
  }
}

testAddUpiId();
