'use client'

import { useMemo } from 'react'
import { useOrganization as useClerkOrganization } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'

export function useSupabase() {
  // Using useMemo with empty deps since createClient() now returns a singleton
  // This ensures we don't trigger unnecessary re-renders while still following
  // React hook best practices
  const supabase = useMemo(() => {
    return createClient()
  }, [])

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
