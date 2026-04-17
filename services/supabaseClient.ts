import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://upjotaeatvessmbrorgx.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'sb_publishable_hFKJ7yVVcObiQ_A4ukfUjw_raclp5di';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? FALLBACK_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? FALLBACK_SUPABASE_ANON_KEY;

if (__DEV__) {
  console.log('[supabaseClient] Using Supabase URL:', SUPABASE_URL);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
