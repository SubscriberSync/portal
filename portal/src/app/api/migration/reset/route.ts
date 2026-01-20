import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrganizationBySlug, updateOrganization } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

/**
 * POST /api/migration/reset
 * Reset all migration data for the organization (admin only)
 * Useful for testing or starting over
 */
export async function POST() {
  const { orgSlug, orgRole } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can reset migration
  if (orgRole !== 'org:admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const supabase = createServiceClient()

    // Delete in correct order to respect foreign key constraints
    // 1. Delete unmapped items
    const { error: unmappedError } = await supabase
      .from('unmapped_items')
      .delete()
      .eq('organization_id', organization.id)

    if (unmappedError) {
      console.error('Error deleting unmapped items:', unmappedError)
    }

    // 2. Delete audit logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .delete()
      .eq('organization_id', organization.id)

    if (auditError) {
      console.error('Error deleting audit logs:', auditError)
    }

    // 3. Delete migration runs
    const { error: runsError } = await supabase
      .from('migration_runs')
      .delete()
      .eq('organization_id', organization.id)

    if (runsError) {
      console.error('Error deleting migration runs:', runsError)
    }

    // 4. Delete SKU aliases (optional - uncomment if you want to reset mappings too)
    // const { error: aliasError } = await supabase
    //   .from('sku_aliases')
    //   .delete()
    //   .eq('organization_id', organization.id)

    // 5. Delete product patterns
    const { error: patternsError } = await supabase
      .from('product_patterns')
      .delete()
      .eq('organization_id', organization.id)

    if (patternsError) {
      console.error('Error deleting product patterns:', patternsError)
    }

    // 6. Reset subscriber migration status
    const { error: subscribersError } = await supabase
      .from('subscribers')
      .update({ migration_status: null })
      .eq('organization_id', organization.id)

    if (subscribersError) {
      console.error('Error resetting subscribers:', subscribersError)
    }

    // 7. Reset organization migration_complete flag
    await updateOrganization(organization.id, { migration_complete: false })

    return NextResponse.json({
      success: true,
      message: 'Migration data has been reset. You can now start fresh.',
    })
  } catch (error) {
    return handleApiError(error, 'Reset Migration')
  }
}

/**
 * DELETE /api/migration/reset
 * Full reset including SKU mappings (nuclear option)
 */
export async function DELETE() {
  const { orgSlug, orgRole } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (orgRole !== 'org:admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const supabase = createServiceClient()

    // Delete EVERYTHING including SKU mappings
    await supabase.from('unmapped_items').delete().eq('organization_id', organization.id)
    await supabase.from('audit_logs').delete().eq('organization_id', organization.id)
    await supabase.from('migration_runs').delete().eq('organization_id', organization.id)
    await supabase.from('sku_aliases').delete().eq('organization_id', organization.id)
    await supabase.from('product_patterns').delete().eq('organization_id', organization.id)
    await supabase.from('subscribers').update({ migration_status: null }).eq('organization_id', organization.id)
    await updateOrganization(organization.id, { migration_complete: false })

    return NextResponse.json({
      success: true,
      message: 'All migration data including SKU mappings has been deleted.',
    })
  } catch (error) {
    return handleApiError(error, 'Full Reset Migration')
  }
}
