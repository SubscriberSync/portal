import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import {
  getOrganizationBySlug,
  getIntakeSubmissions,
  getDiscordConfig,
  getIntegrations,
  upsertOrganization
} from '@/lib/supabase/data'
import OnboardingSection from '@/components/OnboardingSection'
import DiscordPromptBanner from '@/components/DiscordPromptBanner'
import CriticalAlerts from '@/components/CriticalAlerts'
import PackReadyCounter from '@/components/PackReadyCounter'
import StatsGrid from '@/components/StatsGrid'
import Forecasting from '@/components/Forecasting'
import { ClientIntegrations } from '@/lib/types'
import { IntakeSubmission as SupabaseIntakeSubmission, DiscordConfig } from '@/lib/supabase/data'

// Force dynamic rendering - don't cache this page
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PortalPageProps {
  params: Promise<{ slug: string }>
}

// Transform Supabase intake submissions to the format expected by components
function transformSubmissions(submissions: SupabaseIntakeSubmission[]) {
  return submissions.map(s => ({
    item: s.item_type,
    value: s.value_encrypted || '',
    status: s.status,
    rejectionNote: s.rejection_note || undefined,
    submittedAt: s.submitted_at || undefined,
    reviewedAt: s.reviewed_at || undefined,
  }))
}

// Transform Supabase integrations to the format expected by components
function transformIntegrations(integrations: Awaited<ReturnType<typeof getIntegrations>>): ClientIntegrations {
  const findIntegration = (type: string) => integrations.find(i => i.type === type)

  return {
    shopify: {
      connected: findIntegration('shopify')?.connected || false,
      lastSync: findIntegration('shopify')?.last_sync_at || undefined,
    },
    recharge: {
      connected: findIntegration('recharge')?.connected || false,
      lastSync: findIntegration('recharge')?.last_sync_at || undefined,
    },
    klaviyo: {
      connected: findIntegration('klaviyo')?.connected || false,
      lastSync: findIntegration('klaviyo')?.last_sync_at || undefined,
    },
    discord: findIntegration('discord') ? {
      connected: findIntegration('discord')?.connected || false,
      lastSync: findIntegration('discord')?.last_sync_at || undefined,
    } : undefined,
  }
}

// Transform Discord config to onboarding format
function transformDiscordConfig(config: DiscordConfig | null) {
  if (!config) {
    return {
      decision: 'Not Decided' as const,
      newOrExisting: undefined,
      serverName: undefined,
      serverId: undefined,
      channels: [],
      episodeGated: false,
      moderatorName: undefined,
      moderatorEmail: undefined,
      vibe: undefined,
    }
  }

  return {
    decision: config.decision,
    newOrExisting: config.new_or_existing || undefined,
    serverName: config.server_name || undefined,
    serverId: config.server_id || undefined,
    channels: config.channels.map(name => ({ name, enabled: true })),
    episodeGated: config.episode_gated,
    moderatorName: config.moderator_name || undefined,
    moderatorEmail: config.moderator_email || undefined,
    vibe: config.vibe || undefined,
  }
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { slug } = await params
  // Get Clerk auth to verify user has access
  const { orgId, orgSlug } = await auth()

  // Verify the user has access to this organization
  if (orgSlug !== slug) {
    notFound()
  }

  // Get or create organization in Supabase
  let organization = await getOrganizationBySlug(slug)

  if (!organization && orgId) {
    organization = await upsertOrganization({
      id: orgId,
      name: slug,
      slug: slug,
      status: 'Building',
    })
  }

  if (!organization) {
    notFound()
  }

  // Fetch all data in parallel
  const [submissions, discordConfig, integrations] = await Promise.all([
    getIntakeSubmissions(organization.id),
    getDiscordConfig(organization.id),
    getIntegrations(organization.id),
  ])

  // Transform data for components
  const transformedSubmissions = transformSubmissions(submissions)
  const transformedIntegrations = transformIntegrations(integrations)
  const transformedDiscord = transformDiscordConfig(discordConfig)

  // Build onboarding data
  const onboardingData = {
    step1Complete: organization.step1_complete,
    discordDecision: transformedDiscord.decision,
    discordSetup: transformedDiscord,
    step2Complete: organization.step2_complete,
  }

  // Onboarding is complete when Step 1 is done (Discord is now optional)
  const isOnboardingComplete = organization.step1_complete

  // Determine if Discord prompt should be shown
  const discordIntegration = integrations.find(i => i.type === 'discord')
  const isDiscordConnected = discordIntegration?.connected || false
  const now = new Date()
  const remindAt = organization.discord_prompt_remind_at ? new Date(organization.discord_prompt_remind_at) : null
  
  const shouldShowDiscordPrompt = 
    organization.step1_complete && 
    !isDiscordConnected &&
    !organization.discord_prompt_dismissed &&
    (!remindAt || remindAt <= now)

  // Build client object for components
  const client = {
    company: organization.name,
    logoUrl: organization.logo_url || undefined,
    status: organization.status,
    loomUrl: organization.loom_url || undefined,
    hostingRenewal: organization.hosting_renewal,
    integrations: transformedIntegrations,
  }

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-[#71717a]">Welcome to your SubscriberSync portal</p>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Discord Prompt Banner - Show after Step 1 complete, before full onboarding completion */}
        {shouldShowDiscordPrompt && (
          <DiscordPromptBanner clientSlug={slug} />
        )}

        {/* Onboarding Section - Show when building and Step 1 not complete */}
        {client.status !== 'Live' && !isOnboardingComplete && (
          <OnboardingSection
            clientSlug={slug}
            initialSubmissions={transformedSubmissions}
            initialOnboardingData={onboardingData}
            initialIntegrations={integrations.map(i => ({
              type: i.type as 'shopify' | 'klaviyo' | 'recharge' | 'shipstation',
              connected: i.connected,
              lastSync: i.last_sync_at || undefined,
            }))}
            shippingProvider={organization.shipping_provider}
          />
        )}

        {/* Stats - Only show when live */}
        {client.status === 'Live' && (
          <>
            <StatsGrid clientSlug={slug} />

            {/* Critical Alerts */}
            <CriticalAlerts clientSlug={slug} />

            {/* Pack Ready Counter */}
            <PackReadyCounter clientSlug={slug} />

            {/* Inventory Forecast */}
            <Forecasting clientSlug={slug} />
          </>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Video Walkthrough */}
          {client.loomUrl && (
            <a
              href={client.loomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#e07a42]/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#e07a42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-[#e07a42] transition-colors">Video Walkthrough</h3>
                  <p className="text-sm text-[#71717a]">Learn how to use your system</p>
                </div>
              </div>
            </a>
          )}

          {/* Klaviyo Integration */}
          <Link
            href={`/portal/${slug}/klaviyo`}
            className="p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#e07a42]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#e07a42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-[#e07a42] transition-colors">Klaviyo Properties</h3>
                <p className="text-sm text-[#71717a]">View synced properties & events</p>
              </div>
            </div>
          </Link>

          {/* Support */}
          <div className="p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#5CB87A]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#5CB87A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Need Help?</h3>
                <p className="text-sm text-[#71717a]">support@subscribersync.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
