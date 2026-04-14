import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://drtuuuqtgihqvzcripec.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRydHV1dXF0Z2locXZ6Y3JpcGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjAzNjksImV4cCI6MjA5MTQzNjM2OX0.ls4fI6gvxbEtiFxJhtzzYfFG6tf95Av4V5Z1flYNk-k';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? FALLBACK_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? FALLBACK_SUPABASE_ANON_KEY;

if (__DEV__) {
  console.log('[supabaseClient] Using Supabase URL:', SUPABASE_URL);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
