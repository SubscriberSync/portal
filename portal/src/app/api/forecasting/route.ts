import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

interface BoxDistribution {
  boxNumber: number
  count: number
  label: string
}

interface SidecarProduct {
  name: string
  unitsToPack: number
  velocity: number
}

interface ForecastData {
  boxDistribution: BoxDistribution[]
  sidecars: SidecarProduct[]
  totalActive: number
}

/**
 * GET /api/forecasting
 * Get inventory forecast data based on subscriber distribution
 */
export async function GET() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // Get active subscribers with their box numbers
    const { data: subscribers, error: subError } = await supabase
      .from('subscribers')
      .select('box_number')
      .eq('organization_id', orgId)
      .eq('status', 'Active')

    if (subError) {
      console.error('[Forecasting] Subscribers error:', subError)
    }

    const totalActive = subscribers?.length || 0

    // Group subscribers by box number
    const boxCounts = new Map<number, number>()
    subscribers?.forEach(sub => {
      const boxNum = sub.box_number || 0
      boxCounts.set(boxNum, (boxCounts.get(boxNum) || 0) + 1)
    })

    // Convert to array and sort by box number
    const boxDistribution: BoxDistribution[] = Array.from(boxCounts.entries())
      .filter(([boxNum]) => boxNum > 0) // Exclude box 0 (no box assigned)
      .map(([boxNumber, count]) => ({
        boxNumber,
        count,
        label: `Episode ${boxNumber}`,
      }))
      .sort((a, b) => a.boxNumber - b.boxNumber)

    // Get unfulfilled shipments for sidecar/add-on products
    // This would typically come from a products table or shipment items
    const { data: shipments, error: shipError } = await supabase
      .from('shipments')
      .select('product_name')
      .eq('organization_id', orgId)
      .eq('status', 'Unfulfilled')

    if (shipError) {
      console.error('[Forecasting] Shipments error:', shipError)
    }

    // Group by product name for sidecars
    const productCounts = new Map<string, number>()
    shipments?.forEach(shipment => {
      const name = shipment.product_name || 'Unknown'
      productCounts.set(name, (productCounts.get(name) || 0) + 1)
    })

    // Convert to sidecar format
    // Velocity is estimated as monthly rate (simplified: count / 1 for now)
    const sidecars: SidecarProduct[] = Array.from(productCounts.entries())
      .map(([name, unitsToPack]) => ({
        name,
        unitsToPack,
        velocity: unitsToPack, // Simplified: assume all need to be packed this month
      }))
      .sort((a, b) => b.unitsToPack - a.unitsToPack)
      .slice(0, 10) // Top 10 products

    const forecastData: ForecastData = {
      boxDistribution,
      sidecars,
      totalActive,
    }

    return NextResponse.json(forecastData)
  } catch (error) {
    return handleApiError(error, 'Forecasting')
  }
}
