import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to " +
      ".env.local and fill in your Supabase project's values (Project Settings → API).",
  );
}

// A single shared client for the whole app - Supabase's client is meant to
// be reused, not recreated per component (it manages its own realtime
// socket and auth state internally).
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
