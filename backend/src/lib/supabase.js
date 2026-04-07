import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("SUPABASE_URL or SUPABASE_ANON_KEY is not configured. Cache features are disabled.");
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

export const MENUS_TABLE = "menus";
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
