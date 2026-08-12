import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

function getEnvVar(key: string, viteKey: string, fallback: string): string {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[viteKey]) {
      return (import.meta as any).env[viteKey];
    }
  } catch {
    // Ignore
  }

  try {
    const globalProcess = (globalThis as any)?.process;
    if (globalProcess?.env?.[key]) {
      return globalProcess.env[key];
    }
    if (globalProcess?.env?.[viteKey]) {
      return globalProcess.env[viteKey];
    }
  } catch {
    // Ignore
  }

  return fallback;
}

const supabaseUrl = getEnvVar(
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'https://your-project-ref.supabase.co'
);

const supabaseAnonKey = getEnvVar(
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'your-anon-key-placeholder'
);

if (!supabaseUrl || supabaseUrl.includes('your-project-ref')) {
  console.warn(
    '[Supabase] Using placeholder Supabase configuration. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;
