import { createClient } from "@supabase/supabase-js";

// .trim() guards against a trailing newline or space from pasting the value
// into a dashboard field (e.g. Vercel's env var UI) — REST calls tolerate
// that extra whitespace since it rides in a header, but the realtime
// WebSocket embeds the key in a URL query string and rejects the connection
// outright if it's not an exact match.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

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
