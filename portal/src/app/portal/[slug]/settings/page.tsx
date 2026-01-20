import { auth, currentUser } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug, getIntegrations } from '@/lib/supabase/data'
import { Plug, User, Bell, Shield, Truck } from 'lucide-react'
import ShipStationSettings from '@/components/ShipStationSettings'
import KlaviyoSettings from '@/components/KlaviyoSettings'
import ShippingPreferencesForm from '@/components/ShippingPreferencesForm'
import ShopifySettings from '@/components/ShopifySettings'
import RechargeSettings from '@/components/RechargeSettings'

export const dynamic = 'force-dynamic'

interface SettingsPageProps {
  params: Promise<{ slug: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params
  const { orgSlug } = await auth()
  const user = await currentUser()

  if (orgSlug !== slug) {
    notFound()
  }

  const organization = await getOrganizationBySlug(slug)
  if (!organization) {
    notFound()
  }

  const integrations = await getIntegrations(organization.id)

  const shopifyIntegration = integrations.find(i => i.type === 'shopify')
  const rechargeIntegration = integrations.find(i => i.type === 'recharge')
  const klaviyoIntegration = integrations.find(i => i.type === 'klaviyo')
  const shipstationIntegration = integrations.find(i => i.type === 'shipstation')

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-[#71717a]">Manage your account and integrations</p>
      </div>

      <div className="space-y-8 max-w-3xl">
        {/* Account Section */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#e07a42]" />
            Account
          </h2>
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
            <div className="flex items-center gap-4">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.firstName || 'User'}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#e07a42]/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-[#e07a42]" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-[#71717a]">{user?.emailAddresses[0]?.emailAddress}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Organization Section */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#e07a42]" />
            Organization
          </h2>
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6 space-y-4">
            <div>
              <label className="text-sm text-[#71717a]">Organization Name</label>
              <p className="text-white font-medium">{organization.name}</p>
            </div>
            <div>
              <label className="text-sm text-[#71717a]">Status</label>
              <p className="text-white font-medium">{organization.status}</p>
            </div>
            <div>
              <label className="text-sm text-[#71717a]">Slug</label>
              <p className="text-white font-mono text-sm">{organization.slug}</p>
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plug className="w-5 h-5 text-[#e07a42]" />
            Integrations
          </h2>
          <div className="space-y-3">
            {/* Shopify */}
            <ShopifySettings
              connected={shopifyIntegration?.connected || false}
              lastSyncAt={shopifyIntegration?.last_sync_at}
            />

            {/* Recharge */}
            <RechargeSettings
              connected={rechargeIntegration?.connected || false}
              lastSyncAt={rechargeIntegration?.last_sync_at}
            />

            {/* Klaviyo */}
            <KlaviyoSettings
              connected={klaviyoIntegration?.connected || false}
              lastSyncAt={klaviyoIntegration?.last_sync_at}
            />

            {/* ShipStation */}
            <ShipStationSettings
              connected={shipstationIntegration?.connected || false}
              lastSyncAt={shipstationIntegration?.last_sync_at}
              organizationId={organization.id}
            />
          </div>
        </section>

        {/* Shipping Preferences Section */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#e07a42]" />
            Shipping Preferences
          </h2>
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
            <ShippingPreferencesForm
              shipstationConnected={shipstationIntegration?.connected || false}
            />
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#e07a42]" />
            Notifications
          </h2>
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
            <p className="text-[#71717a]">Notification settings coming soon.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
