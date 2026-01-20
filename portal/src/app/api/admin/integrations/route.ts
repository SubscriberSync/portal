import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/admin'
import { deleteIntegration } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

type IntegrationType = 'shopify' | 'recharge' | 'klaviyo' | 'discord' | 'shipstation'

interface DeleteResult {
  subscribers?: number
  shipments?: number
  skuAliases?: number
  productVariations?: number
  auditLogs?: number
  migrationRuns?: number
  unmappedItems?: number
  productPatterns?: number
  discordGuilds?: number
  discordRoleMappings?: number
  discordConnections?: number
  discordActivityLogs?: number
}

async function deleteRechargeData(supabase: ReturnType<typeof createServiceClient>, orgId: string): Promise<DeleteResult> {
  // Delete all subscribers that have recharge data for this org
  const { data: deleted, error } = await supabase
    .from('subscribers')
    .delete()
    .eq('organization_id', orgId)
    .not('recharge_customer_id', 'is', null)
    .select('id')

  if (error) {
    console.error('[deleteRechargeData] Error deleting subscribers:', error)
    throw new Error(`Failed to delete Recharge subscribers: ${error.message}`)
  }

  return { subscribers: deleted?.length || 0 }
}

async function deleteShopifyData(supabase: ReturnType<typeof createServiceClient>, orgId: string): Promise<DeleteResult> {
  const result: DeleteResult = {}

  // Delete sku_aliases
  const { data: skuAliases } = await supabase
    .from('sku_aliases')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.skuAliases = skuAliases?.length || 0

  // Delete product_variations
  const { data: productVariations } = await supabase
    .from('product_variations')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.productVariations = productVariations?.length || 0

  // Delete audit_logs
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.auditLogs = auditLogs?.length || 0

  // Delete migration_runs
  const { data: migrationRuns } = await supabase
    .from('migration_runs')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.migrationRuns = migrationRuns?.length || 0

  // Delete unmapped_items
  const { data: unmappedItems } = await supabase
    .from('unmapped_items')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.unmappedItems = unmappedItems?.length || 0

  // Delete product_patterns
  const { data: productPatterns } = await supabase
    .from('product_patterns')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.productPatterns = productPatterns?.length || 0

  // Delete subscribers with shopify data
  const { data: subscribers } = await supabase
    .from('subscribers')
    .delete()
    .eq('organization_id', orgId)
    .not('shopify_customer_id', 'is', null)
    .select('id')
  result.subscribers = subscribers?.length || 0

  // Delete shipments for this org
  const { data: shipments } = await supabase
    .from('shipments')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.shipments = shipments?.length || 0

  return result
}

async function deleteShipStationData(supabase: ReturnType<typeof createServiceClient>, orgId: string): Promise<DeleteResult> {
  // Clear shipstation fields from shipments (don't delete shipments entirely)
  const { data: updated, error } = await supabase
    .from('shipments')
    .update({
      shipstation_order_id: null,
      shipstation_shipment_id: null,
      tracking_number: null,
      carrier: null,
      shipping_label_url: null,
    })
    .eq('organization_id', orgId)
    .not('shipstation_order_id', 'is', null)
    .select('id')

  if (error) {
    console.error('[deleteShipStationData] Error:', error)
    throw new Error(`Failed to clear ShipStation data: ${error.message}`)
  }

  return { shipments: updated?.length || 0 }
}

async function deleteDiscordData(supabase: ReturnType<typeof createServiceClient>, orgId: string): Promise<DeleteResult> {
  const result: DeleteResult = {}

  // Delete discord_role_mappings
  const { data: roleMappings } = await supabase
    .from('discord_role_mappings')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.discordRoleMappings = roleMappings?.length || 0

  // Delete customer_discord_connections
  const { data: connections } = await supabase
    .from('customer_discord_connections')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.discordConnections = connections?.length || 0

  // Delete discord_guilds
  const { data: guilds } = await supabase
    .from('discord_guilds')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.discordGuilds = guilds?.length || 0

  // Delete discord_activity_log
  const { data: activityLogs } = await supabase
    .from('discord_activity_log')
    .delete()
    .eq('organization_id', orgId)
    .select('id')
  result.discordActivityLogs = activityLogs?.length || 0

  // Clear discord_username from subscribers
  await supabase
    .from('subscribers')
    .update({ discord_username: null })
    .eq('organization_id', orgId)
    .not('discord_username', 'is', null)

  return result
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.emailAddresses[0]?.emailAddress
  if (!isAdmin(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { organizationId, integrationType } = await request.json()

    if (!organizationId || !integrationType) {
      return NextResponse.json({ error: 'Missing organizationId or integrationType' }, { status: 400 })
    }

    const validTypes: IntegrationType[] = ['shopify', 'recharge', 'klaviyo', 'discord', 'shipstation']
    if (!validTypes.includes(integrationType)) {
      return NextResponse.json({ error: 'Invalid integration type' }, { status: 400 })
    }

    const supabase = createServiceClient()
    let deleted: DeleteResult = {}

    // Delete integration-specific data
    switch (integrationType as IntegrationType) {
      case 'recharge':
        deleted = await deleteRechargeData(supabase, organizationId)
        break
      case 'shopify':
        deleted = await deleteShopifyData(supabase, organizationId)
        break
      case 'shipstation':
        deleted = await deleteShipStationData(supabase, organizationId)
        break
      case 'discord':
        deleted = await deleteDiscordData(supabase, organizationId)
        break
      case 'klaviyo':
        // Klaviyo has minimal stored data - just delete the integration
        break
    }

    // Delete the integration record
    const success = await deleteIntegration(organizationId, integrationType)

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete integration record' }, { status: 500 })
    }

    console.log(`[Admin] Deleted ${integrationType} integration for org ${organizationId}:`, deleted)

    return NextResponse.json({ success: true, deleted })
  } catch (error) {
    return handleApiError(error, 'Admin Delete Integration')
  }
}
