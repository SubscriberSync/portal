import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'

export const dynamic = 'force-dynamic'

// Escape CSV values (handle commas, quotes, newlines)
function escapeCSV(value: string | null | undefined): string {
  if (!value) return ''
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// POST /api/shipping/csv
// Export selected shipments as CSV (for PirateShip import)
export async function POST(request: NextRequest) {
  const { orgSlug, orgId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const { shipmentIds, format = 'pirateship' } = await request.json()

    if (!shipmentIds || shipmentIds.length === 0) {
      return NextResponse.json({ error: 'No shipments selected' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch shipments with subscriber data
    const { data: shipments, error: fetchError } = await supabase
      .from('shipments')
      .select(`
        *,
        subscriber:subscribers(*)
      `)
      .eq('organization_id', organization.id)
      .in('id', shipmentIds)

    if (fetchError || !shipments || shipments.length === 0) {
      return NextResponse.json({ error: 'Could not find shipments' }, { status: 400 })
    }

    let headers: string[]
    let rows: string[]

    if (format === 'pirateship') {
      // PirateShip CSV format
      headers = [
        'Order ID',
        'Recipient Name',
        'Address Line 1',
        'Address Line 2',
        'City',
        'State',
        'Postal Code',
        'Country',
        'Email',
        'Phone',
        'Weight (oz)',
        'Item Description',
      ]

      rows = shipments.map((shipment) => {
        const sub = shipment.subscriber
        const name = sub ? `${sub.first_name || ''} ${sub.last_name || ''}`.trim() : ''
        return [
          escapeCSV(shipment.order_number || shipment.id.slice(0, 8)),
          escapeCSV(name),
          escapeCSV(sub?.address1),
          escapeCSV(sub?.address2),
          escapeCSV(sub?.city),
          escapeCSV(sub?.state),
          escapeCSV(sub?.zip),
          escapeCSV(sub?.country || 'US'),
          escapeCSV(sub?.email),
          escapeCSV(sub?.phone),
          String(shipment.weight_oz || 16),
          escapeCSV(shipment.product_name),
        ].join(',')
      })
    } else {
      // Generic/ShipStation CSV format
      headers = [
        'Order Number',
        'Ship To - Name',
        'Ship To - Company',
        'Ship To - Address 1',
        'Ship To - Address 2',
        'Ship To - City',
        'Ship To - State',
        'Ship To - Postal Code',
        'Ship To - Country',
        'Ship To - Email',
        'Ship To - Phone',
        'Weight (oz)',
        'Item Name',
        'Item SKU',
        'Gift Message',
      ]

      rows = shipments.map((shipment) => {
        const sub = shipment.subscriber
        const name = sub ? `${sub.first_name || ''} ${sub.last_name || ''}`.trim() : ''
        return [
          escapeCSV(shipment.order_number || shipment.id.slice(0, 8)),
          escapeCSV(name),
          '', // Company
          escapeCSV(sub?.address1),
          escapeCSV(sub?.address2),
          escapeCSV(sub?.city),
          escapeCSV(sub?.state),
          escapeCSV(sub?.zip),
          escapeCSV(sub?.country || 'US'),
          escapeCSV(sub?.email),
          escapeCSV(sub?.phone),
          String(shipment.weight_oz || 16),
          escapeCSV(shipment.product_name),
          escapeCSV(shipment.variant_name),
          escapeCSV(shipment.gift_note),
        ].join(',')
      })
    }

    const csv = [headers.join(','), ...rows].join('\n')
    const filename = `shipments-${format}-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[Shipping CSV] Error:', error)
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 })
  }
}

// GET /api/shipping/csv (legacy - export all active subscribers)
export async function GET() {
  const { orgSlug, orgId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const supabase = createServiceClient()

    // Get all unfulfilled shipments
    const { data: shipments } = await supabase
      .from('shipments')
      .select(`
        *,
        subscriber:subscribers(*)
      `)
      .eq('organization_id', organization.id)
      .eq('status', 'Unfulfilled')

    if (!shipments || shipments.length === 0) {
      return NextResponse.json({ error: 'No shipping records found' }, { status: 404 })
    }

    const headers = [
      'Order Number',
      'Ship To - Name',
      'Ship To - Address 1',
      'Ship To - Address 2',
      'Ship To - City',
      'Ship To - State',
      'Ship To - Postal Code',
      'Ship To - Country',
      'Ship To - Email',
      'Ship To - Phone',
      'Weight (oz)',
      'Item Name',
    ]

    const rows = shipments.map((shipment) => {
      const sub = shipment.subscriber
      const name = sub ? `${sub.first_name || ''} ${sub.last_name || ''}`.trim() : ''
      return [
        escapeCSV(shipment.order_number || shipment.id.slice(0, 8)),
        escapeCSV(name),
        escapeCSV(sub?.address1),
        escapeCSV(sub?.address2),
        escapeCSV(sub?.city),
        escapeCSV(sub?.state),
        escapeCSV(sub?.zip),
        escapeCSV(sub?.country || 'US'),
        escapeCSV(sub?.email),
        escapeCSV(sub?.phone),
        String(shipment.weight_oz || 16),
        escapeCSV(shipment.product_name),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const filename = `shipping-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[Shipping CSV] Error:', error)
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 })
  }
}
