import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import {
  createOrUpdateOrder,
  ShipStationCredentials,
} from '@/lib/shipstation'
import { handleApiError } from '@/lib/api-utils'
import crypto from 'crypto'

interface LabelResult {
  shipmentId: string
  orderNumber: string
  success: boolean
  error?: string
  trackingNumber?: string
  labelUrl?: string
}

// POST /api/shipping/generate-labels
// Generate shipping labels for selected shipments via ShipStation
// Implements the "Resilient Batcher" pattern - one failure doesn't stop the batch
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
    const { shipmentIds, sortOrder } = await request.json()

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

    const credentials: ShipStationCredentials = {
      apiKey: integration.credentials_encrypted.apiKey as string,
      apiSecret: integration.credentials_encrypted.apiSecret as string,
    }

    // Fetch all shipments with subscriber data
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

    // Sort shipments by the provided order (matches UI display order)
    const orderedShipments = sortOrder
      ? sortOrder.map((id: string) => shipments.find(s => s.id === id)).filter(Boolean)
      : shipments

    // Process each shipment - continue on individual failures
    const results: LabelResult[] = []
    const successIds: string[] = []
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < orderedShipments.length; i++) {
      const shipment = orderedShipments[i]
      const printSequence = i + 1 // 1-indexed to match physical label stack

      try {
        // Validate address
        if (!shipment.subscriber?.address1 || !shipment.subscriber?.city || !shipment.subscriber?.zip) {
          throw new Error('Missing required address fields')
        }

        // Create/update order in ShipStation
        const ssOrder = await createOrUpdateOrder(credentials, {
          orderNumber: shipment.order_number || `SS-${shipment.id.slice(0, 8)}`,
          orderKey: shipment.id,
          orderDate: new Date().toISOString(),
          orderStatus: 'awaiting_shipment',
          customerEmail: shipment.subscriber.email,
          billTo: {
            name: `${shipment.subscriber.first_name || ''} ${shipment.subscriber.last_name || ''}`.trim(),
            company: '',
            street1: shipment.subscriber.address1 || '',
            street2: shipment.subscriber.address2 || '',
            street3: '',
            city: shipment.subscriber.city || '',
            state: shipment.subscriber.state || '',
            postalCode: shipment.subscriber.zip || '',
            country: shipment.subscriber.country || 'US',
            phone: shipment.subscriber.phone || '',
            residential: true,
          },
          shipTo: {
            name: `${shipment.subscriber.first_name || ''} ${shipment.subscriber.last_name || ''}`.trim(),
            company: '',
            street1: shipment.subscriber.address1 || '',
            street2: shipment.subscriber.address2 || '',
            street3: '',
            city: shipment.subscriber.city || '',
            state: shipment.subscriber.state || '',
            postalCode: shipment.subscriber.zip || '',
            country: shipment.subscriber.country || 'US',
            phone: shipment.subscriber.phone || '',
            residential: true,
          },
          items: [{
            orderItemId: 0,
            lineItemKey: shipment.id,
            sku: shipment.product_name || 'ITEM',
            name: shipment.product_name || 'Subscription Box',
            imageUrl: '',
            weight: { value: shipment.weight_oz || 16, units: 'ounces' },
            quantity: 1,
            unitPrice: 0,
            taxAmount: 0,
            shippingAmount: 0,
            warehouseLocation: '',
            options: shipment.variant_name ? [{ name: 'Variant', value: shipment.variant_name }] : [],
            productId: 0,
            fulfillmentSku: '',
            adjustment: false,
            upc: '',
          }],
          weight: { value: shipment.weight_oz || 16, units: 'ounces' },
          gift: !!shipment.gift_note,
          giftMessage: shipment.gift_note || '',
        } as Parameters<typeof createOrUpdateOrder>[1])

        // Update shipment with ShipStation order ID and batch info
        await supabase
          .from('shipments')
          .update({
            status: 'Ready to Pack',
            shipstation_order_id: ssOrder.orderId.toString(),
            print_batch_id: batchId,
            print_sequence: printSequence,
            label_purchased_at: new Date().toISOString(),
            error_log: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipment.id)

        results.push({
          shipmentId: shipment.id,
          orderNumber: shipment.order_number || shipment.id,
          success: true,
        })
        successIds.push(shipment.id)
        successCount++

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
          orderNumber: shipment.order_number || shipment.id,
          success: false,
          error: errorMessage,
        })
        failCount++

        console.error(`[Generate Labels] Failed for ${shipment.id}:`, errorMessage)
      }
    }

    // Update batch with results
    await supabase
      .from('print_batches')
      .update({
        successful_labels: successCount,
        failed_labels: failCount,
        // Note: In production, you'd call ShipStation's bulk label API
        // and store the combined PDF URL here
        // label_pdf_url: combinedPdfUrl,
      })
      .eq('id', batchId)

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      event_type: 'labels.generated',
      description: `Generated batch #${batchNumber}: ${successCount} labels (${failCount} failed)`,
    })

    return NextResponse.json({
      success: successCount,
      failed: failCount,
      batchId,
      batchNumber,
      successIds,
      errors: results.filter(r => !r.success).map(r => ({
        orderId: r.shipmentId,
        orderNumber: r.orderNumber,
        error: r.error,
      })),
      // In production, this would be the combined PDF from ShipStation
      // pdfUrl: combinedPdfUrl,
    })

  } catch (error) {
    return handleApiError(error, 'Generate Labels', 'Failed to generate labels')
  }
}
