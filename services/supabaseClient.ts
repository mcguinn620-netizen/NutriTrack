import { createClient } from '@supabase/supabase-js';

const env = process.env as Record<string, string | undefined>;

export const SUPABASE_URL = env.SUPABASE_URL ?? 'https://upjotaeatvessmbrorgx.supabase.co';
export const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY ?? 'sb_publishable_hFKJ7yVVcObiQ_A4ukfUjw_raclp5di';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
