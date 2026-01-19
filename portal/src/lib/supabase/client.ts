import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern - reuse the same client instance across the app
// This prevents creating multiple GoTrue client instances which can cause issues
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
