import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getShipments, Shipment } from '@/lib/supabase/data'

export const dynamic = 'force-dynamic'

interface PackBatch {
  batch: string
  box: string
  total: number
  packed: number
  sizeBreakdown: Record<string, number>
}

export async function GET() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all shipments for packing
    const shipments = await getShipments(orgId, {})

    // Group by product (batch) and sequence (box)
    const batches = new Map<string, PackBatch>()

    for (const shipment of shipments) {
      const batch = shipment.product_name || 'Unknown'
      const box = shipment.sequence_id ? `Episode ${shipment.sequence_id}` : 'One-Off'
      const key = `${batch}|${box}`

      if (!batches.has(key)) {
        batches.set(key, {
          batch,
          box,
          total: 0,
          packed: 0,
          sizeBreakdown: {},
        })
      }

      const batchData = batches.get(key)!
      batchData.total++
      
      if (shipment.status === 'Packed' || shipment.status === 'Shipped') {
        batchData.packed++
      }

      // Track size breakdown
      const size = 'N/A' // Size tracking would need to be added via subscriber join
      batchData.sizeBreakdown[size] = (batchData.sizeBreakdown[size] || 0) + 1
    }

    // Sort by batch name
    const sortedBatches = Array.from(batches.values()).sort((a, b) => 
      a.batch.localeCompare(b.batch)
    )

    return NextResponse.json({ batches: sortedBatches })
  } catch (error) {
    console.error('[Packing API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch packing data' }, { status: 500 })
  }
}
