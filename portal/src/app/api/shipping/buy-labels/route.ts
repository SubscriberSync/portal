import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createLabelV2, toV2Address, V2Label } from '@/lib/shipstation'
import crypto from 'crypto'

interface LabelResult {
  shipmentId: string
  orderNumber: string | null
  success: boolean
  error?: string
  trackingNumber?: string
  labelUrl?: string
  shippingCost?: number
}

// POST /api/shipping/buy-labels
// Purchase shipping labels for selected shipments
export async function POST(request: NextRequest) {
  const { orgSlug, orgId, userId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const {
      shipmentIds,
      carrierId,
      serviceCode,
      sortOrder,
      labelFormat = 'pdf',
      labelSize = '4x6',
      testLabel = false,
    } = await request.json()

    if (!shipmentIds || shipmentIds.length === 0) {
      return NextResponse.json({ error: 'No shipments selected' }, { status: 400 })
    }

    if (!carrierId || !serviceCode) {
      return NextResponse.json({ error: 'Carrier and service code required' }, { status: 400 })
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

    // Create a print batch
    const batchId = crypto.randomUUID()

    // Get next batch number
    const { data: lastBatch } = await supabase
      .from('print_batches')
      .select('batch_number')
      .eq('organization_id', organization.id)
      .order('batch_number', { ascending: false })
      .limit(1)
      .single()

    const batchNumber = (lastBatch?.batch_number || 0) + 1

    // Create batch record
    await supabase.from('print_batches').insert({
      id: batchId,
      organization_id: organization.id,
      batch_number: batchNumber,
      total_labels: shipments.length,
      successful_labels: 0,
      failed_labels: 0,
    })

    // Sort shipments by provided order (matches UI display order)
    const orderedShipments = sortOrder
      ? sortOrder.map((id: string) => shipments.find(s => s.id === id)).filter(Boolean)
      : shipments

    // Process each shipment
    const results: LabelResult[] = []
    const successIds: string[] = []
    const labelUrls: string[] = []
    let successCount = 0
    let failCount = 0
    let totalShippingCost = 0

    for (let i = 0; i < orderedShipments.length; i++) {
      const shipment = orderedShipments[i]
      const printSequence = i + 1

      try {
        const sub = shipment.subscriber
        if (!sub?.address1 || !sub?.city || !sub?.zip) {
          throw new Error('Missing subscriber address fields')
        }

        const shipTo = toV2Address(
          `${sub.first_name || ''} ${sub.last_name || ''}`.trim() || 'Customer',
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

        // Create the label
        const label: V2Label = await createLabelV2(apiKey, {
          shipment: {
            carrier_id: carrierId,
            service_code: serviceCode,
            ship_date: new Date().toISOString().split('T')[0],
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
            external_shipment_id: shipment.id,
          },
          label_format: labelFormat,
          label_layout: labelSize,
          test_label: testLabel,
        })

        // Get the label download URL
        const labelUrl =
          label.label_download?.pdf ||
          label.label_download?.png ||
          label.label_download?.href

        // Update shipment with label info
        await supabase
          .from('shipments')
          .update({
            status: 'Ready to Pack',
            tracking_number: label.tracking_number,
            carrier: label.carrier_code,
            label_url: labelUrl,
            shipping_cost: label.shipment_cost?.amount || 0,
            shipstation_shipment_id: label.shipment_id,
            print_batch_id: batchId,
            print_sequence: printSequence,
            label_purchased_at: new Date().toISOString(),
            error_log: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipment.id)

        results.push({
          shipmentId: shipment.id,
          orderNumber: shipment.order_number,
          success: true,
          trackingNumber: label.tracking_number,
          labelUrl,
          shippingCost: label.shipment_cost?.amount || 0,
        })

        successIds.push(shipment.id)
        if (labelUrl) labelUrls.push(labelUrl)
        successCount++
        totalShippingCost += label.shipment_cost?.amount || 0
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Log error to shipment but don't stop the batch
        await supabase
          .from('shipments')
          .update({
            error_log: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipment.id)

        results.push({
          shipmentId: shipment.id,
          orderNumber: shipment.order_number,
          success: false,
          error: errorMessage,
        })
        failCount++

        console.error(`[Buy Labels] Failed for ${shipment.id}:`, errorMessage)
      }
    }

    // Update batch with results
    await supabase
      .from('print_batches')
      .update({
        successful_labels: successCount,
        failed_labels: failCount,
        total_shipping_cost: totalShippingCost,
        // Note: In the future, we could merge PDFs into one file
        // label_pdf_url: combinedPdfUrl,
      })
      .eq('id', batchId)

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      user_id: userId,
      event_type: 'labels.purchased',
      description: `Purchased batch #${batchNumber}: ${successCount} labels ($${totalShippingCost.toFixed(2)}) - ${failCount} failed`,
    })

    return NextResponse.json({
      success: successCount,
      failed: failCount,
      batchId,
      batchNumber,
      successIds,
      labelUrls,
      totalShippingCost,
      testLabel,
      errors: results.filter(r => !r.success).map(r => ({
        shipmentId: r.shipmentId,
        orderNumber: r.orderNumber,
        error: r.error,
      })),
      results,
    })
  } catch (error) {
    console.error('[Buy Labels] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to purchase labels' },
      { status: 500 }
    )
  }
}
