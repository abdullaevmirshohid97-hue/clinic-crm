import { createClient } from '@supabase/supabase-js';

const isTest = import.meta.env.MODE === 'test';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (isTest ? 'http://localhost:54321' : '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (isTest ? 'test-anon-key' : '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
