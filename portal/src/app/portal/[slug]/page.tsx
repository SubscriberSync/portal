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
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-md bg-[#0a0c10]/80 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {client.logoUrl ? (
                <img 
                  src={client.logoUrl} 
                  alt={client.company} 
                  className="h-10 w-auto"
                />
              ) : (
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-copper to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-copper/20">
                    <span className="text-xl font-bold text-white">
                      {client.company.charAt(0)}
                    </span>
                  </div>
                  <div className="absolute -inset-1 bg-copper/20 rounded-xl blur-md -z-10" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-slate-50">{client.company}</h1>
                <p className="text-xs text-slate-500 font-data tracking-wider">SUBSCRIBER JOURNEY SYSTEM</p>
              </div>
            </div>
            
            {client.status === 'Live' ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                </div>
                <span className="text-sm text-emerald-400 font-semibold">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-copper/10 border border-copper/30 rounded-full">
                <div className="w-2 h-2 bg-copper rounded-full animate-pulse" />
                <span className="text-sm text-copper font-semibold">BUILDING</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-copper/20 p-8 gradient-border">
          <div className="absolute inset-0 bg-gradient-to-r from-copper/10 via-copper/5 to-transparent" />
          <div className="absolute inset-0 grid-pattern opacity-30" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-copper/20 rounded-full blur-3xl" />
          
          <div className="relative flex items-start gap-5">
            <div className="w-14 h-14 bg-copper/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🚀</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-50 mb-2">
                Welcome to your Command Center
              </h2>
              <p className="text-slate-400 max-w-2xl leading-relaxed">
                Everything is connected. Your subscriber data flows automatically between 
                <span className="text-copper font-medium"> Recharge</span>,
                <span className="text-copper font-medium"> Airtable</span>, and
                <span className="text-copper font-medium"> Klaviyo</span> in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <StatusBar status={client.status} />

        {/* Stats - Only show when live */}
        {client.status === 'Live' && (
          <>
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                  <span>📊</span>
                </div>
                <h2 className="text-lg font-semibold text-slate-100">Subscriber Metrics</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
              </div>
              <StatsGrid client={client} />
            </section>

            {/* Dashboard Link */}
            {client.airtableUrl && (
              <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                    <span>📋</span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-100">Dashboard Access</h2>
                </div>
                <a
                  href={client.airtableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-3 bg-copper hover:bg-copper/90 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-copper/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Open Airtable</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </section>
            )}

            {/* Video Walkthrough */}
            {client.loomUrl && (
              <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                    <span>🎥</span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-100">Video Walkthrough</h2>
                </div>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50">
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
            <KlaviyoReference />
          </>
        )}

        {/* Support */}
        <SupportSection client={client} />
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-copper to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">S</span>
              </div>
              <span className="text-slate-500 text-sm">
                Powered by <span className="text-copper font-medium">SubscriberSync</span>
              </span>
            </div>
            <a 
              href="https://subscribersync.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-slate-500 hover:text-copper transition-colors font-data"
            >
              subscribersync.com
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
