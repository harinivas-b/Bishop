const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) envVars[k.trim()] = v.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function testInventoryUpdate() {
  console.log("Fetching 'puff' from inventory...");
  const { data: puff, error: fetchErr } = await supabase
    .from('inventory')
    .select('*')
    .ilike('name', 'puff')
    .single();

  if (fetchErr || !puff) {
    console.error("Fetch puff error:", fetchErr);
    return;
  }

  console.log(`BEFORE: ${puff.name} [id: ${puff.id}] quantity = ${puff.quantity}`);

  // Test updating puff quantity
  const testTargetQty = Number(puff.quantity) + 50;
  console.log(`Updating quantity to ${testTargetQty}...`);

  const { data: updated, error: updateErr } = await supabase
    .from('inventory')
    .update({ quantity: testTargetQty })
    .eq('id', puff.id)
    .select()
    .single();

  if (updateErr) {
    console.error("Update error:", updateErr);
    return;
  }

  console.log(`AFTER UPDATE RESPONSE: ${updated.name} quantity = ${updated.quantity}`);

  // Verify by re-querying DB
  const { data: requeried } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', puff.id)
    .single();

  console.log(`AFTER RE-QUERY DB: ${requeried.name} quantity = ${requeried.quantity}`);

  // Revert back to original quantity for clean state
  await supabase.from('inventory').update({ quantity: puff.quantity }).eq('id', puff.id);
  console.log(`REVERTED BACK TO: ${puff.quantity}`);
}

testInventoryUpdate();
