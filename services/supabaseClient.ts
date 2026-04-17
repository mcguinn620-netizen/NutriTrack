import { createClient } from '@supabase/supabase-js';

function readRequiredEnv(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[supabaseClient] Missing required environment variable: ${name}`);
  }

  return value;
}

const SUPABASE_URL = readRequiredEnv('EXPO_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = readRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
