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
import PortalHeader from '@/components/PortalHeader'
import StatusBar from '@/components/StatusBar'
import SupportSection from '@/components/SupportSection'
import OnboardingSection from '@/components/OnboardingSection'
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
  params: { slug: string }
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
    airtable: {
      connected: false, // No longer using Airtable
      lastSync: undefined,
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
  // Get Clerk auth to verify user has access
  const { orgId, orgSlug } = await auth()

  // Verify the user has access to this organization
  if (orgSlug !== params.slug) {
    // User is trying to access a different org than their active one
    notFound()
  }

  // Get or create organization in Supabase
  let organization = await getOrganizationBySlug(params.slug)

  if (!organization && orgId) {
    // Organization doesn't exist in Supabase yet - create it
    organization = await upsertOrganization({
      id: orgId,
      name: params.slug, // Will be updated by webhook
      slug: params.slug,
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

  const isOnboardingComplete = organization.step1_complete && organization.step2_complete

  // Build client object for components
  const client = {
    company: organization.name,
    logoUrl: organization.logo_url || undefined,
    status: organization.status,
    airtableUrl: organization.airtable_url || undefined,
    loomUrl: organization.loom_url || undefined,
    hostingRenewal: organization.hosting_renewal,
    integrations: transformedIntegrations,
  }

  return (
    <main className="min-h-screen">
      {/* Header with Pack Mode and Integration Status */}
      <PortalHeader
        company={client.company}
        logoUrl={client.logoUrl}
        status={client.status}
        integrations={client.integrations}
        clientSlug={params.slug}
      />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        {/* Welcome Section */}
        <section className="animate-in">
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-display text-white">
                Welcome to<br />
                <span className="text-[#e07a42]">Backstage</span>
              </h2>
              <p className="text-lg text-[#a1a1aa] max-w-2xl leading-relaxed">
                Your subscriber data flows seamlessly between Recharge, Airtable, and Klaviyo—all in real-time.
              </p>
            </div>

            {/* Decorative line - Orange */}
            <div className="w-24 h-px bg-gradient-to-r from-[#e07a42] to-transparent" />
          </div>
        </section>

        {/* Status Bar */}
        <section className="animate-in stagger-1">
          <StatusBar status={client.status} />
        </section>

        {/* Onboarding Section - Show when building and not complete */}
        {client.status !== 'Live' && !isOnboardingComplete && (
          <section className="animate-in stagger-2">
            <OnboardingSection
              clientSlug={params.slug}
              initialSubmissions={transformedSubmissions}
              initialOnboardingData={onboardingData}
            />
          </section>
        )}

        {/* Stats - Only show when live */}
        {client.status === 'Live' && (
          <>
            <section className="animate-in stagger-2">
              <StatsGrid clientSlug={params.slug} />
            </section>

            {/* Critical Alerts */}
            <section className="animate-in stagger-3">
              <CriticalAlerts clientSlug={params.slug} />
            </section>

            {/* Pack Ready Counter */}
            <section className="animate-in stagger-3">
              <PackReadyCounter clientSlug={params.slug} />
            </section>

            {/* Inventory Forecast */}
            <section className="animate-in stagger-4">
              <Forecasting clientSlug={params.slug} />
            </section>

            {/* Dashboard Link - Glass Panel */}
            {client.airtableUrl && (
              <section className="animate-in stagger-4">
                <div className="relative p-8 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_20px_40px_rgba(0,0,0,0.3)]">
                  {/* Top accent line */}
                  <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Dashboard Access</h3>
                      <p className="text-sm text-[#71717a]">View and manage your subscriber data</p>
                    </div>
                    <a
                      href={client.airtableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 px-6 py-3 bg-[#e07a42] text-[#0c0c0c] font-semibold rounded-xl transition-all hover:bg-[#e8935f] hover:shadow-lg hover:shadow-[#e07a42]/25 hover:scale-[1.02]"
                    >
                      Open Airtable
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </section>
            )}

            {/* Video Walkthrough */}
            {client.loomUrl && (
              <section className="animate-in stagger-5">
                <div className="mb-6">
                  <h3 className="text-headline text-white mb-2">Video Walkthrough</h3>
                  <p className="text-sm text-[#71717a]">Learn how to use your system</p>
                </div>
                <div className="aspect-video rounded-2xl overflow-hidden bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)]">
                  <iframe
                    src={client.loomUrl.replace('share', 'embed')}
                    frameBorder="0"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </section>
            )}

            {/* Klaviyo Integration - Glass with Orange accent */}
            <section className="animate-in stagger-5">
              <div className="relative p-8 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_20px_40px_rgba(0,0,0,0.3)]">
                {/* Top accent line */}
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#e07a42]/40 to-transparent" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[rgba(224,122,66,0.15)] flex items-center justify-center shadow-lg shadow-[#e07a42]/20 border border-[rgba(224,122,66,0.2)]">
                      <svg className="w-6 h-6 text-[#e07a42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Klaviyo Integration</h3>
                      <p className="text-sm text-[#71717a]">View all synced properties and events for flows & segments</p>
                    </div>
                  </div>
                  <Link
                    href={`/portal/${params.slug}/klaviyo`}
                    className="group inline-flex items-center gap-2 px-6 py-3 bg-[#e07a42] text-[#0c0c0c] font-semibold rounded-xl transition-all hover:bg-[#e8935f] hover:shadow-lg hover:shadow-[#e07a42]/25 hover:scale-[1.02]"
                  >
                    View Properties
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Support */}
        <section className="animate-in" style={{ animationDelay: client.status === 'Live' ? '400ms' : '200ms' }}>
          <SupportSection client={client} />
        </section>
      </div>

      {/* Footer - Glass style */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 bg-[#e07a42] rounded-lg flex items-center justify-center shadow-lg shadow-[#e07a42]/20">
                <span className="text-xs font-bold text-[#0c0c0c]">B</span>
                {/* Shine overlay */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
              </div>
              <span className="text-sm text-[#71717a]">
                Powered by <span className="text-[#a1a1aa] font-medium">Backstage</span>
              </span>
            </div>
            <a
              href="https://subscribersync.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#71717a] hover:text-[#e07a42] transition-colors"
            >
              subscribersync.com
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
