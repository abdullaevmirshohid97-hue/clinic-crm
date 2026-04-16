import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || url === 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co') {
  throw new Error(
    '[CLARY] VITE_SUPABASE_URL sozlanmagan.\n' +
    '.env.example faylini nusxa olib .env yarating va VITE_SUPABASE_URL ni to\'ldiring.'
  );
}

if (!key || key === 'your_supabase_anon_key') {
  throw new Error(
    '[CLARY] VITE_SUPABASE_ANON_KEY sozlanmagan.\n' +
    '.env.example faylini nusxa olib .env yarating va VITE_SUPABASE_ANON_KEY ni to\'ldiring.'
  );
}

export const supabase = createClient(url, key);
