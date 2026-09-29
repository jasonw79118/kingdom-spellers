// Unified backend interface.
//
// Exposes a single `backend` object whose methods are async and identical
// whether the app is running against Supabase (production) or the local
// demo-mode adapter (development / no credentials). Components never import
// Supabase directly — they import { backend } from here.

import { supabase, isSupabaseConfigured } from "./supabase";
import { createSupabaseBackend } from "./supabaseBackend";
import { localBackend } from "./localBackend";

export const backendMode = isSupabaseConfigured ? "supabase" : "demo";

const supabaseBackend = supabase ? createSupabaseBackend(supabase) : null;

export const backend = isSupabaseConfigured && supabaseBackend ? supabaseBackend : localBackend;

export { isSupabaseConfigured };
