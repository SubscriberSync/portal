import { NextRequest, NextResponse } from 'next/server'
import { getShippingRecords, convertToShipStationCSV } from '@/lib/airtable-shipping'
import { getClientBySlug } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get client slug from query params
    const { searchParams } = new URL(request.url)
    const clientSlug = searchParams.get('client')

    let backstageBaseId: string | undefined

    // If client slug provided, look up their backstage base ID
    if (clientSlug) {
      const client = await getClientBySlug(clientSlug)
      if (client?.backstageBaseId) {
        backstageBaseId = client.backstageBaseId
        console.log(`[Shipping CSV] Using client ${clientSlug}'s base: ${backstageBaseId}`)
      }
    }

    const records = await getShippingRecords(backstageBaseId)

    if (records.length === 0) {
      return NextResponse.json({ error: 'No shipping records found' }, { status: 404 })
    }

    const csv = convertToShipStationCSV(records)
    const filename = `shipping-${clientSlug || 'all'}-${new Date().toISOString().split('T')[0]}.csv`

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
