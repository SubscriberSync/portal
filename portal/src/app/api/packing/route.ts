import { NextRequest, NextResponse } from 'next/server'
import { getPackingData } from '@/lib/airtable-shipping'
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
        console.log(`[Packing API] Using client ${clientSlug}'s base: ${backstageBaseId}`)
      }
    }

    const batches = await getPackingData(backstageBaseId)

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('[Packing API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch packing data' }, { status: 500 })
  }
}
