import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { getRatesV2, toV2Address, V2Rate } from '@/lib/shipstation'
import { handleApiError, getErrorMessage } from '@/lib/api-utils'

interface ShipmentRates {
  shipmentId: string
  orderNumber: string | null
  subscriberName: string
  weight: number
  rates: V2Rate[]
  error?: string
}

// Get the shipping name (uses preferred name if flag is set)
function getShippingName(sub: any): string {
  const firstName = sub.use_preferred_name_for_shipping && sub.preferred_name 
    ? sub.preferred_name 
    : (sub.first_name || '')
  return `${firstName} ${sub.last_name || ''}`.trim() || 'Customer'
}

// POST /api/shipping/rates
// Get shipping rates for selected shipments
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
    const { shipmentIds, carrierIds } = await request.json()

    if (!shipmentIds || shipmentIds.length === 0) {
      return NextResponse.json({ error: 'No shipments selected' }, { status: 400 })
    }

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

    // Get organization shipping settings for ship-from address
    const { data: settings } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organization.id)
      .single()

    // Validate ship-from address exists
    if (!settings?.ship_from_address1 || !settings?.ship_from_city || !settings?.ship_from_zip) {
      return NextResponse.json(
        { error: 'Ship-from address not configured. Please set up your shipping address in Settings.' },
        { status: 400 }
      )
    }

    // Build ship-from address
    const shipFrom = toV2Address(
      settings.ship_from_name || organization.name,
      {
        company: settings.ship_from_company,
        address1: settings.ship_from_address1,
        address2: settings.ship_from_address2,
        city: settings.ship_from_city,
        state: settings.ship_from_state,
        zip: settings.ship_from_zip,
        country: settings.ship_from_country || 'US',
        phone: settings.ship_from_phone,
      }
    )

    // Fetch shipments with subscriber data
    const { data: shipments, error: fetchError } = await supabase
      .from('shipments')
      .select(`
        *,
        subscriber:subscribers(*)
      `)
      .eq('organization_id', organization.id)
      .in('id', shipmentIds)
      .eq('status', 'Unfulfilled')

    if (fetchError || !shipments || shipments.length === 0) {
      return NextResponse.json({ error: 'Could not find shipments' }, { status: 400 })
    }

    // Get rates for each shipment
    const shipmentRates: ShipmentRates[] = []

    for (const shipment of shipments) {
      if (!shipment.subscriber) {
        shipmentRates.push({
          shipmentId: shipment.id,
          orderNumber: shipment.order_number,
          subscriberName: 'Unknown',
          weight: shipment.weight_oz || 16,
          rates: [],
          error: 'No subscriber data found',
        })
        continue
      }

      const sub = shipment.subscriber
      if (!sub.address1 || !sub.city || !sub.zip) {
        shipmentRates.push({
          shipmentId: shipment.id,
          orderNumber: shipment.order_number,
          subscriberName: getShippingName(sub),
          weight: shipment.weight_oz || 16,
          rates: [],
          error: 'Missing address fields',
        })
        continue
      }

      try {
        const shipTo = toV2Address(
          getShippingName(sub),
          {
            address1: sub.address1,
            address2: sub.address2,
            city: sub.city,
            state: sub.state || '',
            zip: sub.zip,
            country: sub.country || 'US',
            phone: sub.phone,
          }
        )

        const rateResponse = await getRatesV2(apiKey, {
          shipment: {
            ship_from: shipFrom,
            ship_to: shipTo,
            packages: [
              {
                weight: {
                  value: shipment.weight_oz || 16,
                  unit: 'ounce',
                },
              },
            ],
          },
          rate_options: carrierIds?.length > 0 ? { carrier_ids: carrierIds } : undefined,
        })

        // Filter out invalid rates and sort by price
        const validRates = (rateResponse.rates || [])
          .filter(r => r.validation_status === 'valid' && !r.error_messages?.length)
          .sort((a, b) => a.shipping_amount.amount - b.shipping_amount.amount)

        shipmentRates.push({
          shipmentId: shipment.id,
          orderNumber: shipment.order_number,
          subscriberName: getShippingName(sub),
          weight: shipment.weight_oz || 16,
          rates: validRates,
        })
      } catch (error) {
        console.error(`[Rates] Error getting rates for shipment ${shipment.id}:`, getErrorMessage(error))
        shipmentRates.push({
          shipmentId: shipment.id,
          orderNumber: shipment.order_number,
          subscriberName: shipment.subscriber ? getShippingName(shipment.subscriber) : '',
          weight: shipment.weight_oz || 16,
          rates: [],
          error: getErrorMessage(error, 'Failed to get rates'),
        })
      }
    }

    // Find common rates (services available for all shipments)
    const allRatesHaveService = (serviceCode: string): boolean => {
      return shipmentRates.every(
        sr => sr.error || sr.rates.some(r => r.service_code === serviceCode)
      )
    }

    // Get unique service codes across all shipments
    const allServiceCodes = new Set<string>()
    shipmentRates.forEach(sr => {
      sr.rates.forEach(r => allServiceCodes.add(r.service_code))
    })

    // Find common services
    const commonServices = Array.from(allServiceCodes).filter(allRatesHaveService)

    // Calculate total cost for each common service
    const serviceTotals = commonServices.map(serviceCode => {
      let totalCost = 0
      let lowestDeliveryDays: number | undefined
      let carrierName = ''
      let serviceName = ''
      let carrierId = ''

      shipmentRates.forEach(sr => {
        const rate = sr.rates.find(r => r.service_code === serviceCode)
        if (rate) {
          totalCost += rate.shipping_amount.amount
          carrierName = rate.carrier_friendly_name
          serviceName = rate.service_type
          carrierId = rate.carrier_id // Get carrier_id from the rate
          if (rate.delivery_days !== undefined) {
            if (lowestDeliveryDays === undefined || rate.delivery_days < lowestDeliveryDays) {
              lowestDeliveryDays = rate.delivery_days
            }
          }
        }
      })

      return {
        serviceCode,
        carrierId,
        carrierName,
        serviceName,
        totalCost,
        avgCost: totalCost / shipmentRates.filter(sr => !sr.error).length,
        deliveryDays: lowestDeliveryDays,
      }
    }).sort((a, b) => a.totalCost - b.totalCost)

    return NextResponse.json({
      shipmentRates,
      commonServices: serviceTotals,
      shipmentCount: shipments.length,
      shipmentsWithErrors: shipmentRates.filter(sr => sr.error).length,
    })
  } catch (error) {
    return handleApiError(error, 'Rates', 'Failed to get rates')
  }
}
