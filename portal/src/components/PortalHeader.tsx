'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, ChevronDown, Settings, Users, Sparkles } from 'lucide-react'
import { ClientIntegrations } from '@/lib/types'

interface Integration {
  name: string
  connected: boolean
  lastSync?: string
}

interface PortalHeaderProps {
  company: string
  logoUrl?: string
  status: string
  integrations?: ClientIntegrations
  clientSlug?: string
}

export default function PortalHeader({ company, logoUrl, status, integrations: clientIntegrations, clientSlug }: PortalHeaderProps) {
  const [showIntegrations, setShowIntegrations] = useState(false)

  // Only show Pack Mode button when Live
  const showPackMode = status === 'Live'

  // Build integration list from real data
  const integrations: Integration[] = []

  if (clientIntegrations) {
    integrations.push({
      name: 'Shopify',
      connected: clientIntegrations.shopify.connected,
      lastSync: clientIntegrations.shopify.lastSync,
    })
    integrations.push({
      name: 'Recharge',
      connected: clientIntegrations.recharge.connected,
      lastSync: clientIntegrations.recharge.lastSync,
    })
    integrations.push({
      name: 'Klaviyo',
      connected: clientIntegrations.klaviyo.connected,
      lastSync: clientIntegrations.klaviyo.lastSync,
    })
    integrations.push({
      name: 'Airtable',
      connected: clientIntegrations.airtable.connected,
      lastSync: clientIntegrations.airtable.lastSync,
    })

    // Only add Discord if configured
    if (clientIntegrations.discord) {
      integrations.push({
        name: 'Discord',
        connected: clientIntegrations.discord.connected,
        lastSync: clientIntegrations.discord.lastSync,
      })
    }
  }

  const connectedCount = integrations.filter(i => i.connected).length

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0D0D0D]/80 border-b border-[rgba(245,240,232,0.06)]">
      {/* Subtle gold accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A962]/30 to-transparent" />

      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center gap-5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={company}
                className="h-9 w-auto"
              />
            ) : (
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#C9A962] to-[#8B7355] flex items-center justify-center shadow-lg shadow-[#C9A962]/20">
                <span className="text-lg font-semibold text-[#0D0D0D]">
                  {company.charAt(0)}
                </span>
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-[#F5F0E8] tracking-tight">{company}</h1>
              </div>
              <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-[#6B6660]">
                Backstage
              </p>
            </div>
          </div>

          {/* Right: Navigation & Status */}
          <div className="flex items-center gap-3">
            {/* Subscribers Button */}
            {showPackMode && clientSlug && (
              <Link
                href={`/portal/${clientSlug}/subscribers`}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A1A] hover:bg-[#1E1E1E] text-[#A8A39B] hover:text-[#F5F0E8] font-medium transition-all border border-[rgba(245,240,232,0.06)] hover:border-[rgba(245,240,232,0.1)]"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm">Subscribers</span>
              </Link>
            )}

            {/* Pack Mode Button - Premium Gold Style */}
            {showPackMode && clientSlug && (
              <Link
                href={`/portal/${clientSlug}/pack`}
                className="group relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#C9A962] to-[#A8893F] text-[#0D0D0D] font-semibold transition-all hover:shadow-lg hover:shadow-[#C9A962]/25 hover:scale-[1.02]"
              >
                <Package className="w-4 h-4" />
                <span className="text-sm">Pack Mode</span>
                {/* Shine overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}

            {/* Admin Settings Button */}
            {clientSlug && (
              <Link
                href={`/portal/${clientSlug}/admin`}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1A1A1A] hover:bg-[#1E1E1E] border border-[rgba(245,240,232,0.06)] hover:border-[rgba(245,240,232,0.1)] transition-all"
                title="Admin Settings"
              >
                <Settings className="w-4 h-4 text-[#6B6660] hover:text-[#A8A39B]" />
              </Link>
            )}

            {/* Integration Status Dropdown */}
            {status === 'Live' ? (
              <div className="relative">
                <button
                  onClick={() => setShowIntegrations(!showIntegrations)}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#5CB87A]/10 border border-[#5CB87A]/20 hover:bg-[#5CB87A]/15 transition-all"
                >
                  <div className="relative w-2 h-2">
                    <div className="absolute inset-0 bg-[#5CB87A] rounded-full" />
                    <div className="absolute inset-0 bg-[#5CB87A] rounded-full animate-ping opacity-50" />
                  </div>
                  <span className="text-sm text-[#5CB87A] font-medium">
                    {connectedCount} Connected
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#5CB87A] transition-transform duration-200 ${showIntegrations ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {showIntegrations && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowIntegrations(false)}
                    />
                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-3 w-72 bg-[#151515] rounded-2xl shadow-2xl border border-[rgba(245,240,232,0.08)] overflow-hidden z-50 animate-in">
                      {/* Header */}
                      <div className="px-5 py-4 border-b border-[rgba(245,240,232,0.06)]">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#C9A962]" />
                          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-[#C9A962]">
                            Integrations
                          </p>
                        </div>
                      </div>
                      {/* List */}
                      <div className="p-2">
                        {integrations.map((integration, idx) => (
                          <div
                            key={integration.name}
                            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#1A1A1A] transition-colors"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${integration.connected ? 'bg-[#5CB87A]' : 'bg-[#4A4743]'}`} />
                              <span className="text-sm font-medium text-[#F5F0E8]">{integration.name}</span>
                            </div>
                            {integration.connected && integration.lastSync && (
                              <span className="text-xs text-[#6B6660] font-mono">
                                {integration.lastSync}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#C9A962]/10 border border-[#C9A962]/20">
                <div className="relative w-2 h-2">
                  <div className="absolute inset-0 bg-[#C9A962] rounded-full animate-pulse" />
                </div>
                <span className="text-sm text-[#C9A962] font-medium">{status}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
