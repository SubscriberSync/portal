import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service role client bypasses RLS - use only for server-side admin operations
// This is used by API routes and background jobs
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
