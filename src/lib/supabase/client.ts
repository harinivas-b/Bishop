import { createBrowserClient } from "@supabase/ssr";

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Creates or retrieves a browser-side Supabase client singleton instance.
 * Reusing the instance prevents duplicate auth listeners and connection overhead.
 */
export function createClient() {
  if (clientInstance) return clientInstance;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

  const supabaseUrl =
    rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : "https://placeholder.supabase.co";
  const supabaseKey = rawKey || "placeholder-key";

  clientInstance = createBrowserClient(supabaseUrl, supabaseKey);
  return clientInstance;
}
