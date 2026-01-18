import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { Calendar, User, Package, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface EventsPageProps {
  params: { slug: string }
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { orgSlug } = await auth()

  if (orgSlug !== params.slug) {
    notFound()
  }

  const organization = await getOrganizationBySlug(params.slug)
  if (!organization) {
    notFound()
  }

  // Fetch activity log from Supabase
  const supabase = createServiceClient()
  const { data: events } = await supabase
    .from('activity_log')
    .select(`
      *,
      subscriber:subscribers(email, first_name, last_name)
    `)
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const eventIcons: Record<string, typeof Calendar> = {
    'subscription.created': CreditCard,
    'subscription.cancelled': AlertTriangle,
    'subscription.updated': CreditCard,
    'order.created': Package,
    'order.fulfilled': CheckCircle,
    'customer.created': User,
    'customer.updated': User,
    'charge.success': CreditCard,
    'charge.failed': AlertTriangle,
  }

  const eventColors: Record<string, string> = {
    'subscription.created': 'text-green-500 bg-green-500/10',
    'subscription.cancelled': 'text-red-500 bg-red-500/10',
    'subscription.updated': 'text-blue-500 bg-blue-500/10',
    'order.created': 'text-[#e07a42] bg-[#e07a42]/10',
    'order.fulfilled': 'text-green-500 bg-green-500/10',
    'customer.created': 'text-purple-500 bg-purple-500/10',
    'customer.updated': 'text-purple-500 bg-purple-500/10',
    'charge.success': 'text-green-500 bg-green-500/10',
    'charge.failed': 'text-red-500 bg-red-500/10',
  }

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Events</h1>
        <p className="text-[#71717a]">Activity log of subscription and order events</p>
      </div>

      {/* Events Timeline */}
      <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        {events && events.length > 0 ? (
          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            {events.map((event) => {
              const Icon = eventIcons[event.event_type] || Calendar
              const colors = eventColors[event.event_type] || 'text-[#71717a] bg-[#71717a]/10'

              return (
                <div key={event.id} className="p-4 flex items-start gap-4 hover:bg-[rgba(255,255,255,0.02)]">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">
                        {event.event_type.replace('.', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                      {event.subscriber && (
                        <>
                          <span className="text-[#71717a]">for</span>
                          <span className="text-white">
                            {event.subscriber.first_name} {event.subscriber.last_name}
                          </span>
                        </>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-[#71717a] mb-1">{event.description}</p>
                    )}
                    <p className="text-xs text-[#52525b]">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#e07a42]/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[#e07a42]" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Events Yet</h3>
            <p className="text-[#71717a]">
              Events will appear here as subscribers and orders flow through the system.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
