import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { getCarriersV2, getWarehousesV2, V2Carrier, V2Warehouse } from '@/lib/shipstation'

// GET /api/shipping/carriers
// List connected carriers with their services from ShipStation
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

    // Get ShipStation credentials
    const { data: integration } = await supabase
      .from('integrations')
      .select('credentials_encrypted')
      .eq('organization_id', organization.id)
      .eq('type', 'shipstation')
      .eq('connected', true)
      .single()

    if (!integration?.credentials_encrypted) {
      return NextResponse.json({ error: 'ShipStation not connected' }, { status: 400 })
    }

    const apiKey = integration.credentials_encrypted.apiKey as string

    // Fetch carriers and warehouses in parallel
    const [carriers, warehouses] = await Promise.all([
      getCarriersV2(apiKey).catch((err): V2Carrier[] => {
        console.error('[Carriers] Failed to fetch carriers:', err)
        return []
      }),
      getWarehousesV2(apiKey).catch((err): V2Warehouse[] => {
        console.error('[Carriers] Failed to fetch warehouses:', err)
        return []
      }),
    ])

    // Transform carriers to include only relevant info
    const formattedCarriers = carriers.map(carrier => ({
      carrier_id: carrier.carrier_id,
      carrier_code: carrier.carrier_code,
      name: carrier.friendly_name || carrier.nickname,
      nickname: carrier.nickname,
      balance: carrier.balance,
      requires_funded_amount: carrier.requires_funded_amount,
      services: carrier.services?.map(service => ({
        service_code: service.service_code,
        name: service.name,
        domestic: service.domestic,
        international: service.international,
      })) || [],
      packages: carrier.packages?.map(pkg => ({
        package_code: pkg.package_code,
        name: pkg.name,
      })) || [],
    }))

    // Transform warehouses
    const formattedWarehouses = warehouses.map(warehouse => ({
      warehouse_id: warehouse.warehouse_id,
      name: warehouse.name,
      is_default: warehouse.is_default,
      address: warehouse.origin_address ? {
        name: warehouse.origin_address.name,
        company: warehouse.origin_address.company_name,
        address1: warehouse.origin_address.address_line1,
        address2: warehouse.origin_address.address_line2,
        city: warehouse.origin_address.city_locality,
        state: warehouse.origin_address.state_province,
        zip: warehouse.origin_address.postal_code,
        country: warehouse.origin_address.country_code,
        phone: warehouse.origin_address.phone,
      } : null,
    }))

    return NextResponse.json({
      carriers: formattedCarriers,
      warehouses: formattedWarehouses,
    })
  } catch (error) {
    console.error('[Carriers] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch carriers' },
      { status: 500 }
    )
  }
}
