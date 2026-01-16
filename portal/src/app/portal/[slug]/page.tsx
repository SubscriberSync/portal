import { notFound } from 'next/navigation'
import { getClientBySlug, getDemoClient } from '@/lib/airtable'
import StatusBar from '@/components/StatusBar'
import StatsGrid from '@/components/StatsGrid'
import KlaviyoReference from '@/components/KlaviyoReference'
import SupportSection from '@/components/SupportSection'
import AnimatedSection from '@/components/AnimatedSection'
import HeroSection from '@/components/HeroSection'

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
      <header className="border-b border-slate-800/50 backdrop-blur-xl bg-[#0a0c10]/70 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {client.logoUrl ? (
                <img
                  src={client.logoUrl}
                  alt={client.company}
                  className="h-10 w-auto"
                />
              ) : (
                <div className="relative group">
                  <div className="w-12 h-12 bg-gradient-to-br from-copper to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-copper/30 transition-transform duration-300 group-hover:scale-105">
                    <span className="text-xl font-bold text-white">
                      {client.company.charAt(0)}
                    </span>
                  </div>
                  <div className="absolute -inset-1 bg-copper/30 rounded-xl blur-lg -z-10 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-slate-50">{client.company}</h1>
                <p className="text-xs text-slate-500 font-data tracking-[0.2em]">SUBSCRIBER JOURNEY SYSTEM</p>
              </div>
            </div>

            {client.status === 'Live' ? (
              <div className="flex items-center gap-2.5 px-5 py-2.5 glass rounded-full border border-emerald-500/30 shadow-glow-emerald">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                  <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                </div>
                <span className="text-sm text-emerald-400 font-bold tracking-wide">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-5 py-2.5 glass rounded-full border border-copper/30 shadow-glow-sm">
                <div className="w-2.5 h-2.5 bg-copper rounded-full animate-pulse" />
                <span className="text-sm text-copper font-bold tracking-wide">BUILDING</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        {/* Hero Section */}
        <AnimatedSection animation="fade-up" delay={0}>
          <HeroSection company={client.company} status={client.status} />
        </AnimatedSection>

        {/* Status Bar */}
        <AnimatedSection animation="fade-up" delay={100}>
          <StatusBar status={client.status} />
        </AnimatedSection>

        {/* Stats - Only show when live */}
        {client.status === 'Live' && (
          <>
            <AnimatedSection animation="fade-up" delay={200}>
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 glass rounded-xl flex items-center justify-center border border-slate-700/50">
                    <span className="text-xl">📊</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">Subscriber Metrics</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-700 via-slate-800 to-transparent" />
                </div>
                <StatsGrid client={client} />
              </section>
            </AnimatedSection>

            {/* Dashboard Link */}
            {client.airtableUrl && (
              <AnimatedSection animation="fade-up" delay={300}>
                <section className="glass-strong rounded-2xl border border-slate-700/50 p-6 relative overflow-hidden group">
                  {/* Background effects */}
                  <div className="absolute inset-0 grid-pattern opacity-30" />
                  <div className="absolute -top-20 -right-20 w-48 h-48 bg-copper/10 rounded-full blur-3xl group-hover:bg-copper/20 transition-all duration-500" />

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 glass rounded-xl flex items-center justify-center border border-slate-700/50">
                        <span className="text-xl">📋</span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-100">Dashboard Access</h2>
                    </div>
                    <a
                      href={client.airtableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-copper to-orange-600 hover:from-copper-light hover:to-orange-500 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-glow-copper hover:scale-102 active:scale-98 shine"
                    >
                      <span>Open Airtable</span>
                      <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </section>
              </AnimatedSection>
            )}

            {/* Video Walkthrough */}
            {client.loomUrl && (
              <AnimatedSection animation="fade-up" delay={400}>
                <section className="glass-strong rounded-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                  <div className="absolute inset-0 grid-pattern opacity-30" />

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 glass rounded-xl flex items-center justify-center border border-slate-700/50">
                        <span className="text-xl">🎥</span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-100">Video Walkthrough</h2>
                    </div>
                    <div className="aspect-video rounded-xl overflow-hidden glass border border-slate-700/50 shadow-card">
                      <iframe
                        src={client.loomUrl.replace('share', 'embed')}
                        frameBorder="0"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )}

            {/* Klaviyo Reference */}
            <AnimatedSection animation="fade-up" delay={500}>
              <KlaviyoReference />
            </AnimatedSection>
          </>
        )}

        {/* Support */}
        <AnimatedSection animation="fade-up" delay={client.status === 'Live' ? 600 : 200}>
          <SupportSection client={client} />
        </AnimatedSection>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-16 relative overflow-hidden">
        {/* Background effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] to-transparent" />

        <div className="max-w-6xl mx-auto px-6 py-8 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-10 h-10 bg-gradient-to-br from-copper to-orange-600 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <span className="text-sm font-bold text-white">S</span>
                </div>
                <div className="absolute -inset-0.5 bg-copper/20 rounded-lg blur-md -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-slate-500 text-sm">
                Powered by <span className="text-copper font-semibold hover:text-copper-light transition-colors">SubscriberSync</span>
              </span>
            </div>
            <a
              href="https://subscribersync.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-500 hover:text-copper transition-colors font-data tracking-wide group"
            >
              subscribersync.com
              <span className="inline-block transition-transform group-hover:translate-x-1 ml-1">→</span>
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
