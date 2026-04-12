import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Manually parse .env because process.env won't hook automatically without dotenv/config in ES modules
const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if(!supabaseUrl || !supabaseKey) {
  console.log("XATO: .env faylida VITE_SUPABASE_URL yoki VITE_SUPABASE_ANON_KEY topilmadi!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Supabase ulanishi tekshirilmoqda...');
  console.log('URL:', supabaseUrl);
  
  // Test connection by fetching 1 row from generic patients table
  const { data, error } = await supabase.from('users').select('*').limit(1);
  
  if (error) {
    console.log('XATOLIK YUZ BERDI: (Bu holat RLS policy sababli bo\'lishi ham mumkin yoki table yo\'qligidan)');
    console.error(error.message);
  } else {
    console.log('✅ ULANISH MUVAFFAQIYATLI! Supabase javobi:');
    console.log(data);
  }
}

testConnection();
