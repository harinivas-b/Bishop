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

async function inspectTaskSchema() {
  console.log("=== INSPECTING EMPLOYEE_TASKS TABLE ===");
  const { data: tasks, error: taskErr } = await supabase.from("employee_tasks").select("*").limit(5);
  if (taskErr) {
    console.error("Task query error:", taskErr.message);
  } else {
    console.log("Found tasks:", tasks?.length);
    if (tasks && tasks.length > 0) {
      console.log("Sample task object keys:", Object.keys(tasks[0]));
      console.log(JSON.stringify(tasks, null, 2));
    }
  }
}

inspectTaskSchema();
