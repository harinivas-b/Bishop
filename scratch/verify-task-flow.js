import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyTaskFlowComplete() {
  console.log("====================================================");
  console.log("VERIFYING END-TO-END EMPLOYEE TASK MANAGEMENT FLOW");
  console.log("====================================================\n");

  // 1. Fetch active shop
  const { data: shops } = await supabase.from("shops").select("*").limit(1);
  if (!shops || shops.length === 0) {
    console.error("No shop found in DB.");
    return;
  }
  const shop = shops[0];
  console.log("Using Shop:", { id: shop.id, name: shop.name || shop.shop_name });

  // 2. Fetch or create employee
  let empId = null;
  const { data: employees } = await supabase.from("employees").select("*").eq("shop_id", shop.id).limit(1);

  if (employees && employees.length > 0) {
    empId = employees[0].id;
  } else {
    console.log("Creating test profile & employee record...");
    const fakeAuthId = crypto.randomUUID();
    await supabase.from("profiles").upsert({
      id: fakeAuthId,
      email: `task_test_${Date.now()}@gmail.com`,
      full_name: "Task Test Employee",
      role: "employee",
      shop_id: shop.id,
    });

    const { data: newEmp } = await supabase.from("employees").insert({
      shop_id: shop.id,
      profile_id: fakeAuthId,
      role: "staff",
      salary: 18000,
    }).select().single();

    empId = newEmp?.id;
  }

  console.log("Employee ID:", empId);

  // 3. Shop Owner assigns a task
  const taskTitle = `Prepare 100 Pastries - ${Date.now()}`;
  console.log(`\n[STEP 1: SHOP OWNER] Assigning Task: "${taskTitle}"...`);

  const newTaskPayload = {
    shop_id: shop.id,
    employee_id: empId,
    title: taskTitle,
    description: "Urgent morning order for corporate event.",
    priority: "high",
    due_date: new Date().toISOString().split("T")[0],
    status: "pending",
  };

  const { data: taskRes, error: insertErr } = await supabase
    .from("employee_tasks")
    .insert(newTaskPayload)
    .select()
    .single();

  if (insertErr) {
    console.error("❌ Step 1 Failed - Task insertion error:", insertErr);
    return;
  }

  console.log("✅ Step 1 Passed! Task created with ID:", taskRes.id, "Initial Status:", taskRes.status);

  // 4. Employee views task and starts task (pending -> in_progress)
  console.log(`\n[STEP 2: EMPLOYEE] Starting task (Status: pending -> in_progress)...`);
  const { data: startRes, error: startErr } = await supabase
    .from("employee_tasks")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", taskRes.id)
    .select()
    .single();

  if (startErr) {
    console.error("❌ Step 2 Failed - Task status update error:", startErr);
    return;
  }
  console.log("✅ Step 2 Passed! Status updated to:", startRes.status);

  // 5. Employee completes task (in_progress -> completed)
  console.log(`\n[STEP 3: EMPLOYEE] Completing task (Status: in_progress -> completed)...`);
  const { data: completeRes, error: completeErr } = await supabase
    .from("employee_tasks")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", taskRes.id)
    .select()
    .single();

  if (completeErr) {
    console.error("❌ Step 3 Failed - Task completion error:", completeErr);
    return;
  }
  console.log("✅ Step 3 Passed! Status updated to:", completeRes.status);

  // 6. Shop Owner verifies completed status
  console.log(`\n[STEP 4: SHOP OWNER OVERVIEW] Verifying completed task retrieval...`);
  const { data: ownerFetch, error: ownerFetchErr } = await supabase
    .from("employee_tasks")
    .select("*")
    .eq("id", taskRes.id)
    .single();

  if (ownerFetchErr) {
    console.error("❌ Step 4 Failed - Owner fetch error:", ownerFetchErr);
    return;
  }

  console.log("Retrieved Status:", ownerFetch.status);
  console.log("Retrieved Priority:", ownerFetch.priority);

  if (ownerFetch.status === "completed") {
    console.log("\n====================================================");
    console.log("🎉 ALL TASK MANAGEMENT FLOW VERIFICATIONS PASSED!");
    console.log("====================================================");
    console.log("✅ Complete task flow successfully verified!");
  } else {
    console.error("❌ Mismatch in final status.");
  }
}

verifyTaskFlowComplete();
