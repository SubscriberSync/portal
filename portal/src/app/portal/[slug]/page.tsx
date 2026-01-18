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
        <section className="animate-fade-up">
          <div className="space-y-4">
            <h2 className="text-display text-foreground">
              Welcome to your<br />
              <span className="text-accent">Command Center</span>
            </h2>
            <p className="text-body-lg text-foreground-secondary max-w-2xl">
              Your subscriber data flows automatically between Recharge, Airtable, and Klaviyo in real-time.
            </p>
          </div>
        </section>

        {/* Status Bar */}
        <section className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <StatusBar status={client.status} />
        </section>

        {/* Onboarding Section - Show when building and not complete */}
        {client.status !== 'Live' && !isOnboardingComplete && (
          <section className="animate-fade-up" style={{ animationDelay: '150ms' }}>
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
            <section className="animate-fade-up" style={{ animationDelay: '200ms' }}>
              <div className="mb-8">
                <h3 className="text-headline text-foreground mb-2">Subscriber Metrics</h3>
                <p className="text-foreground-secondary">Real-time data from your system</p>
              </div>
              <StatsGrid clientSlug={params.slug} />
            </section>

            {/* Critical Alerts */}
            <section className="animate-fade-up" style={{ animationDelay: '250ms' }}>
              <CriticalAlerts clientSlug={params.slug} />
            </section>

            {/* Pack Ready Counter */}
            <section className="animate-fade-up" style={{ animationDelay: '300ms' }}>
              <PackReadyCounter clientSlug={params.slug} />
            </section>

            {/* Inventory Forecast */}
            <section className="animate-fade-up" style={{ animationDelay: '350ms' }}>
              <Forecasting clientSlug={params.slug} />
            </section>

            {/* Dashboard Link */}
            {client.airtableUrl && (
              <section className="animate-fade-up" style={{ animationDelay: '400ms' }}>
                <div className="p-8 rounded-2xl bg-background-secondary border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-title text-foreground mb-1">Dashboard Access</h3>
                      <p className="text-sm text-foreground-secondary">View and manage your data</p>
                    </div>
                    <a
                      href={client.airtableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-colors duration-200"
                    >
                      Open Airtable
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </section>
            )}

            {/* Video Walkthrough */}
            {client.loomUrl && (
              <section className="animate-fade-up" style={{ animationDelay: '500ms' }}>
                <div className="mb-6">
                  <h3 className="text-headline text-foreground mb-2">Video Walkthrough</h3>
                  <p className="text-foreground-secondary">Learn how to use your system</p>
                </div>
                <div className="aspect-video rounded-2xl overflow-hidden bg-background-secondary border border-border">
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
            <section className="animate-fade-up" style={{ animationDelay: '600ms' }}>
              <div className="p-8 rounded-2xl bg-background-secondary border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-title text-foreground mb-1">Klaviyo Integration</h3>
                      <p className="text-sm text-foreground-secondary">View all synced properties and events for flows & segments</p>
                    </div>
                  </div>
                  <Link
                    href={`/portal/${params.slug}/klaviyo`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all duration-200"
                  >
                    View Properties
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Support */}
        <section className="animate-fade-up" style={{ animationDelay: client.status === 'Live' ? '700ms' : '200ms' }}>
          <SupportSection client={client} />
        </section>
      </div>

      {/* Footer - Clean and simple */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-xs font-semibold text-white">S</span>
              </div>
              <span className="text-sm text-foreground-tertiary">
                Powered by <span className="text-foreground-secondary">SubscriberSync</span>
              </span>
            </div>
            <a
              href="https://subscribersync.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground-tertiary hover:text-foreground-secondary transition-colors"
            >
              subscribersync.com
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
