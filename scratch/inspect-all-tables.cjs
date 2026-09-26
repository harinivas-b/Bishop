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

async function checkTaskTables() {
  const tableCandidates = ["tasks", "employee_tasks", "notifications", "menu_items", "inventory", "employees"];
  for (const table of tableCandidates) {
    const { data, error } = await supabase.from(table).select("*").limit(2);
    if (error) {
      console.log(`Table "${table}": Error - ${error.message}`);
    } else {
      console.log(`Table "${table}": Found ${data?.length} row(s). Sample keys:`, data?.[0] ? Object.keys(data[0]) : "[]");
      if (data && data.length > 0) {
        console.log(JSON.stringify(data[0], null, 2));
      }
    }
  }
}

checkTaskTables();
