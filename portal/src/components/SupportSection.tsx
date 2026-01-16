'use client'

import { ClientData } from '@/lib/types'
import { useState } from 'react'

interface SupportSectionProps {
  client: ClientData
}

function SupportCard({
  icon,
  title,
  description,
  children,
  accentColor = 'copper',
}: {
  icon: string
  title: string
  description: string
  children: React.ReactNode
  accentColor?: 'copper' | 'purple'
}) {
  const [isHovered, setIsHovered] = useState(false)

  const colors = {
    copper: {
      bg: 'from-copper/20 to-copper/5',
      border: 'border-copper/20',
      glow: 'bg-copper/20',
    },
    purple: {
      bg: 'from-purple-500/20 to-purple-600/5',
      border: 'border-purple-500/20',
      glow: 'bg-purple-500/20',
    },
  }

  const c = colors[accentColor]

  return (
    <div
      className={`
        relative glass rounded-2xl p-6 border border-slate-700/30 overflow-hidden
        transition-all duration-500 ease-out-expo
        ${isHovered ? 'scale-[1.02] shadow-card-hover' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-50`} />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern-dense opacity-20" />

      {/* Hover glow */}
      <div
        className={`
          absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl
          ${c.glow} transition-opacity duration-500
          ${isHovered ? 'opacity-60' : 'opacity-0'}
        `}
      />

      <div className="relative flex items-start gap-5">
        {/* Icon */}
        <div
          className={`
            w-14 h-14 bg-gradient-to-br ${c.bg} rounded-2xl flex items-center justify-center flex-shrink-0
            border ${c.border} transition-all duration-300
            ${isHovered ? 'scale-110 rotate-3' : ''}
          `}
        >
          <span className="text-2xl filter drop-shadow-lg">{icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-bold text-lg text-slate-100 mb-1">{title}</h3>
          <p className="text-sm text-slate-400 mb-4">{description}</p>
          {children}
        </div>
      </div>

      {/* Bottom accent */}
      <div
        className={`
          absolute bottom-0 left-0 h-0.5 bg-gradient-to-r
          ${accentColor === 'copper' ? 'from-copper to-amber-500' : 'from-purple-500 to-violet-500'}
          transition-all duration-500
          ${isHovered ? 'w-full opacity-60' : 'w-0 opacity-0'}
        `}
      />
    </div>
  )
}

export default function SupportSection({ client }: SupportSectionProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <section className="relative glass-strong rounded-3xl border border-slate-700/50 p-8 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div
        className="absolute top-0 right-0 w-64 h-64 bg-copper/10 rounded-full blur-3xl animate-morph"
        style={{ animationDuration: '20s' }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-morph"
        style={{ animationDuration: '15s', animationDelay: '5s' }}
      />

      <div className="relative">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 glass rounded-xl flex items-center justify-center border border-slate-700/50">
            <span className="text-2xl">💬</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Support</h2>
            <p className="text-xs text-slate-500 font-data tracking-wider">GET HELP ANYTIME</p>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
        </div>

        {/* Support cards */}
        <div className="grid md:grid-cols-2 gap-5">
          <SupportCard
            icon="📧"
            title="Need Help?"
            description="Questions or issues with your system"
            accentColor="copper"
          >
            <a
              href="mailto:travis@subscribersync.com"
              className="inline-flex items-center gap-2 text-copper hover:text-copper-light transition-colors font-semibold group"
            >
              travis@subscribersync.com
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </a>
          </SupportCard>

          <SupportCard
            icon="🛠"
            title="Need Changes?"
            description="Custom modifications available"
            accentColor="purple"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-100 font-data">$150</span>
              <span className="text-sm text-slate-500">/ request</span>
            </div>
          </SupportCard>
        </div>

        {/* Hosting Renewal */}
        {client.hostingRenewal && (
          <div className="mt-6 pt-6 border-t border-slate-700/30">
            <div className="glass rounded-2xl p-5 border border-slate-700/30 flex items-center justify-between group hover:border-copper/20 transition-all duration-300">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 glass rounded-xl flex items-center justify-center border border-slate-700/50 group-hover:border-copper/20 transition-colors">
                  <span className="text-2xl">📅</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-data uppercase tracking-wider mb-1">
                    Hosting Renewal
                  </p>
                  <p className="text-lg font-bold text-slate-100">
                    {formatDate(client.hostingRenewal)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-semibold font-data">
                  Auto-reminder enabled
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
