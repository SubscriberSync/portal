'use client'

import { useEffect, useState } from 'react'
import { FadeUpText, TypewriterText } from './AnimatedText'

interface HeroSectionProps {
  company: string
  status: string
}

export default function HeroSection({ company, status }: HeroSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-3xl border border-copper/20 gradient-border-animated">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-copper/10 via-copper/5 to-transparent" />
      <div className="absolute inset-0 grid-pattern opacity-40" />

      {/* Morphing orbs */}
      <div
        className="absolute -top-32 -right-32 w-80 h-80 bg-copper/20 rounded-full blur-3xl animate-morph"
        style={{ animationDuration: '15s' }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-morph"
        style={{ animationDuration: '18s', animationDelay: '5s' }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl animate-float-complex"
        style={{ animationDuration: '12s' }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-copper/40 rounded-full animate-particle"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${8 + i * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative p-10 md:p-12">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Icon */}
          <div
            className={`
              relative flex-shrink-0 transition-all duration-700
              ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
            `}
          >
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-copper/30 to-copper/10 rounded-3xl flex items-center justify-center glass border border-copper/20 shadow-glow-copper">
              <span className="text-5xl md:text-6xl filter drop-shadow-lg animate-float" style={{ animationDuration: '4s' }}>
                🚀
              </span>
            </div>
            {/* Decorative rings */}
            <div className="absolute -inset-2 border border-copper/10 rounded-[2rem] animate-pulse-slow" />
            <div className="absolute -inset-4 border border-copper/5 rounded-[2.5rem]" />
          </div>

          {/* Text content */}
          <div className="flex-1 space-y-4">
            <div
              className={`
                transition-all duration-700 delay-150
                ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-50 leading-tight">
                Welcome to your{' '}
                <span className="gradient-text">Command Center</span>
              </h2>
            </div>

            <div
              className={`
                transition-all duration-700 delay-300
                ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
            >
              <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                Everything is connected. Your subscriber data flows automatically between{' '}
                <span className="text-copper font-semibold">Recharge</span>,{' '}
                <span className="text-copper font-semibold">Airtable</span>, and{' '}
                <span className="text-copper font-semibold">Klaviyo</span> in real-time.
              </p>
            </div>

            {/* Integration badges */}
            <div
              className={`
                flex flex-wrap gap-3 pt-4 transition-all duration-700 delay-500
                ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
            >
              {['Recharge', 'Airtable', 'Klaviyo'].map((integration, index) => (
                <div
                  key={integration}
                  className="flex items-center gap-2 px-4 py-2 glass rounded-full border border-slate-700/50 text-sm hover:border-copper/30 hover:shadow-glow-sm transition-all duration-300 cursor-default"
                  style={{ transitionDelay: `${600 + index * 100}ms` }}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-300 font-medium">{integration}</span>
                  <span className="text-[10px] text-emerald-400 font-data">SYNCED</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats badge */}
          <div
            className={`
              hidden lg:block flex-shrink-0 transition-all duration-700 delay-700
              ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
            `}
          >
            <div className="glass rounded-2xl p-5 border border-slate-700/50 space-y-3 min-w-[160px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-500 uppercase tracking-wider font-data">System Status</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {status === 'Live' ? 'Online' : 'Building'}
              </div>
              <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    status === 'Live'
                      ? 'w-full bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'w-2/3 bg-gradient-to-r from-copper to-amber-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-copper/30 to-transparent" />
      </div>
    </div>
  )
}
