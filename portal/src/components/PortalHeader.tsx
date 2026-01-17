'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, ChevronDown } from 'lucide-react'
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
            {showPackMode && clientSlug && (
              <Link
                href={`/portal/${clientSlug}/pack`}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium transition-colors"
              >
                <Package className="w-4 h-4" />
                <span className="text-sm">Pack Mode</span>
              </Link>
            )}

            {/* Integration Status Dropdown */}
            {status === 'Live' ? (
              <div className="relative">
                <button
                  onClick={() => setShowIntegrations(!showIntegrations)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 hover:bg-success/15 transition-colors"
                >
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span className="text-sm text-success font-medium">
                    {connectedCount} Connected
                  </span>
                  <ChevronDown className={`w-4 h-4 text-success transition-transform ${showIntegrations ? 'rotate-180' : ''}`} />
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
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50">
                      <div className="p-3 border-b border-border">
                        <p className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                          Integration Status
                        </p>
                      </div>
                      <div className="p-2">
                        {integrations.map((integration) => (
                          <div
                            key={integration.name}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-background-elevated"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${integration.connected ? 'bg-success' : 'bg-foreground-tertiary'}`} />
                              <span className="text-sm font-medium text-foreground">{integration.name}</span>
                            </div>
                            {integration.connected && integration.lastSync && (
                              <span className="text-xs text-foreground-tertiary">
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
