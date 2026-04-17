import { createClient } from '@supabase/supabase-js';

// TODO: Move these credentials to EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY env vars.
const SUPABASE_URL = 'https://drtuuuqtgihqvzcripec.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRydHV1dXF0Z2locXZ6Y3JpcGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjAzNjksImV4cCI6MjA5MTQzNjM2OX0.ls4fI6gvxbEtiFxJhtzzYfFG6tf95Av4V5Z1flYNk-k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
