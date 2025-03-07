// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | null = null;

// Function to initialize Supabase - will only run in the browser, not during static build
export const initSupabase = () => {
  if (!supabase && typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (supabaseUrl && supabaseAnonKey) {
      supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
  }
  return supabase;
};

// Export a function to get the supabase instance
export const getSupabaseClient = () => {
  return initSupabase();
};