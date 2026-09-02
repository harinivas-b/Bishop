import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogoUrl() {
  const { data, error } = await supabase
    .from("shops")
    .update({ logo_url: "https://example.com/test.png" })
    .eq("id", "0a2d7905-83d4-47ac-bd46-2b31ada26eee")
    .select();
  
  console.log("logo_url test:", { data, error });
}

testLogoUrl();
