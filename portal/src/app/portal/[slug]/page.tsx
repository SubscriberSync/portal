import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getClientBySlug, getDemoClient } from '@/lib/airtable'
import { getIntakeSubmissions, getClientOnboardingData } from '@/lib/airtable-intake'
import PortalHeader from '@/components/PortalHeader'
import StatusBar from '@/components/StatusBar'
import SupportSection from '@/components/SupportSection'
import OnboardingSection from '@/components/OnboardingSection'
import CriticalAlerts from '@/components/CriticalAlerts'
import PackReadyCounter from '@/components/PackReadyCounter'
import StatsGrid from '@/components/StatsGrid'
import Forecasting from '@/components/Forecasting'

// Force dynamic rendering - don't cache this page
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PortalPageProps {
  params: { slug: string }
}

export default async function PortalPage({ params }: PortalPageProps) {
  let client = process.env.AIRTABLE_API_KEY
    ? await getClientBySlug(params.slug)
    : null

  if (!client) {
    client = getDemoClient(params.slug)
  }

  // Fetch onboarding data
  const [submissions, onboardingData] = await Promise.all([
    getIntakeSubmissions(params.slug),
    getClientOnboardingData(params.slug),
  ])

  // Default onboarding data if not found
  const defaultOnboardingData = {
    step1Complete: false,
    discordDecision: 'Not Decided' as const,
    step2Complete: false,
  }

  const onboarding = onboardingData || defaultOnboardingData
  const isOnboardingComplete = onboarding.step1Complete && onboarding.step2Complete

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
              <h2 className="text-display">
                Welcome to<br />
                <span className="text-[#C9A962]">Backstage</span>
              </h2>
              <p className="text-lg text-[#A8A39B] max-w-2xl leading-relaxed">
                Your subscriber data flows seamlessly between Recharge, Airtable, and Klaviyo—all in real-time.
              </p>
            </div>

            {/* Decorative line */}
            <div className="w-24 h-px bg-gradient-to-r from-[#C9A962] to-transparent" />
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
              initialSubmissions={submissions}
              initialOnboardingData={onboarding}
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

            {/* Dashboard Link */}
            {client.airtableUrl && (
              <section className="animate-in stagger-4">
                <div className="relative p-8 rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)] overflow-hidden">
                  {/* Top accent line */}
                  <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[rgba(245,240,232,0.1)] to-transparent" />

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[#F5F0E8] mb-1">Dashboard Access</h3>
                      <p className="text-sm text-[#6B6660]">View and manage your subscriber data</p>
                    </div>
                    <a
                      href={client.airtableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#C9A962] to-[#A8893F] text-[#0D0D0D] font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-[#C9A962]/20 hover:scale-[1.02]"
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
                  <h3 className="text-headline text-[#F5F0E8] mb-2">Video Walkthrough</h3>
                  <p className="text-sm text-[#6B6660]">Learn how to use your system</p>
                </div>
                <div className="aspect-video rounded-2xl overflow-hidden bg-[#151515] border border-[rgba(245,240,232,0.06)]">
                  <iframe
                    src={client.loomUrl.replace('share', 'embed')}
                    frameBorder="0"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </section>
            )}

            {/* Klaviyo Integration */}
            <section className="animate-in stagger-5">
              <div className="relative p-8 rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)] overflow-hidden">
                {/* Top accent line */}
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#9333ea]/30 to-transparent" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#F5F0E8] mb-1">Klaviyo Integration</h3>
                      <p className="text-sm text-[#6B6660]">View all synced properties and events for flows & segments</p>
                    </div>
                  </div>
                  <Link
                    href={`/portal/${params.slug}/klaviyo`}
                    className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:scale-[1.02]"
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

      {/* Footer - Premium and refined */}
      <footer className="border-t border-[rgba(245,240,232,0.06)] mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 bg-gradient-to-br from-[#C9A962] to-[#8B7355] rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-[#0D0D0D]">B</span>
                {/* Shine overlay */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
              </div>
              <span className="text-sm text-[#6B6660]">
                Powered by <span className="text-[#A8A39B] font-medium">Backstage</span>
              </span>
            </div>
            <a
              href="https://subscribersync.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#6B6660] hover:text-[#C9A962] transition-colors"
            >
              subscribersync.com
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
