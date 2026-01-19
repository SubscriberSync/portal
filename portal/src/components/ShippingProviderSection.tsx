'use client'

import { useState } from 'react'
import { 
  Ship, 
  Check, 
  AlertTriangle, 
  FileSpreadsheet, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  X,
  Zap,
  PackageCheck,
  Combine,
  AlertCircle
} from 'lucide-react'

type ShippingProvider = 'shipstation' | 'pirateship' | 'shopify_shipping' | null

interface ShippingProviderSectionProps {
  clientSlug: string
  currentProvider: ShippingProvider
  isShipStationConnected: boolean
  onRefresh: () => void
}

export default function ShippingProviderSection({
  clientSlug,
  currentProvider,
  isShipStationConnected,
  onRefresh
}: ShippingProviderSectionProps) {
  const [selectedProvider, setSelectedProvider] = useState<ShippingProvider>(currentProvider)
  const [isExpanded, setIsExpanded] = useState(!currentProvider)
  const [isLoading, setIsLoading] = useState(false)
  const [showShopifyWarning, setShowShopifyWarning] = useState(false)
  const [showShipStationForm, setShowShipStationForm] = useState(false)
  const [isSkipped, setIsSkipped] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // ShipStation form state
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [shipStationError, setShipStationError] = useState('')

  const handleSelectProvider = async (provider: ShippingProvider) => {
    setError(null) // Clear any previous error
    
    if (provider === 'shopify_shipping') {
      setShowShopifyWarning(true)
      return
    }

    if (provider === 'shipstation') {
      if (isShipStationConnected) {
        // Already connected, just save preference
        await savePreference(provider)
      } else {
        // Show connection form
        setSelectedProvider(provider)
        setShowShipStationForm(true)
      }
      return
    }

    // For pirateship, save directly
    await savePreference(provider)
  }

  const savePreference = async (provider: ShippingProvider) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/shipping/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSelectedProvider(provider)
        setIsExpanded(false)
        onRefresh()
      } else {
        setError(data.error || 'Failed to save preference')
      }
    } catch (err) {
      console.error('Error saving shipping preference:', err)
      setError('Failed to save preference. Please try again.')
    }
    setIsLoading(false)
  }

  const handleConfirmShopify = async () => {
    setShowShopifyWarning(false)
    await savePreference('shopify_shipping')
  }

  const handleConnectShipStation = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setShipStationError('Both API Key and API Secret are required')
      return
    }

    setIsLoading(true)
    setShipStationError('')

    try {
      const response = await fetch('/api/integrations/shipstation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect ShipStation')
      }

      // Now save the preference
      await savePreference('shipstation')
      setShowShipStationForm(false)
      setApiKey('')
      setApiSecret('')
    } catch (error) {
      setShipStationError(error instanceof Error ? error.message : 'Failed to connect')
    }
    setIsLoading(false)
  }

  const getProviderLabel = (provider: ShippingProvider) => {
    switch (provider) {
      case 'shipstation': return 'ShipStation'
      case 'pirateship': return 'Pirateship'
      case 'shopify_shipping': return 'Shopify Shipping'
      default: return 'Not selected'
    }
  }

  // Hidden state when skipped
  if (isSkipped && !selectedProvider) {
    return null
  }

  // The effective provider is either the saved one or the newly selected one
  const effectiveProvider = selectedProvider || currentProvider

  // Collapsed state when provider is selected
  if (effectiveProvider && !isExpanded) {
    return (
      <div className="relative rounded-xl bg-[#1A1A1A] border border-[rgba(245,240,232,0.04)] overflow-hidden">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#84C225]/10 flex items-center justify-center">
              <Ship className="w-5 h-5 text-[#84C225]" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-[#F5F0E8]">Shipping Provider</h4>
                <span className="px-2 py-0.5 rounded text-xs bg-[rgba(245,240,232,0.05)] text-[#6B6660]">Optional</span>
              </div>
              <p className="text-sm text-[#5CB87A]">
                {getProviderLabel(effectiveProvider)}
                {effectiveProvider === 'shipstation' && isShipStationConnected && ' - Connected'}
              </p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-[#6B6660]" />
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="relative rounded-xl bg-[#1A1A1A] border border-[rgba(245,240,232,0.04)] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(245,240,232,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#84C225]/10 flex items-center justify-center">
                <Ship className="w-5 h-5 text-[#84C225]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-[#F5F0E8]">Shipping Provider</h4>
                  <span className="px-2 py-0.5 rounded text-xs bg-[rgba(245,240,232,0.05)] text-[#6B6660]">Optional</span>
                </div>
                <p className="text-sm text-[#6B6660]">Choose how you want to create shipping labels</p>
              </div>
            </div>
            {effectiveProvider && (
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                <ChevronUp className="w-5 h-5 text-[#6B6660]" />
              </button>
            )}
          </div>
        </div>

        {/* Provider Options */}
        <div className="p-4 space-y-3">
          {/* ShipStation - Recommended */}
          <button
            onClick={() => handleSelectProvider('shipstation')}
            disabled={isLoading}
            className={`w-full p-4 rounded-xl border transition-all text-left ${
              selectedProvider === 'shipstation'
                ? 'bg-[#84C225]/10 border-[#84C225]/30'
                : 'bg-[#0D0D0D] border-[rgba(245,240,232,0.06)] hover:border-[rgba(245,240,232,0.12)]'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#84C225]/20 flex items-center justify-center">
                  <Ship className="w-5 h-5 text-[#84C225]" />
                </div>
                <div>
                  <h5 className="font-medium text-[#F5F0E8]">ShipStation</h5>
                  <p className="text-xs text-[#6B6660]">Full integration with label sync</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-[#84C225]/20 text-[#84C225]">
                  Recommended
                </span>
                {selectedProvider === 'shipstation' && isShipStationConnected && (
                  <div className="w-5 h-5 rounded-full bg-[#5CB87A] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[#A8A39B]">
                <Zap className="w-3.5 h-3.5 text-[#84C225]" />
                Automatic label sync
              </div>
              <div className="flex items-center gap-1.5 text-[#A8A39B]">
                <Combine className="w-3.5 h-3.5 text-[#84C225]" />
                Order combining
              </div>
              <div className="flex items-center gap-1.5 text-[#A8A39B]">
                <PackageCheck className="w-3.5 h-3.5 text-[#84C225]" />
                Organized pack mode
              </div>
              <div className="flex items-center gap-1.5 text-[#A8A39B]">
                <Check className="w-3.5 h-3.5 text-[#84C225]" />
                Tracking numbers
              </div>
            </div>
          </button>

          {/* ShipStation Connection Form */}
          {showShipStationForm && selectedProvider === 'shipstation' && !isShipStationConnected && (
            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#84C225]/20 space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-[#F5F0E8]">Connect ShipStation</h5>
                <button
                  onClick={() => {
                    setShowShipStationForm(false)
                    setSelectedProvider(null)
                  }}
                  className="p-1 rounded hover:bg-[rgba(255,255,255,0.05)]"
                >
                  <X className="w-4 h-4 text-[#6B6660]" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-[#A8A39B] mb-1.5">API Key</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your ShipStation API Key"
                    className="w-full px-3 py-2 rounded-lg bg-[#151515] border border-[rgba(245,240,232,0.08)] text-[#F5F0E8] text-sm placeholder-[#6B6660] focus:outline-none focus:border-[#84C225]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#A8A39B] mb-1.5">API Secret</label>
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your ShipStation API Secret"
                    className="w-full px-3 py-2 rounded-lg bg-[#151515] border border-[rgba(245,240,232,0.08)] text-[#F5F0E8] text-sm placeholder-[#6B6660] focus:outline-none focus:border-[#84C225]/50"
                  />
                </div>
              </div>

              {shipStationError && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {shipStationError}
                </div>
              )}

              <a
                href="https://ship.shipstation.com/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#6B6660] hover:text-[#84C225] flex items-center gap-1"
              >
                Find your API keys in ShipStation Settings <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={handleConnectShipStation}
                disabled={isLoading || !apiKey.trim() || !apiSecret.trim()}
                className="w-full py-2.5 rounded-lg bg-[#84C225] hover:bg-[#9AD82E] text-black font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Connect ShipStation
              </button>
            </div>
          )}

          {/* Pirateship */}
          <button
            onClick={() => handleSelectProvider('pirateship')}
            disabled={isLoading}
            className={`w-full p-4 rounded-xl border transition-all text-left ${
              selectedProvider === 'pirateship'
                ? 'bg-[#e07a42]/10 border-[#e07a42]/30'
                : 'bg-[#0D0D0D] border-[rgba(245,240,232,0.06)] hover:border-[rgba(245,240,232,0.12)]'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#e07a42]/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-[#e07a42]" />
                </div>
                <div>
                  <h5 className="font-medium text-[#F5F0E8]">Pirateship</h5>
                  <p className="text-xs text-[#6B6660]">CSV export for easy upload</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-[#e07a42]/20 text-[#e07a42]">
                  Manual Export
                </span>
                {selectedProvider === 'pirateship' && (
                  <div className="w-5 h-5 rounded-full bg-[#5CB87A] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-[#A8A39B]">
              We generate formatted CSVs that you can upload directly to Pirateship. Great rates and easy to use!
            </p>
          </button>

          {/* Shopify Shipping */}
          <button
            onClick={() => handleSelectProvider('shopify_shipping')}
            disabled={isLoading}
            className={`w-full p-4 rounded-xl border transition-all text-left ${
              selectedProvider === 'shopify_shipping'
                ? 'bg-[#EF4444]/10 border-[#EF4444]/30'
                : 'bg-[#0D0D0D] border-[rgba(245,240,232,0.06)] hover:border-[rgba(245,240,232,0.12)]'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#95BF47]/20 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#95BF47">
                    <path d="M15.337 3.415c-.193-.15-.476-.197-.753-.163-.277.03-.55.1-.8.183a7.478 7.478 0 00-.707.26c-.097-.603-.27-1.126-.524-1.546-.535-.893-1.308-1.364-2.236-1.36-1.02.004-1.948.539-2.762 1.6-.577.747-1.024 1.69-1.16 2.42-.84.26-1.427.44-1.44.446-.425.13-.438.145-.494.55-.04.31-1.04 8.01-1.04 8.01L12.29 15l4.71-1.15s-1.16-8.787-1.226-9.223c-.067-.436-.067-.5-.067-.5l-.37-.712z"/>
                  </svg>
                </div>
                <div>
                  <h5 className="font-medium text-[#F5F0E8]">Shopify Shipping</h5>
                  <p className="text-xs text-[#6B6660]">Use Shopify&apos;s built-in shipping</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-[#EF4444]/20 text-[#EF4444]">
                  Not Recommended
                </span>
                {selectedProvider === 'shopify_shipping' && (
                  <div className="w-5 h-5 rounded-full bg-[#5CB87A] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/10">
              <AlertTriangle className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#A8A39B]">
                We can&apos;t help combine orders or organize labels with Shopify Shipping, which may affect your pack mode workflow.
              </p>
            </div>
          </button>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Skip option */}
          {!effectiveProvider && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setIsSkipped(true)}
                className="text-sm text-[#6B6660] hover:text-[#A8A39B] transition-colors"
              >
                Skip for now - set up later in Settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shopify Warning Modal */}
      {showShopifyWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-2xl border border-[rgba(255,255,255,0.1)] p-6 w-full max-w-md mx-4 shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={() => setShowShopifyWarning(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-[#6B6660] hover:text-[#F5F0E8] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#EF4444]/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#F5F0E8]">Are you sure?</h3>
                <p className="text-sm text-[#6B6660]">Shopify Shipping has limitations</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/10">
                <X className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#A8A39B]">Cannot combine multiple orders into one shipment</p>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/10">
                <X className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#A8A39B]">Labels won&apos;t be organized for pack mode workflow</p>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/10">
                <X className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#A8A39B]">No automatic tracking sync to SubscriberSync</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowShopifyWarning(false)}
                className="w-full py-3 rounded-xl bg-[#84C225] hover:bg-[#9AD82E] text-black font-medium transition-colors"
              >
                Choose ShipStation Instead
              </button>
              <button
                onClick={handleConfirmShopify}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#A8A39B] font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Continue with Shopify Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
