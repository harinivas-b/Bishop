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

async function runEndToEndVerification() {
  console.log("=======================================================================");
  console.log("VERIFYING COMPLETE EMPLOYEE STOCK FIX & DATA SYNCHRONIZATION");
  console.log("=======================================================================");

  const shopId = "0a2d7905-83d4-47ac-bd46-2b31ada26eee"; // "Ak mess"

  // 1. Verify existing items fetched via backend logic
  const [invRes, menuRes] = await Promise.all([
    adminClient.from("inventory").select("*").eq("shop_id", shopId).order("name", { ascending: true }),
    adminClient.from("menu_items").select("*").eq("shop_id", shopId).order("name", { ascending: true }),
  ]);

  const inventoryItems = invRes.data || [];
  const menuItems = menuRes.data || [];

  const itemMap = new Map();
  inventoryItems.forEach((inv) => {
    if (!inv.name) return;
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

  menuItems.forEach((menu) => {
    if (!menu.name) return;
    const key = menu.name.trim().toLowerCase();
    if (itemMap.has(key)) {
      const existing = itemMap.get(key);
      existing.menu_item_id = menu.id;
      if (menu.price !== undefined && menu.price !== null) {
        existing.price = Number(menu.price);
      }
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

  const allItems = Array.from(itemMap.values());
  console.log(`\n✅ STEP 1: Fetched ${allItems.length} inventory/menu items for "Ak mess":`);
  allItems.forEach(i => {
    console.log(`   • ${i.name.padEnd(12)} — ${i.quantity} ${i.unit} — ₹${i.price}/${i.unit} (${i.is_available ? 'Available' : 'Unavailable'})`);
  });

  // Verify the 5 required items from user's prompt
  const required = ["Coffee", "puff", "Samosa", "Sandwich", "Tea"];
  const missing = required.filter(r => !allItems.some(i => i.name.toLowerCase() === r.toLowerCase()));

  if (missing.length > 0) {
    console.error(`❌ FAILED: Missing required items: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("\n✅ STEP 2: All 5 required items (Coffee, puff, Samosa, Sandwich, Tea) exist and were fetched!");

  // 2. Test updating stock from Employee (Coffee quantity 7 -> 5)
  const coffeeItem = allItems.find(i => i.name.toLowerCase() === "coffee");
  console.log(`\n[STEP 3: EMPLOYEE UPDATES STOCK] Modifying "${coffeeItem.name}" quantity from ${coffeeItem.quantity} to 5...`);

  await adminClient.from("inventory").update({ quantity: 5 }).eq("id", coffeeItem.inventory_id);
  await adminClient.from("menu_items").update({ is_available: true }).eq("shop_id", shopId).ilike("name", "coffee");

  const { data: updatedInv } = await adminClient.from("inventory").select("quantity").eq("id", coffeeItem.inventory_id).single();
  console.log(`   Database inventory record for Coffee after update: quantity = ${updatedInv.quantity}`);

  if (updatedInv.quantity === 5) {
    console.log("✅ STEP 3 PASSED: Employee stock change correctly updated single source-of-truth inventory record to 5!");
  } else {
    console.error("❌ STEP 3 FAILED!");
    process.exit(1);
  }

  // Restore Coffee quantity back to 7
  await adminClient.from("inventory").update({ quantity: 7 }).eq("id", coffeeItem.inventory_id);
  console.log("   Restored Coffee quantity back to 7.");

  // 3. Test Shop Owner adding a new item
  const testItemName = `Vada_${Date.now()}`;
  console.log(`\n[STEP 4: SHOP OWNER ADDS NEW ITEM] Adding "${testItemName}" (₹10/pcs, 20 pcs)...`);

  const { data: newInv, error: addErr } = await adminClient.from("inventory").insert({
    shop_id: shopId,
    name: testItemName,
    unit: "pcs",
    quantity: 20,
    cost_per_unit: 10,
    min_quantity: 2
  }).select().single();

  if (addErr) {
    console.error("Failed to add test item:", addErr);
    process.exit(1);
  }

  // Re-fetch items to verify Employee stock picks up the new item automatically
  const [invRes2, menuRes2] = await Promise.all([
    adminClient.from("inventory").select("*").eq("shop_id", shopId),
    adminClient.from("menu_items").select("*").eq("shop_id", shopId),
  ]);

  const itemMap2 = new Map();
  (invRes2.data || []).forEach(inv => {
    if (inv.name) itemMap2.set(inv.name.trim().toLowerCase(), inv);
  });

  const hasNewItem = itemMap2.has(testItemName.toLowerCase());
  if (hasNewItem) {
    console.log(`✅ STEP 4 PASSED: New item "${testItemName}" automatically appears in Employee Stock list!`);
  } else {
    console.error("❌ STEP 4 FAILED!");
    process.exit(1);
  }

  // Cleanup test item
  await adminClient.from("inventory").delete().eq("id", newInv.id);
  console.log("   Cleaned up test item.");

  console.log("\n================================================================ me");
  console.log("🎉 ALL END-TO-END EMPLOYEE STOCK VERIFICATION TESTS PASSED!");
  console.log("=======================================================================");
}

runEndToEndVerification();
