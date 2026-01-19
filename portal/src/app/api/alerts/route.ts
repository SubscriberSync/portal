import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

interface Alert {
  id: string
  type: 'no_box' | 'address_issue'
  severity: 'red' | 'orange'
  count: number
  message: string
  actionUrl?: string
}

/**
 * GET /api/alerts
 * Get critical alerts for the organization (flagged shipments, address issues, etc.)
 */
export async function GET() {
  const { orgId, orgSlug } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const alerts: Alert[] = []

    // Check for flagged shipments (address issues, etc.)
    const { data: flaggedShipments, error: flaggedError } = await supabase
      .from('shipments')
      .select('id, flag_reason')
      .eq('organization_id', orgId)
      .eq('status', 'Flagged')

    if (!flaggedError && flaggedShipments && flaggedShipments.length > 0) {
      // Group by flag reason
      const addressIssues = flaggedShipments.filter(s => 
        s.flag_reason?.toLowerCase().includes('address')
      )
      const otherIssues = flaggedShipments.filter(s => 
        !s.flag_reason?.toLowerCase().includes('address')
      )

      if (addressIssues.length > 0) {
        alerts.push({
          id: 'address-issues',
          type: 'address_issue',
          severity: 'orange',
          count: addressIssues.length,
          message: 'Shipments flagged for address issues',
          actionUrl: orgSlug ? `/portal/${orgSlug}/shipments?status=flagged` : undefined,
        })
      }

      if (otherIssues.length > 0) {
        alerts.push({
          id: 'flagged-shipments',
          type: 'no_box',
          severity: 'red',
          count: otherIssues.length,
          message: 'Shipments flagged and need attention',
          actionUrl: orgSlug ? `/portal/${orgSlug}/shipments?status=flagged` : undefined,
        })
      }
    }

    // Check for subscribers without a valid box number (box_number = 0 or null)
    const { count: noBoxCount, error: noBoxError } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'Active')
      .or('box_number.is.null,box_number.eq.0')

    if (!noBoxError && noBoxCount && noBoxCount > 0) {
      alerts.push({
        id: 'no-box-number',
        type: 'no_box',
        severity: 'red',
        count: noBoxCount,
        message: 'Active subscribers without a box number assigned',
        actionUrl: orgSlug ? `/portal/${orgSlug}/subscribers` : undefined,
      })
    }

    // Check for subscribers with missing address info
    const { count: missingAddressCount, error: addressError } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'Active')
      .or('address1.is.null,address1.eq.,city.is.null,city.eq.,zip.is.null,zip.eq.')

    if (!addressError && missingAddressCount && missingAddressCount > 0) {
      alerts.push({
        id: 'missing-address',
        type: 'address_issue',
        severity: 'orange',
        count: missingAddressCount,
        message: 'Subscribers with incomplete address information',
        actionUrl: orgSlug ? `/portal/${orgSlug}/subscribers` : undefined,
      })
    }

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('[Alerts] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
