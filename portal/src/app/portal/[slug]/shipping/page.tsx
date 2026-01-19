import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import ShippingDashboard from '@/components/ShippingDashboard'

export const dynamic = 'force-dynamic'

interface ShippingPageProps {
  params: Promise<{ slug: string }>
}

export default async function ShippingPage({ params }: ShippingPageProps) {
  const { slug } = await params
  const { orgSlug } = await auth()

  if (orgSlug !== slug) {
    notFound()
  }

  const organization = await getOrganizationBySlug(slug)
  if (!organization) {
    notFound()
  }

  // Fetch unfulfilled shipments that are paid
  const supabase = createServiceClient()

  // Get unfulfilled, paid shipments for the shipping dashboard
  const { data: shipments } = await supabase
    .from('shipments')
    .select(`
      *,
      subscriber:subscribers(id, email, first_name, last_name, address1, address2, city, state, zip, country)
    `)
    .eq('organization_id', organization.id)
    .eq('status', 'Unfulfilled')
    .or('financial_status.eq.paid,financial_status.is.null') // Include paid or null (legacy data)
    .order('product_name', { ascending: true })
    .order('variant_name', { ascending: true })

  // Get recent print batches
  const { data: recentBatches } = await supabase
    .from('print_batches')
    .select('*')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get problem orders (unpaid/pending)
  const { data: problemOrders } = await supabase
    .from('shipments')
    .select(`
      *,
      subscriber:subscribers(id, email, first_name, last_name)
    `)
    .eq('organization_id', organization.id)
    .eq('status', 'Unfulfilled')
    .in('financial_status', ['pending', 'partially_paid', 'refunded', 'voided'])
    .order('created_at', { ascending: false })

  // Check if ShipStation is connected
  const { data: shipstationIntegration } = await supabase
    .from('integrations')
    .select('connected')
    .eq('organization_id', organization.id)
    .eq('type', 'shipstation')
    .single()

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Shipping Dashboard</h1>
        <p className="text-[#71717a]">Generate labels, merge orders, and prepare batches for packing</p>
      </div>

      <ShippingDashboard
        clientSlug={slug}
        organizationId={organization.id}
        initialShipments={shipments || []}
        recentBatches={recentBatches || []}
        problemOrders={problemOrders || []}
        shipstationConnected={shipstationIntegration?.connected || false}
      />
    </main>
  )
}
