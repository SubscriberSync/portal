import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { getOrganizationBySlug, getIntegrations } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import MigrationCenter from '@/components/MigrationCenter'

export const dynamic = 'force-dynamic'

interface MigrationPageProps {
  params: Promise<{ slug: string }>
}

export default async function MigrationPage({ params }: MigrationPageProps) {
  const { slug } = await params
  const { orgSlug, orgRole } = await auth()

  if (orgSlug !== slug) {
    notFound()
  }

  const organization = await getOrganizationBySlug(slug)
  if (!organization) {
    notFound()
  }

  // Check if migration is already complete (only admin can access after)
  const supabase = createServiceClient()

  const { data: completedRun } = await supabase
    .from('migration_runs')
    .select('id')
    .eq('organization_id', organization.id)
    .eq('status', 'completed')
    .limit(1)
    .single()

  // If migration is complete and user is not admin, redirect to dashboard
  if (completedRun && orgRole !== 'org:admin') {
    redirect(`/portal/${slug}`)
  }

  // Check Shopify connection
  const integrations = await getIntegrations(organization.id)
  const shopifyConnected = integrations.some(i => i.type === 'shopify' && i.connected)

  if (!shopifyConnected) {
    redirect(`/portal/${slug}/settings?error=shopify_required`)
  }

  // Get existing SKU mappings
  const { data: skuAliases } = await supabase
    .from('sku_aliases')
    .select('*')
    .eq('organization_id', organization.id)
    .order('product_sequence_id', { ascending: true })

  // Get latest migration run status
  const { data: latestRun } = await supabase
    .from('migration_runs')
    .select('*')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Get audit stats if there's a run
  let auditStats = { total: 0, clean: 0, flagged: 0, resolved: 0 }
  if (latestRun) {
    const { count: total } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('migration_run_id', latestRun.id)

    const { count: clean } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('migration_run_id', latestRun.id)
      .eq('status', 'clean')

    const { count: flagged } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('migration_run_id', latestRun.id)
      .eq('status', 'flagged')

    const { count: resolved } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('migration_run_id', latestRun.id)
      .eq('status', 'resolved')

    auditStats = {
      total: total || 0,
      clean: clean || 0,
      flagged: flagged || 0,
      resolved: resolved || 0,
    }
  }

  // Count pending subscribers
  const { count: pendingCount } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id)
    .eq('migration_status', 'pending')

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#71717a] text-sm mb-2">
          <span>Onboarding</span>
          <span>/</span>
          <span className="text-white">Migration Center</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Forensic Audit</h1>
        <p className="text-[#71717a]">
          Scan your Shopify order history to determine each subscriber's box sequence
        </p>
      </div>

      <MigrationCenter
        organizationId={organization.id}
        clientSlug={slug}
        skuAliases={skuAliases || []}
        latestRun={latestRun}
        auditStats={auditStats}
        pendingSubscribers={pendingCount || 0}
        isAdmin={orgRole === 'org:admin'}
      />
    </main>
  )
}
