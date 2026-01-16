import { ClientData } from '@/lib/types'

interface SupportSectionProps {
  client: ClientData
}

export default function SupportSection({ client }: SupportSectionProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <section className="bg-gradient-to-br from-slate-900/80 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-copper/5 rounded-full blur-3xl" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
            <span>💬</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-100">Support</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {/* Contact */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/30 card-hover">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-copper/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📧</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">Need Help?</h3>
                <p className="text-sm text-slate-400 mb-3">
                  Questions or issues with your system
                </p>
                <a 
                  href="mailto:travis@subscribersync.com"
                  className="inline-flex items-center gap-2 text-copper hover:text-orange-400 transition-colors text-sm font-semibold group"
                >
                  travis@subscribersync.com
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          {/* Changes */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/30 card-hover">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🛠</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">Need Changes?</h3>
                <p className="text-sm text-slate-400 mb-3">
                  Custom modifications available
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-100 font-data">$150</span>
                  <span className="text-sm text-slate-500">/ request</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Renewal */}
        {client.hostingRenewal && (
          <div className="mt-5 pt-5 border-t border-slate-700/30">
            <div className="flex items-center justify-between bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <span>📅</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-data uppercase tracking-wider">Hosting Renewal</p>
                  <p className="font-semibold text-slate-100">{formatDate(client.hostingRenewal)}</p>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <span className="text-xs text-emerald-400 font-data">Auto-reminder enabled</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
