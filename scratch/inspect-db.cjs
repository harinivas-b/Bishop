const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) envVars[k.trim()] = v.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Service Key defined:", Boolean(serviceKey));

const supabase = createClient(supabaseUrl, serviceKey);

async function inspect() {
  console.log("\n=== INSPECTING INVENTORY TABLE ===");
  const { data: inventory, error: invErr } = await supabase.from('inventory').select('*').limit(20);
  if (invErr) {
    console.error("Inventory fetch error:", invErr);
  } else {
    console.log(`Found ${inventory.length} inventory rows:`);
    inventory.forEach(i => console.log(`  - [id: ${i.id}] shop:${i.shop_id} name:"${i.name}" qty:${i.quantity} unit:${i.unit}`));
  }

  console.log("\n=== INSPECTING MENU_ITEMS TABLE ===");
  const { data: menuItems, error: menuErr } = await supabase.from('menu_items').select('*').limit(20);
  if (menuErr) {
    console.error("Menu fetch error:", menuErr);
  } else {
    console.log(`Found ${menuItems.length} menu rows:`);
    menuItems.forEach(m => console.log(`  - [id: ${m.id}] shop:${m.shop_id} name:"${m.name}" price:${m.price} avail:${m.is_available}`));
  }

  console.log("\n=== INSPECTING EMPLOYEE_TASKS TABLE ===");
  const { data: tasks, error: taskErr } = await supabase.from('employee_tasks').select('*').limit(20);
  if (taskErr) {
    console.error("Task fetch error:", taskErr);
  } else {
    console.log(`Found ${tasks.length} task rows:`);
    tasks.forEach(t => console.log(`  - [id: ${t.id}] shop:${t.shop_id} title:"${t.title}" status:${t.status} items:`, t.items || t.task_items || 'N/A'));
  }

  console.log("\n=== INSPECTING NOTIFICATIONS TABLE ===");
  const { data: notifs, error: notifErr } = await supabase.from('notifications').select('*').limit(20);
  if (notifErr) {
    console.error("Notif fetch error:", notifErr);
  } else {
    console.log(`Found ${notifs.length} notification rows:`);
    notifs.forEach(n => console.log(`  - [id: ${n.id}] task_id:${n.task_id} title:"${n.title}" metadata_items:`, n.metadata?.task_items || n.metadata?.items || 'N/A'));
  }
}

inspect();
