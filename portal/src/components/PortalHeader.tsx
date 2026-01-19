'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, ChevronDown, Settings, Users, Sparkles } from 'lucide-react'
import { UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import { ClientIntegrations } from '@/lib/types'
import ThemeToggle from './ThemeToggle'

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
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0c0c0c]/80 border-b border-[rgba(255,255,255,0.06)]">
      {/* Subtle orange accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e07a42]/40 to-transparent" />

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
              <div className="relative w-11 h-11 rounded-xl bg-[#e07a42] flex items-center justify-center shadow-lg shadow-[#e07a42]/25">
                <span className="text-lg font-semibold text-[#0c0c0c]">
                  {company.charAt(0)}
                </span>
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white tracking-tight">{company}</h1>
              </div>
              <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-[#71717a]">
                SubscriberSync
              </p>
            </div>
          </div>

          {/* Right: Navigation & Status */}
          <div className="flex items-center gap-3">
            {/* Subscribers Button - Glass Style */}
            {showPackMode && clientSlug && (
              <Link
                href={`/portal/${clientSlug}/subscribers`}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(255,255,255,0.03)] backdrop-blur-xl hover:bg-[rgba(255,255,255,0.06)] text-[#a1a1aa] hover:text-white font-medium transition-all border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)]"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm">Subscribers</span>
              </Link>
            )}

            {/* Pack Mode Button - Solid Orange */}
            {showPackMode && clientSlug && (
              <Link
                href={`/portal/${clientSlug}/pack`}
                className="group relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e07a42] text-[#0c0c0c] font-semibold transition-all hover:bg-[#e8935f] hover:shadow-lg hover:shadow-[#e07a42]/30 hover:scale-[1.02]"
              >
                <Package className="w-4 h-4" />
                <span className="text-sm">Pack Mode</span>
                {/* Shine overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}

            {/* Admin Settings Button - Glass */}
            {clientSlug && (
              <Link
                href={`/portal/${clientSlug}/admin`}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(255,255,255,0.03)] backdrop-blur-xl hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-all"
                title="Admin Settings"
              >
                <Settings className="w-4 h-4 text-[#71717a] hover:text-[#a1a1aa]" />
              </Link>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Organization Switcher */}
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: 'flex items-center',
                  organizationSwitcherTrigger: 'px-3 py-2 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-all',
                },
              }}
            />

            {/* User Button */}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-9 h-9 rounded-full border-2 border-[rgba(255,255,255,0.1)]',
                },
              }}
            />

            {/* Integration Status Dropdown */}
            {status === 'Live' ? (
              <div className="relative">
                <button
                  onClick={() => setShowIntegrations(!showIntegrations)}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[rgba(224,122,66,0.1)] border border-[rgba(224,122,66,0.2)] hover:bg-[rgba(224,122,66,0.15)] transition-all backdrop-blur-xl"
                >
                  <div className="relative w-2 h-2">
                    <div className="absolute inset-0 bg-[#e07a42] rounded-full" />
                    <div className="absolute inset-0 bg-[#e07a42] rounded-full animate-ping opacity-50" />
                  </div>
                  <span className="text-sm text-[#e07a42] font-medium">
                    {connectedCount} Connected
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#e07a42] transition-transform duration-200 ${showIntegrations ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown - Glass Panel */}
                {showIntegrations && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowIntegrations(false)}
                    />
                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-3 w-72 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl rounded-2xl shadow-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden z-50 animate-in">
                      {/* Header */}
                      <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#e07a42]" />
                          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-[#e07a42]">
                            Integrations
                          </p>
                        </div>
                      </div>
                      {/* List */}
                      <div className="p-2">
                        {integrations.map((integration, idx) => (
                          <div
                            key={integration.name}
                            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${integration.connected ? 'bg-[#e07a42]' : 'bg-[#71717a]'}`} />
                              <span className="text-sm font-medium text-white">{integration.name}</span>
                            </div>
                            {integration.connected && integration.lastSync && (
                              <span className="text-xs text-[#71717a] font-mono">
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
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)] backdrop-blur-xl">
                <div className="relative w-2 h-2">
                  <div className="absolute inset-0 bg-[#fbbf24] rounded-full animate-pulse" />
                </div>
                <span className="text-sm text-[#fbbf24] font-medium">{status}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
