'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Zap, Loader2, ExternalLink, AlertCircle } from 'lucide-react'
import { ClientOnboardingData } from '@/lib/intake-types'
import ShippingProviderSection from './ShippingProviderSection'

interface Integration {
  type: 'shopify' | 'klaviyo' | 'recharge' | 'shipstation'
  connected: boolean
  lastSync?: string
}

type ShippingProvider = 'shipstation' | 'pirateship' | 'shopify_shipping' | null

interface IntakeStep1ConnectProps {
  clientSlug: string
  integrations: Integration[]
  onboardingData: ClientOnboardingData
  installmentName?: string
  shippingProvider?: ShippingProvider
  onRefresh: () => void
}

export default function IntakeStep1Connect({
  clientSlug,
  integrations,
  onboardingData,
  installmentName: initialInstallmentName,
  shippingProvider,
  onRefresh
}: IntakeStep1ConnectProps) {
  const [isExpanded, setIsExpanded] = useState(!onboardingData.step1Complete)
  const [isConnectingShopify, setIsConnectingShopify] = useState(false)
  const [isConnectingKlaviyo, setIsConnectingKlaviyo] = useState(false)
  const [isConnectingRecharge, setIsConnectingRecharge] = useState(false)
  const [shopifyStore, setShopifyStore] = useState('')
  const [showShopifyInput, setShowShopifyInput] = useState(false)
  const [rechargeApiKey, setRechargeApiKey] = useState('')
  const [showRechargeInput, setShowRechargeInput] = useState(false)
  const [rechargeError, setRechargeError] = useState('')
  const [installmentName, setInstallmentName] = useState(initialInstallmentName || '')
  const [isSavingInstallment, setIsSavingInstallment] = useState(false)
  const [installmentSaved, setInstallmentSaved] = useState(!!initialInstallmentName)

  const shopifyIntegration = integrations.find(i => i.type === 'shopify')
  const klaviyoIntegration = integrations.find(i => i.type === 'klaviyo')
  const rechargeIntegration = integrations.find(i => i.type === 'recharge')
  const shipstationIntegration = integrations.find(i => i.type === 'shipstation')
  
  const isShipStationConnected = shipstationIntegration?.connected || false

  const isShopifyConnected = shopifyIntegration?.connected || false
  const isKlaviyoConnected = klaviyoIntegration?.connected || false
  const isRechargeConnected = rechargeIntegration?.connected || false

  // Calculate progress - All 4 integrations required
  const steps = [
    { name: 'Shopify', done: isShopifyConnected },
    { name: 'Recharge', done: isRechargeConnected },
    { name: 'Klaviyo', done: isKlaviyoConnected },
    { name: 'Installment Name', done: installmentSaved },
  ]
  const completedCount = steps.filter(s => s.done).length
  const allComplete = completedCount === steps.length
  const progressPercent = (completedCount / steps.length) * 100

  // Connect Recharge
  const handleConnectRecharge = async () => {
    if (!rechargeApiKey.trim()) {
      setShowRechargeInput(true)
      return
    }

    setIsConnectingRecharge(true)
    setRechargeError('')
    try {
      const response = await fetch('/api/integrations/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: rechargeApiKey.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowRechargeInput(false)
        setRechargeApiKey('')
        onRefresh()
      } else {
        setRechargeError(data.error || 'Failed to connect')
      }
    } catch (error) {
      console.error('Error connecting Recharge:', error)
      setRechargeError('Connection failed')
    }
    setIsConnectingRecharge(false)
  }

  // Connect Shopify (optional, for additional data)
  const handleConnectShopify = async () => {
    if (!shopifyStore.trim()) {
      setShowShopifyInput(true)
      return
    }

    setIsConnectingShopify(true)
    try {
      const response = await fetch('/api/auth/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: shopifyStore.trim() }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Failed to get Shopify auth URL')
        setIsConnectingShopify(false)
      }
    } catch (error) {
      console.error('Error connecting Shopify:', error)
      setIsConnectingShopify(false)
    }
  }

  // Connect Klaviyo
  const handleConnectKlaviyo = async () => {
    setIsConnectingKlaviyo(true)
    try {
      const response = await fetch('/api/auth/klaviyo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Failed to get Klaviyo auth URL')
        setIsConnectingKlaviyo(false)
      }
    } catch (error) {
      console.error('Error connecting Klaviyo:', error)
      setIsConnectingKlaviyo(false)
    }
  }

  // Save installment name
  const handleSaveInstallmentName = async () => {
    if (!installmentName.trim()) return

    setIsSavingInstallment(true)
    try {
      const response = await fetch(`/api/intake/${clientSlug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: 'Installment Name',
          value: installmentName.trim(),
        }),
      })

      if (response.ok) {
        setInstallmentSaved(true)
        onRefresh()
      }
    } catch (error) {
      console.error('Error saving installment name:', error)
    }
    setIsSavingInstallment(false)
  }

  // Completed state
  if (allComplete && !isExpanded) {
    return (
      <div className="relative rounded-2xl bg-[#5CB87A]/5 border border-[#5CB87A]/15 overflow-hidden">
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#5CB87A]/30 to-transparent" />

        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-5 flex items-center justify-between hover:bg-[#5CB87A]/10 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#5CB87A]/15 border border-[#5CB87A]/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-[#5CB87A]" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-[#F5F0E8]">Step 1: Connect Your Apps</h3>
              <p className="text-sm text-[#5CB87A]">All integrations connected</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-[#6B6660]" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)] overflow-hidden">
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#C9A962]/25 to-transparent" />

      {/* Header */}
      <div
        className={`p-5 border-b border-[rgba(245,240,232,0.06)] ${allComplete ? 'cursor-pointer hover:bg-[#1A1A1A]' : ''}`}
        onClick={allComplete ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
              allComplete
                ? 'bg-[#5CB87A]/10 border-[#5CB87A]/20'
                : 'bg-[#C9A962]/10 border-[#C9A962]/20'
            }`}>
              {allComplete ? (
                <Check className="w-5 h-5 text-[#5CB87A]" />
              ) : (
                <Zap className="w-5 h-5 text-[#C9A962]" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-[#F5F0E8]">Step 1: Connect Your Apps</h3>
              <p className="text-sm text-[#6B6660]">
                {allComplete
                  ? 'All integrations connected'
                  : `${completedCount} of ${steps.length} connected`
                }
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    step.done ? 'bg-[#5CB87A]' : 'bg-[#4A4743]'
                  }`}
                  title={`${step.name}: ${step.done ? 'Connected' : 'Not connected'}`}
                />
              ))}
            </div>
            {allComplete && (
              isExpanded ? (
                <ChevronUp className="w-5 h-5 text-[#6B6660]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#6B6660]" />
              )
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!allComplete && (
          <div className="mt-4 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#A8893F] to-[#C9A962] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-5 space-y-4">
          {/* Shopify Connection */}
          <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[rgba(245,240,232,0.04)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#95BF47]/10 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#95BF47">
                    <path d="M15.337 3.415c-.193-.15-.476-.197-.753-.163-.277.03-.55.1-.8.183a7.478 7.478 0 00-.707.26c-.097-.603-.27-1.126-.524-1.546-.535-.893-1.308-1.364-2.236-1.36-1.02.004-1.948.539-2.762 1.6-.577.747-1.024 1.69-1.16 2.42-.84.26-1.427.44-1.44.446-.425.13-.438.145-.494.55-.04.31-1.04 8.01-1.04 8.01L12.29 15l4.71-1.15s-1.16-8.787-1.226-9.223c-.067-.436-.067-.5-.067-.5l-.37-.712z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-[#F5F0E8]">Shopify</h4>
                  <p className="text-sm text-[#6B6660]">
                    {isShopifyConnected ? 'Connected - Syncing orders' : 'Connect your Shopify store'}
                  </p>
                </div>
              </div>

              {isShopifyConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5CB87A]/10 border border-[#5CB87A]/20">
                  <Check className="w-4 h-4 text-[#5CB87A]" />
                  <span className="text-sm text-[#5CB87A] font-medium">Connected</span>
                </div>
              ) : showShopifyInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="your-store.myshopify.com"
                    value={shopifyStore}
                    onChange={(e) => setShopifyStore(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#0D0D0D] border border-[rgba(245,240,232,0.08)] text-[#F5F0E8] text-sm placeholder-[#6B6660] focus:outline-none focus:border-[#95BF47]/50 w-56"
                    onKeyDown={(e) => e.key === 'Enter' && handleConnectShopify()}
                  />
                  <button
                    onClick={handleConnectShopify}
                    disabled={isConnectingShopify || !shopifyStore.trim()}
                    className="px-4 py-2 rounded-lg bg-[#95BF47] hover:bg-[#7ea33d] text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isConnectingShopify ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    Connect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowShopifyInput(true)}
                  className="px-4 py-2 rounded-lg bg-[#95BF47] hover:bg-[#7ea33d] text-white font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Connect Shopify
                </button>
              )}
            </div>
          </div>

          {/* Recharge Connection */}
          <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[rgba(245,240,232,0.04)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#5C6BC0]/10 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5C6BC0">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-[#F5F0E8]">Recharge</h4>
                  <p className="text-sm text-[#6B6660]">
                    {isRechargeConnected ? 'Connected - Syncing subscriptions' : 'Connect your subscription platform'}
                  </p>
                </div>
              </div>

              {isRechargeConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5CB87A]/10 border border-[#5CB87A]/20">
                  <Check className="w-4 h-4 text-[#5CB87A]" />
                  <span className="text-sm text-[#5CB87A] font-medium">Connected</span>
                </div>
              ) : showRechargeInput ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="Recharge API Key"
                      value={rechargeApiKey}
                      onChange={(e) => setRechargeApiKey(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-[#0D0D0D] border border-[rgba(245,240,232,0.08)] text-[#F5F0E8] text-sm placeholder-[#6B6660] focus:outline-none focus:border-[#5C6BC0]/50 w-56"
                      onKeyDown={(e) => e.key === 'Enter' && handleConnectRecharge()}
                    />
                    <button
                      onClick={handleConnectRecharge}
                      disabled={isConnectingRecharge || !rechargeApiKey.trim()}
                      className="px-4 py-2 rounded-lg bg-[#5C6BC0] hover:bg-[#4a5ab0] text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isConnectingRecharge ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Connect'
                      )}
                    </button>
                  </div>
                  {rechargeError && (
                    <p className="text-xs text-red-400">{rechargeError}</p>
                  )}
                  <a
                    href="https://support.rechargepayments.com/hc/en-us/articles/360008683274-Creating-an-API-Token"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#6B6660] hover:text-[#C9A962] flex items-center gap-1"
                  >
                    How to get your API key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => setShowRechargeInput(true)}
                  className="px-4 py-2 rounded-lg bg-[#5C6BC0] hover:bg-[#4a5ab0] text-white font-medium text-sm transition-colors flex items-center gap-2"
                >
                  Connect Recharge
                </button>
              )}
            </div>
          </div>

          {/* Klaviyo Connection */}
          <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[rgba(245,240,232,0.04)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#2D2D2D] flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ffffff">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-[#F5F0E8]">Klaviyo</h4>
                  <p className="text-sm text-[#6B6660]">
                    {isKlaviyoConnected ? 'Connected' : 'Connect your Klaviyo account'}
                  </p>
                </div>
              </div>

              {isKlaviyoConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5CB87A]/10 border border-[#5CB87A]/20">
                  <Check className="w-4 h-4 text-[#5CB87A]" />
                  <span className="text-sm text-[#5CB87A] font-medium">Connected</span>
                </div>
              ) : (
                <button
                  onClick={handleConnectKlaviyo}
                  disabled={isConnectingKlaviyo}
                  className="px-4 py-2 rounded-lg bg-[#0D0D0D] border border-[rgba(245,240,232,0.15)] hover:border-[rgba(245,240,232,0.25)] text-[#F5F0E8] font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isConnectingKlaviyo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Connect Klaviyo
                </button>
              )}
            </div>
          </div>

          {/* Installment Name */}
          <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[rgba(245,240,232,0.04)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#e07a42]/10 flex items-center justify-center">
                  <span className="text-lg">📦</span>
                </div>
                <div>
                  <h4 className="font-medium text-[#F5F0E8]">Installment Name</h4>
                  <p className="text-sm text-[#6B6660]">
                    What do you call each subscription box?
                  </p>
                </div>
              </div>

              {installmentSaved ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5CB87A]/10 border border-[#5CB87A]/20">
                  <Check className="w-4 h-4 text-[#5CB87A]" />
                  <span className="text-sm text-[#5CB87A] font-medium">{installmentName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder='e.g., "Box", "Drop", "Episode"'
                    value={installmentName}
                    onChange={(e) => setInstallmentName(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#0D0D0D] border border-[rgba(245,240,232,0.08)] text-[#F5F0E8] text-sm placeholder-[#6B6660] focus:outline-none focus:border-[#e07a42]/50 w-48"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveInstallmentName()}
                  />
                  <button
                    onClick={handleSaveInstallmentName}
                    disabled={isSavingInstallment || !installmentName.trim()}
                    className="px-4 py-2 rounded-lg bg-[#e07a42] hover:bg-[#c56a35] text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingInstallment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Help text */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[#0D0D0D] border border-[rgba(245,240,232,0.04)]">
            <AlertCircle className="w-4 h-4 text-[#6B6660] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#6B6660]">
              Connecting your apps allows us to sync your subscriber data automatically.
              Your credentials are encrypted and stored securely.
            </p>
          </div>

          {/* Shipping Provider Section - Optional */}
          <ShippingProviderSection
            clientSlug={clientSlug}
            currentProvider={shippingProvider || null}
            isShipStationConnected={isShipStationConnected}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  )
}
