import { auth, currentUser } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { isAdmin } from '@/lib/admin'
import { Package, Truck, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface ShipmentsPageProps {
  params: { slug: string }
}

export default async function ShipmentsPage({ params }: ShipmentsPageProps) {
  const { orgSlug } = await auth()
  const user = await currentUser()
  const userEmail = user?.emailAddresses[0]?.emailAddress
  const userIsAdmin = isAdmin(userEmail)

  if (orgSlug !== params.slug && !userIsAdmin) {
    notFound()
  }

  const organization = await getOrganizationBySlug(params.slug)
  if (!organization) {
    notFound()
  }

  // Fetch shipments from Supabase
  const supabase = createServiceClient()
  const { data: shipments } = await supabase
    .from('shipments')
    .select(`
      *,
      subscriber:subscribers(email, first_name, last_name)
    `)
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Calculate stats
  const stats = {
    unfulfilled: shipments?.filter(s => s.status === 'Unfulfilled').length || 0,
    packed: shipments?.filter(s => s.status === 'Packed').length || 0,
    shipped: shipments?.filter(s => s.status === 'Shipped').length || 0,
    flagged: shipments?.filter(s => s.status === 'Flagged').length || 0,
  }

  const statusColors = {
    Unfulfilled: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Packed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Shipped: 'bg-green-500/10 text-green-500 border-green-500/20',
    Delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
    Flagged: 'bg-red-500/10 text-red-500 border-red-500/20',
    Merged: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  }

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Shipments</h1>
        <p className="text-[#71717a]">Track and manage all orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.unfulfilled}</p>
              <p className="text-sm text-[#71717a]">Unfulfilled</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.packed}</p>
              <p className="text-sm text-[#71717a]">Packed</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.shipped}</p>
              <p className="text-sm text-[#71717a]">Shipped</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.flagged}</p>
              <p className="text-sm text-[#71717a]">Flagged</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="px-6 py-4 text-left text-xs font-medium text-[#71717a] uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#71717a] uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#71717a] uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#71717a] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#71717a] uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
              {shipments && shipments.length > 0 ? (
                shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">
                          {shipment.subscriber?.first_name} {shipment.subscriber?.last_name}
                        </p>
                        <p className="text-sm text-[#71717a]">{shipment.subscriber?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{shipment.product_name || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                        shipment.type === 'Subscription'
                          ? 'bg-[#e07a42]/10 text-[#e07a42]'
                          : 'bg-[#71717a]/10 text-[#71717a]'
                      }`}>
                        {shipment.type || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border ${
                        statusColors[shipment.status as keyof typeof statusColors] || 'bg-[#71717a]/10 text-[#71717a]'
                      }`}>
                        {shipment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#71717a] text-sm">
                      {new Date(shipment.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#71717a]">
                    No shipments yet. Connect Shopify to start syncing orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
