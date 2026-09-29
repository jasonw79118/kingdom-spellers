// Supabase client — created only when env vars are present AND Appwrite is
// not configured. Kept out of the main bundle when unused.

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Lazily create the client so the Supabase SDK is only pulled in if actually
// selected (see backend.js).
let client = null;

export function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    // Dynamic import is resolved by the caller; see supabaseBackend.
  }
  return client;
}

export async function initSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(url, anonKey);
  }
  return client;
}

export const supabase = null;
