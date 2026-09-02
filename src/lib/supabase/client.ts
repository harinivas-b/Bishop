import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

  const supabaseUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : "https://placeholder.supabase.co";
  const supabaseKey = rawKey || "placeholder-key";

  return createBrowserClient(supabaseUrl, supabaseKey);
}

