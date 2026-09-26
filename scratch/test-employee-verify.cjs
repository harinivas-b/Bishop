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

async function testVerify(name, shop_name, phone) {
  console.log(`\nTesting verify for Name: "${name}", Shop: "${shop_name}", Phone: "${phone}"`);
  const cleanName = name.trim();
  const cleanShopName = shop_name.trim();
  const cleanPhone = phone.trim().replace(/\s+/g, "");

  // Find all matching employees across all shops by phone
  const { data: allEmps, error: empErr } = await adminClient
    .from("employees")
    .select(`
      id,
      shop_id,
      profile_id,
      role,
      is_active,
      shop:shops(*),
      profile:profiles(*)
    `);

  if (empErr) {
    console.error("Emp error:", empErr);
    return;
  }

  const digitsOnly = cleanPhone.replace(/\D/g, "");

  const matches = (allEmps || []).filter((emp) => {
    const prof = emp.profile;
    const shp = emp.shop;
    if (!prof || !shp) return false;

    const profPhoneDigits = (prof.phone || "").replace(/\D/g, "");
    const phoneMatches =
      digitsOnly.length >= 6 && profPhoneDigits.length >= 6 &&
      (profPhoneDigits.includes(digitsOnly) || digitsOnly.includes(profPhoneDigits));

    const nameMatches =
      prof.full_name?.toLowerCase().includes(cleanName.toLowerCase()) ||
      cleanName.toLowerCase().includes(prof.full_name?.toLowerCase());

    const shopMatches =
      shp.name?.toLowerCase().includes(cleanShopName.toLowerCase()) ||
      cleanShopName.toLowerCase().includes(shp.name?.toLowerCase());

    return (phoneMatches || nameMatches) && shopMatches;
  });

  console.log(`Found ${matches.length} matching employee record(s):`);
  matches.forEach(m => {
    console.log(`  - Employee ID: ${m.id}`);
    console.log(`    Shop ID: ${m.shop_id} ("${m.shop?.name}")`);
    console.log(`    Profile: ${m.profile?.full_name} (${m.profile?.phone})`);
  });
}

async function run() {
  await testVerify("dhania", "Ak mess", "9361915093");
  await testVerify("jai", "Ak mess", "6374960183");
  await testVerify("Gangai", "hotel", "7708100142");
}

run();
