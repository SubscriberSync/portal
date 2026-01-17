'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'
import PackModeView from './PackModeView'

interface PortalHeaderProps {
  company: string
  logoUrl?: string
  status: string
}

export default function PortalHeader({ company, logoUrl, status }: PortalHeaderProps) {
  const [isPackMode, setIsPackMode] = useState(false)

  // Only show Pack Mode button when Live
  const showPackMode = status === 'Live'

  if (isPackMode) {
    return <PackModeView onExit={() => setIsPackMode(false)} />
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#F2F0EF]/80 border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={company}
                className="h-9 w-auto"
              />
            ) : (
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                <span className="text-lg font-semibold text-white">
                  {company.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-foreground">{company}</h1>
              <p className="text-xs text-foreground-tertiary tracking-wide">Subscriber Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Pack Mode Button */}
            {showPackMode && (
              <button
                onClick={() => setIsPackMode(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium transition-colors"
              >
                <Package className="w-4 h-4" />
                <span className="text-sm">Pack Mode</span>
              </button>
            )}

            {/* Status Badge */}
            {status === 'Live' ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
                <div className="w-2 h-2 bg-success rounded-full" />
                <span className="text-sm text-success font-medium">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse-soft" />
                <span className="text-sm text-accent font-medium">{status}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
