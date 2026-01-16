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
  // Try to get client from Airtable, fall back to demo data
  let client = process.env.AIRTABLE_API_KEY 
    ? await getClientBySlug(params.slug)
    : null
  
  // Use demo data if no Airtable connection or client not found
  if (!client) {
    client = getDemoClient(params.slug)
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {client.logoUrl ? (
                <img 
                  src={client.logoUrl} 
                  alt={client.company} 
                  className="h-10 w-auto"
                />
              ) : (
                <div className="w-10 h-10 bg-copper rounded-lg flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {client.company.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-light">{client.company}</h1>
                <p className="text-sm text-muted">Subscriber Journey System</p>
              </div>
            </div>
            
            {client.status === 'Live' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/20 rounded-full">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-sm text-success font-medium">System Active</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-copper/20 to-copper/5 border border-copper/20 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-light mb-2">
            Welcome to your Subscriber Journey System
          </h2>
          <p className="text-muted">
            Everything is connected. Your subscriber data flows automatically between Recharge, Airtable, and Klaviyo.
          </p>
        </div>

        {/* Status Bar */}
        <StatusBar status={client.status} />

        {/* Stats - Only show when live */}
        {client.status === 'Live' && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-light mb-4 flex items-center gap-2">
                <span>📊</span> Your Subscribers
              </h2>
              <StatsGrid client={client} />
            </div>

            {/* Dashboard Link */}
            {client.airtableUrl && (
              <div className="bg-slate rounded-2xl border border-border p-6">
                <h2 className="text-lg font-semibold text-light mb-4 flex items-center gap-2">
                  <span>📋</span> Your Dashboard
                </h2>
                <a
                  href={client.airtableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-copper hover:bg-copper-dark text-white font-medium rounded-xl transition-colors"
                >
                  Open Airtable Dashboard
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* Video Walkthrough */}
            {client.loomUrl && (
              <div className="bg-slate rounded-2xl border border-border p-6">
                <h2 className="text-lg font-semibold text-light mb-4 flex items-center gap-2">
                  <span>🎥</span> Video Walkthrough
                </h2>
                <div className="aspect-video rounded-xl overflow-hidden bg-ink">
                  <iframe
                    src={client.loomUrl.replace('share', 'embed')}
                    frameBorder="0"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            {/* Klaviyo Reference */}
            <KlaviyoReference />
          </>
        )}

        {/* Support */}
        <SupportSection client={client} />
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted text-sm">
              <div className="w-6 h-6 bg-copper rounded flex items-center justify-center">
                <span className="text-xs font-bold text-white">S</span>
              </div>
              <span>Powered by SubscriberSync</span>
            </div>
            <a 
              href="https://subscribersync.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted hover:text-copper transition-colors"
            >
              subscribersync.com
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
