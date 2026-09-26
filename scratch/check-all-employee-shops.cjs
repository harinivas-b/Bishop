const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkAll() {
  console.log("=== CHECKING ALL SHOPS AND THEIR ITEMS ===");
  const { data: shops } = await supabase.from("shops").select("*");
  for (const shop of shops || []) {
    console.log(`\nShop: "${shop.name}" (id: ${shop.id}, owner_id: ${shop.owner_id})`);
    
    // Check inventory
    const { data: inv } = await supabase.from("inventory").select("*").eq("shop_id", shop.id);
    console.log(`  inventory items count: ${inv?.length || 0}`);
    if (inv && inv.length > 0) {
      inv.forEach(i => console.log(`    - ${i.name}: ${i.quantity} ${i.unit || 'pcs'} @ ₹${i.cost_per_unit}`));
    }

    // Check menu_items
    const { data: menu } = await supabase.from("menu_items").select("*").eq("shop_id", shop.id);
    console.log(`  menu_items count: ${menu?.length || 0}`);
    if (menu && menu.length > 0) {
      menu.forEach(m => console.log(`    - ${m.name}: ₹${m.price} (is_available: ${m.is_available})`));
    }

    // Check employees for this shop
    const { data: emps } = await supabase.from("employees").select("*, profile:profiles(*)").eq("shop_id", shop.id);
    console.log(`  employees count: ${emps?.length || 0}`);
    if (emps && emps.length > 0) {
      emps.forEach(e => console.log(`    - Employee: ${e.profile?.full_name || e.id} (phone: ${e.profile?.phone}, role: ${e.role})`));
    }
  }
}

checkAll();
