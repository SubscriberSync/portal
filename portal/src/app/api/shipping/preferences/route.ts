import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

export interface ShippingPreferences {
  // Default carrier/service for quick buys
  default_carrier_id: string | null
  default_service_code: string | null
  default_package_code: string | null
  // Ship-from warehouse from ShipStation
  ship_from_warehouse_id: string | null
  // Ship-from address (stored locally)
  ship_from_name: string | null
  ship_from_company: string | null
  ship_from_address1: string | null
  ship_from_address2: string | null
  ship_from_city: string | null
  ship_from_state: string | null
  ship_from_zip: string | null
  ship_from_country: string | null
  ship_from_phone: string | null
  // Label preferences
  label_format: 'pdf' | 'png' | 'zpl' | null
  label_size: '4x6' | 'letter' | null
}

// GET /api/shipping/preferences
// Get organization shipping preferences
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

    // Get existing settings or return defaults
    const { data: settings, error } = await supabase
      .from('organization_settings')
      .select(`
        default_carrier_id,
        default_service_code,
        default_package_code,
        ship_from_warehouse_id,
        ship_from_name,
        ship_from_company,
        ship_from_address1,
        ship_from_address2,
        ship_from_city,
        ship_from_state,
        ship_from_zip,
        ship_from_country,
        ship_from_phone,
        label_format,
        label_size
      `)
      .eq('organization_id', organization.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine - return defaults
      throw error
    }

    const preferences: ShippingPreferences = {
      default_carrier_id: settings?.default_carrier_id || null,
      default_service_code: settings?.default_service_code || null,
      default_package_code: settings?.default_package_code || 'package',
      ship_from_warehouse_id: settings?.ship_from_warehouse_id || null,
      ship_from_name: settings?.ship_from_name || null,
      ship_from_company: settings?.ship_from_company || null,
      ship_from_address1: settings?.ship_from_address1 || null,
      ship_from_address2: settings?.ship_from_address2 || null,
      ship_from_city: settings?.ship_from_city || null,
      ship_from_state: settings?.ship_from_state || null,
      ship_from_zip: settings?.ship_from_zip || null,
      ship_from_country: settings?.ship_from_country || 'US',
      ship_from_phone: settings?.ship_from_phone || null,
      label_format: settings?.label_format || 'pdf',
      label_size: settings?.label_size || '4x6',
    }

    return NextResponse.json(preferences)
  } catch (error) {
    return handleApiError(error, 'Shipping Preferences Get')
  }
}

// PUT /api/shipping/preferences
// Update organization shipping preferences
export async function PUT(request: NextRequest) {
  const { orgSlug, orgId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const supabase = createServiceClient()

    // Validate label_format
    if (body.label_format && !['pdf', 'png', 'zpl'].includes(body.label_format)) {
      return NextResponse.json({ error: 'Invalid label format' }, { status: 400 })
    }

    // Validate label_size
    if (body.label_size && !['4x6', 'letter'].includes(body.label_size)) {
      return NextResponse.json({ error: 'Invalid label size' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const allowedFields = [
      'default_carrier_id',
      'default_service_code',
      'default_package_code',
      'ship_from_warehouse_id',
      'ship_from_name',
      'ship_from_company',
      'ship_from_address1',
      'ship_from_address2',
      'ship_from_city',
      'ship_from_state',
      'ship_from_zip',
      'ship_from_country',
      'ship_from_phone',
      'label_format',
      'label_size',
    ]

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    // Upsert the settings
    const { error } = await supabase
      .from('organization_settings')
      .upsert(
        {
          organization_id: organization.id,
          ...updateData,
        },
        {
          onConflict: 'organization_id',
        }
      )

    if (error) {
      console.error('[Shipping Preferences] Update error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Shipping Preferences')
  }
}
