import { auth, currentUser } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug, getIntegrations } from '@/lib/supabase/data'
import { Settings, Plug, User, Bell, Shield } from 'lucide-react'
import ShipStationSettings from '@/components/ShipStationSettings'

export const dynamic = 'force-dynamic'

interface SettingsPageProps {
  params: { slug: string }
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { orgSlug } = await auth()
  const user = await currentUser()

  if (orgSlug !== params.slug) {
    notFound()
  }

  const organization = await getOrganizationBySlug(params.slug)
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
            <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#95BF47]/10 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#95BF47">
                      <path d="M15.337 3.415c-.193-.15-.476-.197-.753-.163-.277.03-.55.1-.8.183a7.478 7.478 0 00-.707.26c-.097-.603-.27-1.126-.524-1.546-.535-.893-1.308-1.364-2.236-1.36-1.02.004-1.948.539-2.762 1.6-.577.747-1.024 1.69-1.16 2.42-.84.26-1.427.44-1.44.446-.425.13-.438.145-.494.55-.04.31-1.04 8.01-1.04 8.01L12.29 15l4.71-1.15s-1.16-8.787-1.226-9.223c-.067-.436-.067-.5-.067-.5l-.37-.712z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Shopify</h3>
                    <p className="text-sm text-[#71717a]">
                      {shopifyIntegration?.connected
                        ? `Connected - Last sync: ${new Date(shopifyIntegration.last_sync_at || '').toLocaleDateString()}`
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                  shopifyIntegration?.connected
                    ? 'bg-[#5CB87A]/10 text-[#5CB87A]'
                    : 'bg-[#71717a]/10 text-[#71717a]'
                }`}>
                  {shopifyIntegration?.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Recharge */}
            <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#5C6BC0]/10 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5C6BC0">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Recharge</h3>
                    <p className="text-sm text-[#71717a]">
                      {rechargeIntegration?.connected
                        ? `Connected - Last sync: ${new Date(rechargeIntegration.last_sync_at || '').toLocaleDateString()}`
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                  rechargeIntegration?.connected
                    ? 'bg-[#5CB87A]/10 text-[#5CB87A]'
                    : 'bg-[#71717a]/10 text-[#71717a]'
                }`}>
                  {rechargeIntegration?.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Klaviyo */}
            <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#2D2D2D] flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Klaviyo</h3>
                    <p className="text-sm text-[#71717a]">
                      {klaviyoIntegration?.connected
                        ? `Connected - Last sync: ${new Date(klaviyoIntegration.last_sync_at || '').toLocaleDateString()}`
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                  klaviyoIntegration?.connected
                    ? 'bg-[#5CB87A]/10 text-[#5CB87A]'
                    : 'bg-[#71717a]/10 text-[#71717a]'
                }`}>
                  {klaviyoIntegration?.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* ShipStation */}
            <ShipStationSettings
              connected={shipstationIntegration?.connected || false}
              lastSyncAt={shipstationIntegration?.last_sync_at}
              organizationId={organization.id}
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
