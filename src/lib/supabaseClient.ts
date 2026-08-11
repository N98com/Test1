import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY moeten ingesteld zijn.');
}

export const supabase = createClient(url, anonKey);
