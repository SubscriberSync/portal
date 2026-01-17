import { notFound } from 'next/navigation'
import { getClientBySlug, getDemoClient } from '@/lib/airtable'
import StatusBar from '@/components/StatusBar'
import StatsGrid from '@/components/StatsGrid'
import KlaviyoReference from '@/components/KlaviyoReference'
import SupportSection from '@/components/SupportSection'

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

  return (
    <main className="min-h-screen">
      {/* Header - Clean, minimal */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {client.logoUrl ? (
                <img
                  src={client.logoUrl}
                  alt={client.company}
                  className="h-9 w-auto"
                />
              ) : (
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                  <span className="text-lg font-semibold text-white">
                    {client.company.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold text-foreground">{client.company}</h1>
                <p className="text-xs text-foreground-tertiary tracking-wide">Subscriber Portal</p>
              </div>
            </div>

            {client.status === 'Live' ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
                <div className="w-2 h-2 bg-success rounded-full" />
                <span className="text-sm text-success font-medium">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse-soft" />
                <span className="text-sm text-accent font-medium">Building</span>
              </div>
            )}
          </div>
        </div>
      </header>

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

          {/* Integration Status */}
          <div className="flex flex-wrap gap-3 mt-8">
            {['Recharge', 'Airtable', 'Klaviyo'].map((integration) => (
              <div
                key={integration}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-background-elevated border border-border"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-sm text-foreground-secondary">{integration}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Status Bar */}
        <section className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <StatusBar status={client.status} />
        </section>

        {/* Stats - Only show when live */}
        {client.status === 'Live' && (
          <>
            <section className="animate-fade-up" style={{ animationDelay: '200ms' }}>
              <div className="mb-8">
                <h3 className="text-headline text-foreground mb-2">Subscriber Metrics</h3>
                <p className="text-foreground-secondary">Real-time data from your system</p>
              </div>
              <StatsGrid client={client} />
            </section>

            {/* Dashboard Link */}
            {client.airtableUrl && (
              <section className="animate-fade-up" style={{ animationDelay: '300ms' }}>
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
              <section className="animate-fade-up" style={{ animationDelay: '400ms' }}>
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

            {/* Klaviyo Reference */}
            <section className="animate-fade-up" style={{ animationDelay: '500ms' }}>
              <KlaviyoReference />
            </section>
          </>
        )}

        {/* Support */}
        <section className="animate-fade-up" style={{ animationDelay: client.status === 'Live' ? '600ms' : '200ms' }}>
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
