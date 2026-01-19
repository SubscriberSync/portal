import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import {
  Activity,
  Package,
  Truck,
  Flag,
  Layers,
  Printer,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface ActivityPageProps {
  params: Promise<{ slug: string }>
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const { slug } = await params
  const { orgSlug } = await auth()

  if (orgSlug !== slug) {
    notFound()
  }

  const organization = await getOrganizationBySlug(slug)
  if (!organization) {
    notFound()
  }

  // Fetch activity log from Supabase
  const supabase = createServiceClient()
  const { data: activities } = await supabase
    .from('activity_log')
    .select(`
      *,
      subscriber:subscribers(email, first_name, last_name)
    `)
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const activityIcons: Record<string, typeof Activity> = {
    'labels.generated': Printer,
    'shipment.packed': Package,
    'shipment.shipped': Truck,
    'shipment.flagged': Flag,
    'shipments.merged': Layers,
    'order.fulfilled': CheckCircle,
    'order.created': Package,
  }

  const activityColors: Record<string, string> = {
    'labels.generated': 'text-[#e07a42] bg-[#e07a42]/10',
    'shipment.packed': 'text-blue-500 bg-blue-500/10',
    'shipment.shipped': 'text-green-500 bg-green-500/10',
    'shipment.flagged': 'text-yellow-500 bg-yellow-500/10',
    'shipments.merged': 'text-purple-500 bg-purple-500/10',
    'order.fulfilled': 'text-green-500 bg-green-500/10',
    'order.created': 'text-blue-500 bg-blue-500/10',
  }

  const formatEventType = (eventType: string) => {
    const labels: Record<string, string> = {
      'labels.generated': 'Labels Generated',
      'shipment.packed': 'Shipment Packed',
      'shipment.shipped': 'Shipment Shipped',
      'shipment.flagged': 'Shipment Flagged',
      'shipments.merged': 'Shipments Merged',
      'order.fulfilled': 'Order Fulfilled',
      'order.created': 'Order Created',
    }
    return labels[eventType] || eventType.replace('.', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
  }

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Activity Log</h1>
        <p className="text-[#71717a]">Recent activity for your portal</p>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        {activities && activities.length > 0 ? (
          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.event_type] || Activity
              const colors = activityColors[activity.event_type] || 'text-[#71717a] bg-[#71717a]/10'

              return (
                <div key={activity.id} className="p-4 flex items-start gap-4 hover:bg-[rgba(255,255,255,0.02)]">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">
                        {formatEventType(activity.event_type)}
                      </span>
                      {activity.subscriber && (
                        <>
                          <span className="text-[#71717a]">for</span>
                          <span className="text-white">
                            {activity.subscriber.first_name} {activity.subscriber.last_name}
                          </span>
                        </>
                      )}
                    </div>
                    {activity.description && (
                      <p className="text-sm text-[#71717a] mb-1">{activity.description}</p>
                    )}
                    <p className="text-xs text-[#52525b]">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#e07a42]/10 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-[#e07a42]" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Activity Yet</h3>
            <p className="text-[#71717a]">
              Activity will appear here as you pack, ship, and fulfill orders.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
