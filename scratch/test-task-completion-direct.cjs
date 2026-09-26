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

async function testTaskCompletionDirect() {
  console.log('====================================================');
  console.log('STARTING TASK COMPLETION & INVENTORY VERIFICATION TEST');
  console.log('====================================================\n');

  const shopId = '0a2d7905-83d4-47ac-bd46-2b31ada26eee';

  // 1. Fetch initial inventory directly from Supabase
  const { data: initialInv, error: invErr } = await supabase
    .from('inventory')
    .select('*')
    .eq('shop_id', shopId);

  if (invErr || !initialInv || initialInv.length === 0) {
    console.error('Failed to fetch initial inventory:', invErr);
    return;
  }

  const puffBefore = initialInv.find(i => i.name.toLowerCase().includes('puff'));
  const samosaBefore = initialInv.find(i => i.name.toLowerCase().includes('samosa'));

  console.log('1. INITIAL DATABASE INVENTORY STATE:');
  console.log(`   Puff   (id: ${puffBefore.id}): quantity = ${puffBefore.quantity}`);
  console.log(`   Samosa (id: ${samosaBefore.id}): quantity = ${samosaBefore.quantity}`);

  const originalPuffQty = Number(puffBefore.quantity);
  const originalSamosaQty = Number(samosaBefore.quantity);

  // 2. Create Task via API
  console.log('\n2. ASSIGNING TASK via POST /api/employee/tasks...');
  const taskPayload = {
    action: 'create',
    shop_id: shopId,
    employee_id: 'emp-jai-123',
    employee_profile_id: 'profile-jai-123',
    title: 'Stock Update — Puff (50), Samosa (20)',
    description: 'Please refill evening stock.',
    priority: 'high',
    task_items: [
      {
        inventory_id: puffBefore.id,
        name: puffBefore.name,
        quantity: 50,
        unit: puffBefore.unit || 'pcs'
      },
      {
        inventory_id: samosaBefore.id,
        name: samosaBefore.name,
        quantity: 20,
        unit: samosaBefore.unit || 'pcs'
      }
    ]
  };

  const createRes = await fetch('http://localhost:3000/api/employee/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskPayload)
  });
  const createData = await createRes.json();
  console.log(`   Task Creation Response: ${createRes.status}`, createData.message);

  const taskId = createData.task?.id || `task_${Date.now()}`;

  // 3. Status -> in_progress (Accept & Start)
  console.log('\n3. EMPLOYEE CLICKS "Accept & Start" (status -> in_progress)...');
  const startRes = await fetch('http://localhost:3000/api/employee/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_status',
      task_id: taskId,
      status: 'in_progress',
      shop_id: shopId
    })
  });
  const startData = await startRes.json();
  console.log(`   Start Task Response: ${startRes.status}`, startData.message);

  // Verify DB quantity remained unchanged
  const { data: midPuff } = await supabase.from('inventory').select('quantity').eq('id', puffBefore.id).single();
  const { data: midSamosa } = await supabase.from('inventory').select('quantity').eq('id', samosaBefore.id).single();

  console.log(`   ✓ DB Verification during "In Progress":`);
  console.log(`     Puff Qty in DB = ${midPuff.quantity} (Expected: ${originalPuffQty})`);
  console.log(`     Samosa Qty in DB = ${midSamosa.quantity} (Expected: ${originalSamosaQty})`);

  if (Number(midPuff.quantity) !== originalPuffQty || Number(midSamosa.quantity) !== originalSamosaQty) {
    console.error('❌ FAILURE: Stock changed prematurely before task completion!');
    return;
  }
  console.log('   ✓ PASS: Stock remained unchanged on Accept & Start!');

  // 4. Status -> completed (Mark as Completed)
  console.log('\n4. EMPLOYEE CLICKS "Mark as Completed" (status -> completed)...');
  const completeRes = await fetch('http://localhost:3000/api/employee/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_status',
      task_id: taskId,
      status: 'completed',
      shop_id: shopId,
      task_items: taskPayload.task_items,
      task: createData.task
    })
  });
  const completeData = await completeRes.json();
  console.log(`   Completion Response: ${completeRes.status}`, completeData.message);

  // 5. Query Supabase Database directly to verify updated quantity
  const { data: afterPuff } = await supabase.from('inventory').select('quantity').eq('id', puffBefore.id).single();
  const { data: afterSamosa } = await supabase.from('inventory').select('quantity').eq('id', samosaBefore.id).single();

  const expectedPuff = originalPuffQty + 50;
  const expectedSamosa = originalSamosaQty + 20;

  console.log('\n5. DIRECT SUPABASE DATABASE VERIFICATION AFTER COMPLETION:');
  console.log(`   Puff:   Before ${originalPuffQty} + 50 = ${afterPuff.quantity} (Expected: ${expectedPuff})`);
  console.log(`   Samosa: Before ${originalSamosaQty} + 20 = ${afterSamosa.quantity} (Expected: ${expectedSamosa})`);

  if (Number(afterPuff.quantity) === expectedPuff && Number(afterSamosa.quantity) === expectedSamosa) {
    console.log('   ✓ PASS: Inventory updated atomically in Supabase DB!');
  } else {
    console.error('❌ FAILURE: Database inventory quantity mismatch!');
    return;
  }

  // 6. Test Duplicate Completion Protection (Idempotency)
  console.log('\n6. TESTING DUPLICATE COMPLETION PROTECTION...');
  const dupRes = await fetch('http://localhost:3000/api/employee/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_status',
      task_id: taskId,
      status: 'completed',
      shop_id: shopId,
      task_items: taskPayload.task_items
    })
  });
  const dupData = await dupRes.json();
  console.log(`   Duplicate Completion Response: ${dupRes.status}`, dupData.message);

  const { data: dupPuff } = await supabase.from('inventory').select('quantity').eq('id', puffBefore.id).single();
  console.log(`   Puff Qty in DB after repeated completion = ${dupPuff.quantity} (Expected: ${expectedPuff})`);

  if (Number(dupPuff.quantity) === expectedPuff) {
    console.log('   ✓ PASS: Duplicate completion prevented! Stock did NOT increment twice.');
  } else {
    console.error('❌ FAILURE: Stock incremented twice on duplicate request!');
    return;
  }

  // 7. Cleanup & Revert stock back to original quantities for clean state
  console.log('\n7. REVERTING TEST STOCK BACK TO ORIGINAL QUANTITIES FOR TEARDOWN...');
  await supabase.from('inventory').update({ quantity: originalPuffQty }).eq('id', puffBefore.id);
  await supabase.from('inventory').update({ quantity: originalSamosaQty }).eq('id', samosaBefore.id);
  console.log('   ✓ Cleaned up test stock.');

  console.log('\n====================================================');
  console.log('ALL VERIFICATIONS PASSED 100% SUCCESSFULLY 🎉');
  console.log('====================================================');
}

testTaskCompletionDirect();
