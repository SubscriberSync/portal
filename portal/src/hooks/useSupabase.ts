'use client'

import { useMemo } from 'react'
import { useSession, useOrganization as useClerkOrganization } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'

export function useSupabase() {
  const { session } = useSession()

  const supabase = useMemo(() => {
    const client = createClient()

    // If we have a Clerk session, we'll use the JWT for RLS
    // The server-side client handles this via the server.ts file
    // For client-side, we use the anon key and RLS policies

    return client
  }, [session])

  return supabase
}

// Hook to get the current user's organization ID from Clerk
export function useOrganization() {
  const { organization } = useClerkOrganization()

  const orgId = useMemo(() => {
    return organization?.id || null
  }, [organization])

  return orgId
}
