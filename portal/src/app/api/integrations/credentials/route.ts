import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/integrations/credentials
 * Update API credentials for integrations
 * Body: { keyType: string, keyValue: string }
 */
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { keyType, keyValue } = body

    if (!keyType || !keyValue) {
      return NextResponse.json(
        { error: 'keyType and keyValue are required' },
        { status: 400 }
      )
    }

    // Validate key type
    const validKeyTypes = [
      'shopify_api_key',
      'shopify_api_secret',
      'recharge_api_key',
      'klaviyo_api_key',
      'shipstation_api_key',
      'shipstation_api_secret',
    ]

    if (!validKeyTypes.includes(keyType)) {
      return NextResponse.json(
        { error: 'Invalid key type' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Map key type to integration type
    const integrationTypeMap: Record<string, string> = {
      shopify_api_key: 'shopify',
      shopify_api_secret: 'shopify',
      recharge_api_key: 'recharge',
      klaviyo_api_key: 'klaviyo',
      shipstation_api_key: 'shipstation',
      shipstation_api_secret: 'shipstation',
    }

    const integrationType = integrationTypeMap[keyType]

    // Check if integration exists
    const { data: existing, error: fetchError } = await supabase
      .from('integrations')
      .select('id, credentials_encrypted')
      .eq('organization_id', orgId)
      .eq('type', integrationType)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found, which is fine
      console.error('[Credentials] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Determine which field to update in the credentials object
    const fieldMap: Record<string, string> = {
      shopify_api_key: 'api_key',
      shopify_api_secret: 'api_secret',
      recharge_api_key: 'api_key',
      klaviyo_api_key: 'api_key',
      shipstation_api_key: 'api_key',
      shipstation_api_secret: 'api_secret',
    }

    const credentialField = fieldMap[keyType]

    if (existing) {
      // Update existing integration credentials
      const currentCreds = existing.credentials_encrypted || {}
      const updatedCreds = {
        ...currentCreds,
        [credentialField]: keyValue,
      }

      const { error: updateError } = await supabase
        .from('integrations')
        .update({
          credentials_encrypted: updatedCreds,
          connected: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('[Credentials] Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update credentials' }, { status: 500 })
      }
    } else {
      // Create new integration record
      const { error: insertError } = await supabase
        .from('integrations')
        .insert({
          organization_id: orgId,
          type: integrationType,
          credentials_encrypted: { [credentialField]: keyValue },
          connected: true,
        })

      if (insertError) {
        console.error('[Credentials] Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Credentials] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
