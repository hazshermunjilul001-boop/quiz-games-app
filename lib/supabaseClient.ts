// lib/supabaseClient.ts
// Thin wrapper so the rest of the app can check "is persistence available"
// instead of crashing when NEXT_PUBLIC_SUPABASE_URL / ANON_KEY aren't set.
// This keeps local import-and-play working with zero configuration, and
// only requires Supabase once a teacher wants to save & share a link.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local — see supabase/schema.sql for setup."
    );
  }
  if (!client) {
    client = createClient(url!, anonKey!);
  }
  return client;
}
