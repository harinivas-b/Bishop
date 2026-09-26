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

const adminClient = createClient(supabaseUrl, serviceKey);

async function testUnifiedStockFetch(shopId) {
  console.log(`\n=== FETCHING UNIFIED STOCK FOR SHOP ID: ${shopId} ===`);

  const [invRes, menuRes] = await Promise.all([
    adminClient.from("inventory").select("*").eq("shop_id", shopId).order("name", { ascending: true }),
    adminClient.from("menu_items").select("*").eq("shop_id", shopId).order("name", { ascending: true })
  ]);

  if (invRes.error) console.error("Inv err:", invRes.error);
  if (menuRes.error) console.error("Menu err:", menuRes.error);

  const inventoryItems = invRes.data || [];
  const menuItems = menuRes.data || [];

  const itemMap = new Map();

  // 1. Process inventory items first
  inventoryItems.forEach((inv) => {
    const key = inv.name.trim().toLowerCase();
    itemMap.set(key, {
      id: inv.id,
      inventory_id: inv.id,
      menu_item_id: null,
      name: inv.name.trim(),
      price: Number(inv.cost_per_unit) || 0,
      quantity: Number(inv.quantity) || 0,
      unit: inv.unit || "pcs",
      is_available: Number(inv.quantity) > 0,
    });
  });

  // 2. Merge menu_items
  menuItems.forEach((menu) => {
    const key = menu.name.trim().toLowerCase();
    if (itemMap.has(key)) {
      const existing = itemMap.get(key);
      existing.menu_item_id = menu.id;
      if (menu.price) existing.price = Number(menu.price);
      existing.is_available = existing.quantity > 0 && Boolean(menu.is_available);
    } else {
      const qty = menu.quantity !== undefined && menu.quantity !== null ? Number(menu.quantity) : (menu.is_available ? 10 : 0);
      itemMap.set(key, {
        id: menu.id,
        inventory_id: null,
        menu_item_id: menu.id,
        name: menu.name.trim(),
        price: Number(menu.price) || 0,
        quantity: qty,
        unit: "pcs",
        is_available: Boolean(menu.is_available) && qty > 0,
      });
    }
  });

  const mergedList = Array.from(itemMap.values());
  console.log(`Merged ${mergedList.length} stock item(s):`);
  mergedList.forEach((it) => {
    console.log(`  - ${it.name} | ₹${it.price}/${it.unit} | Stock: ${it.quantity} ${it.unit} | Status: ${it.is_available ? 'Available' : 'Unavailable'}`);
  });

  return mergedList;
}

async function run() {
  // Test Ak mess shop
  await testUnifiedStockFetch("0a2d7905-83d4-47ac-bd46-2b31ada26eee");

  // Test hotel shop
  await testUnifiedStockFetch("4cf7ed60-73b5-4028-81db-f1b4d8d72184");
}

run();
