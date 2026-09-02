import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRpcs() {
  const { data, error } = await supabase.rpc("submit_customer_order", {
    p_shop_id: "0a2d7905-83d4-47ac-bd46-2b31ada26eee",
    p_table_number: "Table 1",
    p_items: []
  });
  console.log("RPC result:", { data, error });
}

checkRpcs();
