import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isMissingConfig =
  !url ||
  !key ||
  url === 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co' ||
  key === 'your_supabase_anon_key';

if (isMissingConfig) {
  console.error(
    '\n[CLARY] Supabase sozlanmagan!\n' +
    '  1. .env.example faylini ko\'chirib .env yarating\n' +
    '  2. VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY ni to\'ldiring\n' +
    '  3. Ilovani qayta ishga tushiring\n'
  );
}

export const supabase = isMissingConfig
  ? null as any
  : createClient(url, key);

export const isSupabaseConfigured = !isMissingConfig;
